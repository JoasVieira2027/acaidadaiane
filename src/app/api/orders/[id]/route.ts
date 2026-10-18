import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';
import { getPaymentStatus } from '@/lib/mercadopago';
import { requireAdmin } from '@/lib/auth/require-admin';
import { isValidSessionToken, ADMIN_COOKIE_NAME } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

function sanitizeOrderForPublic(order: any) {
  return {
    id: order.id,
    order_code: order.order_code,
    order_status: order.order_status,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    payment_details: order.payment_details
      ? {
          pix_copia_e_cola: order.payment_details.pix_copia_e_cola,
          qr_code_base64: order.payment_details.qr_code_base64,
          payment_link: order.payment_details.payment_link,
        }
      : null,
    order_type: order.order_type,
    subtotal: order.subtotal,
    discount_amount: order.discount_amount,
    delivery_fee: order.delivery_fee,
    total_amount: order.total_amount,
    coupon_code: order.coupon_code,
    items: (order.items || []).map((it: any) => ({
      product_name: it.product_name,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total_price: it.total_price,
      selected_options: it.selected_options,
      item_notes: it.item_notes,
    })),
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const isAdmin = isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);

    let order = await repository.getOrderByCode(id);
    if (!order) order = await repository.getOrderById(id);

    if (!order) {
      return NextResponse.json({ success: false, message: 'Pedido nao encontrado.' }, { status: 404 });
    }

    const txId = order.payment_details?.transaction_id;
    if (order.payment_method === 'pix' && order.payment_status === 'pending' && txId && !String(txId).startsWith('SIM-PIX-')) {
      const paymentInfo = await getPaymentStatus(String(txId));
      if (paymentInfo && paymentInfo.status === 'approved') {
        await repository.updatePaymentStatus(order.id, 'paid', {
          status_detail: paymentInfo.statusDetail,
          date_approved: paymentInfo.dateApproved,
        });
        await repository.updateOrderStatus(order.id, 'preparing');
        order = await repository.getOrderById(order.id) || order;
      }
    }

    const responseOrder = isAdmin ? order : sanitizeOrderForPublic(order);
    return NextResponse.json({ success: true, order: responseOrder }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('Erro ao buscar pedido:', error);
    return NextResponse.json({ success: false, message: 'Erro no servidor' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const { order_status, payment_status } = body;

    let order = await repository.getOrderById(id);
    if (!order) order = await repository.getOrderByCode(id);
    if (!order) return NextResponse.json({ success: false, message: 'Pedido nao encontrado.' }, { status: 404 });

    if (order_status) {
      const validStatuses = ['received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
      if (!validStatuses.includes(order_status)) {
        return NextResponse.json({ success: false, message: 'Status do pedido invalido.' }, { status: 400 });
      }
      await repository.updateOrderStatus(order.id, order_status);
      order.order_status = order_status;

      if (order_status === 'cancelled') {
        if (order.payment_method === 'pix' && order.payment_status === 'pending') {
          await repository.updatePaymentStatus(order.id, 'cancelled');
          order.payment_status = 'cancelled';
          const txId = order.payment_details?.transaction_id;
          if (txId) {
            const { cancelPayment } = await import('@/lib/mercadopago');
            await cancelPayment(txId).catch((e) => console.warn('Erro ao cancelar Pix no MP:', e));
          }
        }
      }

      try {
        const { sendOrderStatusPush } = await import('@/lib/push');
        await sendOrderStatusPush(order.order_code, order_status);
      } catch (pushErr) {
        console.warn('Push send falhou (nao critico):', pushErr);
      }
    }

    if (payment_status) {
      const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded', 'cancelled'];
      if (!validPaymentStatuses.includes(payment_status)) {
        return NextResponse.json({ success: false, message: 'Status de pagamento invalido.' }, { status: 400 });
      }
      await repository.updatePaymentStatus(order.id, payment_status);
      order.payment_status = payment_status;

      if (payment_status === 'cancelled' && order.payment_method === 'pix') {
        const txId = order.payment_details?.transaction_id;
        if (txId) {
          const { cancelPayment } = await import('@/lib/mercadopago');
          await cancelPayment(txId).catch((e) => console.warn('Erro ao cancelar Pix no MP:', e));
        }
      }
    }

    return NextResponse.json({ success: true, order }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('Erro ao atualizar pedido:', error);
    return NextResponse.json({ success: false, message: 'Erro no servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    let order = await repository.getOrderById(id);
    if (!order) order = await repository.getOrderByCode(id);
    if (!order) return NextResponse.json({ success: false, message: 'Pedido nao encontrado.' }, { status: 404 });

    await repository.deleteOrder(order.id);
    return NextResponse.json(
      { success: true, message: `Pedido #${order.order_code} excluido com sucesso.` },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Erro ao excluir pedido:', error);
    return NextResponse.json({ success: false, message: 'Erro no servidor ao excluir pedido.' }, { status: 500 });
  }
}