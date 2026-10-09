import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';
import { createPixPayment } from '@/lib/mercadopago';
import { OrderItem, SelectedOption } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer_name,
      customer_phone,
      order_type,
      neighborhood_id,
      address_street,
      address_number,
      address_complement,
      address_reference,
      order_notes,
      payment_method,
      items,
      coupon_code,
    } = body;

    // 1. Validações básicas de cliente
    if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length < 2) {
      return NextResponse.json({ success: false, message: 'Nome do cliente é obrigatório.' }, { status: 400 });
    }

    const cleanPhone = (customer_phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json({ success: false, message: 'Telefone ou WhatsApp válido é obrigatório.' }, { status: 400 });
    }

    if (order_type !== 'delivery' && order_type !== 'pickup') {
      return NextResponse.json({ success: false, message: 'Modalidade de entrega inválida.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'O carrinho está vazio.' }, { status: 400 });
    }

    // 2. Validação se a loja está aberta
    const storeStatus = await repository.getStoreStatus();
    if (!storeStatus.isOpen) {
      return NextResponse.json(
        {
          success: false,
          message: `A loja está fechada para novos pedidos no momento. ${storeStatus.message}`,
        },
        { status: 400 }
      );
    }

    // 3. Recalcular e validar itens contra o banco de dados
    const allProducts = await repository.getProducts();
    const allOptionGroups = await repository.getOptionGroups();
    const optionMap = new Map();
    allOptionGroups.forEach((g) => {
      g.options?.forEach((opt) => {
        optionMap.set(opt.id, { ...opt, group_name: g.name });
      });
    });

    let calculatedSubtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const rawItem of items) {
      const dbProduct = allProducts.find((p) => p.id === rawItem.product_id);
      if (!dbProduct) {
        return NextResponse.json(
          { success: false, message: `Produto "${rawItem.product_name || 'desconhecido'}" não foi encontrado.` },
          { status: 400 }
        );
      }

      if (!dbProduct.is_available) {
        return NextResponse.json(
          { success: false, message: `O produto "${dbProduct.name}" está indisponível no momento.` },
          { status: 400 }
        );
      }

      // Preço unitário base oficial do banco (considera preço promocional se ativo)
      const baseUnitPrice = dbProduct.is_promo_active && dbProduct.promotional_price
        ? Number(dbProduct.promotional_price)
        : Number(dbProduct.price);

      // Validar e calcular adicionais/opções selecionadas
      let optionsTotalPerItem = 0;
      const validatedSelectedOptions: SelectedOption[] = [];

      if (rawItem.selected_options && Array.isArray(rawItem.selected_options)) {
        for (const optReq of rawItem.selected_options) {
          const dbOpt = optionMap.get(optReq.option_id);
          if (!dbOpt) {
            return NextResponse.json(
              { success: false, message: `Opção de complemento inválida selecionada.` },
              { status: 400 }
            );
          }

          if (!dbOpt.is_available) {
            return NextResponse.json(
              { success: false, message: `O adicional "${dbOpt.name}" está temporariamente indisponível.` },
              { status: 400 }
            );
          }

          const optQty = Number(optReq.quantity || 1);
          const optPrice = Number(dbOpt.price || 0);
          optionsTotalPerItem += optPrice * optQty;

          validatedSelectedOptions.push({
            option_id: dbOpt.id,
            group_id: dbOpt.group_id,
            group_name: dbOpt.group_name || 'Opção',
            option_name: dbOpt.name,
            price: optPrice,
            quantity: optQty,
          });
        }
      }

      const itemQty = Math.max(1, parseInt(rawItem.quantity || 1, 10));
      const itemUnitPrice = Number((baseUnitPrice + optionsTotalPerItem).toFixed(2));
      const itemTotalPrice = Number((itemUnitPrice * itemQty).toFixed(2));
      calculatedSubtotal += itemTotalPrice;

      orderItems.push({
        id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        order_id: '',
        product_id: dbProduct.id,
        product_name: dbProduct.name,
        unit_price: itemUnitPrice,
        quantity: itemQty,
        total_price: itemTotalPrice,
        selected_options: validatedSelectedOptions,
        item_notes: rawItem.notes || null,
        created_at: new Date().toISOString(),
      });
    }

    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));

    // 4. Validação de Bairro e Taxa de Entrega
    let calculatedDeliveryFee = 0;
    let selectedNeighborhoodName = null;

    if (order_type === 'delivery') {
      if (!neighborhood_id) {
        return NextResponse.json({ success: false, message: 'Selecione o bairro para entrega.' }, { status: 400 });
      }

      const neighborhoods = await repository.getNeighborhoods();
      const dbNeighborhood = neighborhoods.find((n) => n.id === neighborhood_id);

      if (!dbNeighborhood || !dbNeighborhood.is_active) {
        return NextResponse.json(
          { success: false, message: 'Bairro de entrega indisponível ou desativado.' },
          { status: 400 }
        );
      }

      selectedNeighborhoodName = dbNeighborhood.name;

      // Validação de pedido mínimo para o bairro
      if (dbNeighborhood.min_order_amount && calculatedSubtotal < dbNeighborhood.min_order_amount) {
        return NextResponse.json(
          {
            success: false,
            message: `O pedido mínimo para entrega em ${dbNeighborhood.name} é de R$ ${dbNeighborhood.min_order_amount.toFixed(2)}.`,
          },
          { status: 400 }
        );
      }

      // Validação de entrega grátis
      if (dbNeighborhood.free_delivery_threshold && calculatedSubtotal >= dbNeighborhood.free_delivery_threshold) {
        calculatedDeliveryFee = 0;
      } else {
        calculatedDeliveryFee = Number(dbNeighborhood.delivery_fee || 0);
      }
    }

    // 5. Validação de Cupom de Desconto
    let calculatedDiscount = 0;
    let validCouponCode = null;

    if (coupon_code) {
      const coupon = await repository.getCouponByCode(coupon_code);
      if (coupon && coupon.is_active) {
        const meetsMin = !coupon.min_order_amount || calculatedSubtotal >= coupon.min_order_amount;
        const withinUses = !coupon.max_uses || coupon.used_count < coupon.max_uses;

        if (meetsMin && withinUses) {
          validCouponCode = coupon.code;
          if (coupon.discount_type === 'percentage') {
            calculatedDiscount = Number(((calculatedSubtotal * coupon.discount_value) / 100).toFixed(2));
          } else {
            calculatedDiscount = Math.min(Number(coupon.discount_value), calculatedSubtotal);
          }
        }
      }
    }

    const calculatedTotal = Number(
      Math.max(0, calculatedSubtotal - calculatedDiscount + calculatedDeliveryFee).toFixed(2)
    );

    // 6. Preparar pedido para salvar
    const createdOrder = await repository.createOrder({
      customer_name: customer_name.trim(),
      customer_phone: cleanPhone,
      order_type,
      neighborhood_id: order_type === 'delivery' ? neighborhood_id : null,
      neighborhood_name: selectedNeighborhoodName,
      address_street: order_type === 'delivery' ? address_street : null,
      address_number: order_type === 'delivery' ? address_number : null,
      address_complement: order_type === 'delivery' ? address_complement : null,
      address_reference: order_type === 'delivery' ? address_reference : null,
      order_notes: order_notes || null,
      payment_method,
      payment_status: 'pending',
      order_status: 'received',
      subtotal: calculatedSubtotal,
      discount_amount: calculatedDiscount,
      delivery_fee: calculatedDeliveryFee,
      total_amount: calculatedTotal,
      coupon_code: validCouponCode,
      items: orderItems,
    });

    // 7. Se for pagamento via Pix Online, gerar cobrança no Mercado Pago
    if (payment_method === 'pix') {
      const pixResult = await createPixPayment({
        orderId: createdOrder.id,
        orderCode: createdOrder.order_code,
        amount: createdOrder.total_amount,
        description: `Pedido ${createdOrder.order_code} - Açaí Daiane`,
        customerName: createdOrder.customer_name,
        customerPhone: createdOrder.customer_phone,
      });

      if (!pixResult.success) {
        console.error('Falha ao gerar cobrança Pix:', pixResult.errorMessage);
        await repository.updatePaymentStatus(createdOrder.id, 'failed');
        return NextResponse.json(
          {
            success: false,
            message: pixResult.errorMessage || 'Não foi possível gerar a cobrança Pix no momento. Verifique as credenciais ou selecione outra forma de pagamento.',
          },
          { status: 400 }
        );
      }

      await repository.updatePaymentStatus(createdOrder.id, 'pending', {
        transaction_id: pixResult.paymentId,
        pix_copia_e_cola: pixResult.qrCode,
        qr_code_base64: pixResult.qrCodeBase64,
        payment_link: pixResult.ticketUrl,
      });
      createdOrder.payment_details = {
        transaction_id: pixResult.paymentId,
        pix_copia_e_cola: pixResult.qrCode,
        qr_code_base64: pixResult.qrCodeBase64,
        payment_link: pixResult.ticketUrl,
      };
    }

    return NextResponse.json({
      success: true,
      order: createdOrder,
    });
  } catch (error: any) {
    console.error('Erro na criação de pedido:', error);
    return NextResponse.json({ success: false, message: 'Erro interno ao processar pedido.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const orders = await repository.getOrders();
    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error: any) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao listar pedidos.' }, { status: 500 });
  }
}

