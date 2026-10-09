import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';

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
