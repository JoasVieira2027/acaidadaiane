import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';
import { getPaymentStatus } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const queryPaymentId = url.searchParams.get('data.id') || url.searchParams.get('id');

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      // Alguns webhooks do Mercado Pago enviam apenas query params sem body
    }

    const effectiveId = queryPaymentId || bodyData?.data?.id || String(bodyData?.id || '');
    const effectiveTopic = topic || bodyData?.type || bodyData?.action || bodyData?.topic;

    console.log('[Webhook /api/webhook] recebido:', { effectiveTopic, effectiveId, body: bodyData });

    if (!effectiveId || effectiveId === 'undefined') {
      return NextResponse.json({ received: true, skipped: 'no_id' });
    }

    // Suporta notificações do tipo pagamento (legacy e moderno)
    const isPaymentTopic =
      !effectiveTopic ||
      effectiveTopic === 'payment' ||
      effectiveTopic === 'payment.created' ||
      effectiveTopic === 'payment.updated' ||
      effectiveTopic === 'created' ||
      effectiveTopic === 'updated';

    if (isPaymentTopic) {
      try {
        const paymentInfo = await getPaymentStatus(String(effectiveId));
        console.log('[Webhook] paymentInfo:', paymentInfo);

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
              // Libera o pedido automaticamente para produção
              await repository.updateOrderStatus(matchedOrder.id, 'preparing');
              console.log('[Webhook] Pedido aprovado e liberado:', matchedOrder.order_code);
            } else if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') {
              await repository.updatePaymentStatus(matchedOrder.id, 'failed', {
                status_detail: paymentInfo.statusDetail,
              });
              console.log('[Webhook] Pagamento rejeitado para pedido:', matchedOrder.order_code);
            }
          } else {
            console.log('[Webhook] Nenhum pedido encontrado para transaction_id:', effectiveId);
          }
        }
      } catch (innerErr: any) {
        console.error('[Webhook] Erro ao processar pagamento:', innerErr.message || innerErr);
        // Retorna 200 para evitar que o Mercado Pago reenvie repetidamente
        return NextResponse.json({ received: true, error: 'processing_error' });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Webhook] Erro geral:', error?.message || error);
    // NUNCA retornar 5xx aqui — usar 200 para evitar retentativas do Mercado Pago
    return NextResponse.json({ received: true, error: 'handler_error' });
  }
}

// GET para verificação da URL pelo Mercado Pago
export async function GET() {
  return NextResponse.json({ ok: true, service: 'Açaí Daiane Webhook' });
}
