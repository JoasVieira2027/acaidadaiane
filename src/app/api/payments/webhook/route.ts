import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';
import { getPaymentStatus } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id');

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      // Alguns webhooks do Mercado Pago enviam apenas query params
    }

    const effectiveId = paymentId || bodyData?.data?.id;
    const effectiveTopic = topic || bodyData?.type || bodyData?.action;

    if (!effectiveId) {
      return NextResponse.json({ received: true });
    }

    // Se for notificação de pagamento
    if (effectiveTopic === 'payment' || effectiveTopic === 'payment.created' || effectiveTopic === 'payment.updated') {
      const paymentInfo = await getPaymentStatus(String(effectiveId));

      if (paymentInfo) {
        // Encontra o pedido associado pelo ID da transação
        const orders = await repository.getOrders();
        const matchedOrder = orders.find(
          (o) => o.payment_details?.transaction_id === String(effectiveId)
        );

        if (matchedOrder) {
          if (paymentInfo.status === 'approved') {
            await repository.updatePaymentStatus(matchedOrder.id, 'paid', {
              status_detail: paymentInfo.statusDetail,
              date_approved: paymentInfo.dateApproved,
            });
            // Libera o pedido automaticamente para a preparação
            await repository.updateOrderStatus(matchedOrder.id, 'preparing');
          } else if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') {
            await repository.updatePaymentStatus(matchedOrder.id, 'failed', {
              status_detail: paymentInfo.statusDetail,
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Erro no processamento do webhook:', error);
    return NextResponse.json({ error: 'Falha no processamento' }, { status: 500 });
  }
}
