import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';
import { createPixPayment } from '@/lib/mercadopago';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { OrderItem, SelectedOption, Product, OptionGroup } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    // IMPORTANTE: Quando Supabase estiver configurado, os preços DEVEM vir do banco de dados.
    // Nunca usamos dados mockados para validação de preços em pedidos reais.
    let allProducts: Product[] = [];
    let allOptionGroups: OptionGroup[] = [];
    const optionMap = new Map<string, any>();

    if (isSupabaseAdminConfigured()) {
      const supabase = createSupabaseAdminClient()!;
      const [prodRes, grpRes, optsRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_available', true),
        supabase.from('option_groups').select('*, options(*)'),
        supabase.from('options').select('*'),
      ]);

      if (prodRes.error) {
        console.error('Erro ao buscar produtos do Supabase para validação de pedido:', prodRes.error);
        return NextResponse.json(
          { success: false, message: 'Erro interno ao validar itens do pedido. Tente novamente.' },
          { status: 500 }
        );
      }

      allProducts = prodRes.data || [];
      allOptionGroups = grpRes.data || [];

      // Mapear opções diretas da tabela options
      if (optsRes.data && Array.isArray(optsRes.data)) {
        optsRes.data.forEach((opt: any) => {
          optionMap.set(opt.id, opt);
        });
      }

      // Mapear opções aninhadas nos grupos
      allOptionGroups.forEach((g) => {
        (g as any).options?.forEach((opt: any) => {
          optionMap.set(opt.id, { ...opt, group_name: g.name });
        });
      });
    }

    // Se o banco estiver vazio ou sem produtos/grupos, carregar do repository como fallback
    if (allProducts.length === 0) {
      allProducts = await repository.getProducts();
    }
    const mockGroups = await repository.getOptionGroups();
    mockGroups.forEach((g) => {
      (g as any).options?.forEach((opt: any) => {
        if (!optionMap.has(opt.id)) {
          optionMap.set(opt.id, { ...opt, group_name: g.name });
        }
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
      let baseUnitPrice = dbProduct.is_promo_active && dbProduct.promotional_price
        ? Number(dbProduct.promotional_price)
        : Number(dbProduct.price);

      // Se o cliente escolheu um tamanho e o produto possui tamanhos cadastrados
      const sizeOptReq = (rawItem.selected_options || []).find(
        (o: any) =>
          o.group_name === 'TAMANHO' ||
          o.group_id === 'size-group' ||
          String(o.option_id).startsWith('size-')
      );

      if (sizeOptReq && Array.isArray(dbProduct.sizes) && dbProduct.sizes.length > 0) {
        const matchedSize = dbProduct.sizes.find(
          (s) => s.label === sizeOptReq.option_name || `size-${s.label}` === sizeOptReq.option_id
        );
        if (matchedSize) {
          const hasSizePromo = Boolean(
            dbProduct.promo_applies_to_sizes && dbProduct.is_promo_active && dbProduct.promo_percent
          );
          if (hasSizePromo && matchedSize.promo_price != null && Number(matchedSize.promo_price) > 0) {
            baseUnitPrice = Number(matchedSize.promo_price);
          } else if (hasSizePromo && dbProduct.promo_percent) {
            baseUnitPrice = Number(
              (Number(matchedSize.price) * (1 - Number(dbProduct.promo_percent) / 100)).toFixed(2)
            );
          } else {
            baseUnitPrice = Number(matchedSize.price);
          }
        }
      }

      // Validar e calcular adicionais/opções selecionadas
      let optionsTotalPerItem = 0;
      const validatedSelectedOptions: SelectedOption[] = [];

      if (rawItem.selected_options && Array.isArray(rawItem.selected_options)) {
        for (const optReq of rawItem.selected_options) {
          // Opção de tamanho é tratada separadamente no baseUnitPrice
          const isSize =
            optReq.group_name === 'TAMANHO' ||
            optReq.group_id === 'size-group' ||
            String(optReq.option_id).startsWith('size-');

          if (isSize) {
            validatedSelectedOptions.push({
              option_id: optReq.option_id,
              group_id: 'size-group',
              group_name: 'TAMANHO',
              option_name: optReq.option_name,
              price: 0,
              quantity: 1,
            });
            continue;
          }

          let dbOpt = optionMap.get(optReq.option_id);
          // Fallback por nome se o ID não bater
          if (!dbOpt && optReq.option_name) {
            for (const item of optionMap.values()) {
              if (item.name?.trim().toLowerCase() === optReq.option_name?.trim().toLowerCase()) {
                dbOpt = item;
                break;
              }
            }
          }

          if (!dbOpt) {
            return NextResponse.json(
              { success: false, message: `Opção de complemento "${optReq.option_name || optReq.option_id}" não encontrada.` },
              { status: 400 }
            );
          }

          if (dbOpt.is_available === false) {
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
            group_id: dbOpt.group_id || 'opcao',
            group_name: dbOpt.group_name || 'Opção',
            option_name: dbOpt.name,
            price: optPrice,
            quantity: optQty,
          });
        }
      }

      // C12: Valida quantidade positiva e limite máximo razoável
      const itemQtyRaw = parseInt(rawItem.quantity || 1, 10);
      if (isNaN(itemQtyRaw) || itemQtyRaw < 1) {
        return NextResponse.json(
          { success: false, message: `Quantidade inválida para o produto "${dbProduct.name}".` },
          { status: 400 }
        );
      }
      const itemQty = Math.min(itemQtyRaw, 50); // máximo 50 unidades por item
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

    // 5. Validação de Cupom de Desconto (C10: inclui validação de datas)
    let calculatedDiscount = 0;
    let validCouponCode = null;

    if (coupon_code) {
      const coupon = await repository.getCouponByCode(coupon_code);
      if (coupon && coupon.is_active) {
        const now = new Date();
        // C10: Verifica período de validade do cupom
        const afterStart = !coupon.start_date || new Date(coupon.start_date) <= now;
        const beforeEnd = !coupon.end_date || new Date(coupon.end_date) >= now;
        const meetsMin = !coupon.min_order_amount || calculatedSubtotal >= coupon.min_order_amount;
        const withinUses = !coupon.max_uses || (coupon.used_count || 0) < coupon.max_uses;

        if (!afterStart || !beforeEnd) {
          return NextResponse.json(
            { success: false, message: `O cupom "${coupon.code}" está fora do período de validade.` },
            { status: 400 }
          );
        }
        if (!withinUses) {
          return NextResponse.json(
            { success: false, message: `O cupom "${coupon.code}" atingiu o limite máximo de usos.` },
            { status: 400 }
          );
        }
        if (!meetsMin) {
          return NextResponse.json(
            {
              success: false,
              message: `O cupom "${coupon.code}" exige pedido mínimo de R$ ${Number(coupon.min_order_amount).toFixed(2)}.`,
            },
            { status: 400 }
          );
        }

        validCouponCode = coupon.code;
        if (coupon.discount_type === 'percentage') {
          // Garante desconto não negativo e não superior ao subtotal
          const pct = Math.max(0, Math.min(100, Number(coupon.discount_value)));
          calculatedDiscount = Number(((calculatedSubtotal * pct) / 100).toFixed(2));
        } else {
          calculatedDiscount = Math.min(Math.max(0, Number(coupon.discount_value)), calculatedSubtotal);
        }
      } else if (coupon_code) {
        return NextResponse.json(
          { success: false, message: 'Cupom inválido ou inativo.' },
          { status: 400 }
        );
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
    // C9: Se o Pix falhar, EXCLUÍMOS o pedido para evitar estados inconsistentes.
    // O cliente pode tentar novamente — a idempotência do MP impede cobranças duplicadas.
    if (payment_method === 'pix') {
      try {
        const pixResult = await createPixPayment({
          orderId: createdOrder.id,
          orderCode: createdOrder.order_code,
          amount: createdOrder.total_amount,
          description: `Pedido ${createdOrder.order_code} - Acai Daiane`,
          customerName: createdOrder.customer_name,
          customerPhone: createdOrder.customer_phone,
        });

        if (!pixResult.success) {
          // Remove o pedido rascunho para permitir nova tentativa sem duplicata
          try {
            await repository.deleteOrder(createdOrder.id);
          } catch (delErr) {
            console.error('Falha ao remover pedido apos erro Pix:', delErr);
          }
          return NextResponse.json(
            {
              success: false,
              message: pixResult.errorMessage || 'Não foi possível gerar a cobrança Pix. Tente novamente ou escolha outra forma de pagamento.',
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
      } catch (pixErr: any) {
        console.error('Exceção ou timeout ao gerar Pix no gateway:', pixErr?.message || pixErr);
        try {
          await repository.deleteOrder(createdOrder.id);
        } catch (delErr) {
          console.error('Falha ao remover pedido após timeout Pix:', delErr);
        }
        return NextResponse.json(
          {
            success: false,
            message: 'O serviço de pagamentos demorou a responder. Por favor, tente novamente.',
          },
          { status: 504 }
        );
      }
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

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('acai_admin_session')?.value;
    const { isValidSessionToken } = await import('@/lib/auth/admin-auth');
    if (!isValidSessionToken(sessionCookie)) {
      return NextResponse.json(
        { success: false, message: 'Acesso restrito aos administradores.' },
        { status: 401 }
      );
    }

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

