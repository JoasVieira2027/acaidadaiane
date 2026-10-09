import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';
import { getPaymentStatus } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Tenta primeiro por order_code (ex: AD-1001), depois por ID
    let order = await repository.getOrderByCode(id);
    if (!order) {
      order = await repository.getOrderById(id);
    }

    if (!order) {
      return NextResponse.json({ success: false, message: 'Pedido não encontrado.' }, { status: 404 });
    }

    // Se o pedido estiver aguardando Pix e tiver transaction_id do Mercado Pago, consulta status ativo
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

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Erro ao buscar pedido:', error);
    return NextResponse.json({ success: false, message: 'Erro no servidor' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { order_status, payment_status } = body;

    let order = await repository.getOrderById(id);
    if (!order) {
      order = await repository.getOrderByCode(id);
    }

    if (!order) {
      return NextResponse.json({ success: false, message: 'Pedido não encontrado.' }, { status: 404 });
    }

    if (order_status) {
      const validStatuses = ['received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
      if (!validStatuses.includes(order_status)) {
        return NextResponse.json({ success: false, message: 'Status do pedido inválido.' }, { status: 400 });
      }
      await repository.updateOrderStatus(order.id, order_status);
      order.order_status = order_status;
    }

    if (payment_status) {
      const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded', 'cancelled'];
      if (!validPaymentStatuses.includes(payment_status)) {
        return NextResponse.json({ success: false, message: 'Status de pagamento inválido.' }, { status: 400 });
      }
      await repository.updatePaymentStatus(order.id, payment_status);
      order.payment_status = payment_status;
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Erro ao atualizar pedido:', error);
    return NextResponse.json({ success: false, message: 'Erro no servidor' }, { status: 500 });
  }
}
