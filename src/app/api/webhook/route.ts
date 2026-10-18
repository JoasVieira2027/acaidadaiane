import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';
import { getPaymentStatus } from '@/lib/mercadopago';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Hierarquia de status: um pedido nunca deve regredir para status anterior
const STATUS_RANK: Record<string, number> = {
  received: 0,
  preparing: 1,
  ready: 2,
  out_for_delivery: 3,
  completed: 4,
  cancelled: 5,
};

import { timingSafeEqualStr } from '@/lib/auth/admin-auth';

/**
 * Verifica a assinatura HMAC-SHA256 da notificacao do Mercado Pago.
 * Documentacao: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 * Header: x-signature -> ts=<timestamp>,v1=<hmac_sha256>
 */
async function verifyMpSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';

  if (!xSignature) {
    console.warn('[Webhook] Notificacao sem header x-signature — rejeitando.');
    return false;
  }

  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook] Notificação com x-signature recebida mas MERCADO_PAGO_WEBHOOK_SECRET não configurado.');
    return false;
  }

  // Extrai ts e v1 do header
  const parts: Record<string, string> = {};
  xSignature.split(',').forEach((part) => {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  });
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // Verifica que o timestamp nao e muito antigo (tolerancia de 5 minutos)
  const tsMs = parseInt(ts, 10) * 1000;
  if (isNaN(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
    console.warn('[Webhook] Timestamp da assinatura expirado ou invalido.');
    return false;
  }

  const url = new URL(req.url);
  let bodyData: any = {};
  try {
    if (rawBody) bodyData = JSON.parse(rawBody);
  } catch {}

  const dataId =
    url.searchParams.get('data.id') ||
    url.searchParams.get('id') ||
    bodyData?.data?.id ||
    String(bodyData?.id || '');

  // Monta o template de assinatura conforme documentacao do MP
  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(template));
    const sigHex = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (!timingSafeEqualStr(sigHex.toLowerCase(), v1.toLowerCase())) {
      console.warn('[Webhook] Assinatura HMAC invalida — notificacao rejeitada.');
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Webhook] Erro ao verificar assinatura:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch {
    rawBody = '';
  }

  // Verifica autenticidade da notificacao
  const signatureValid = await verifyMpSignature(req, rawBody);
  if (!signatureValid) {
    // Retorna 200 para evitar retry, mas nao processa
    return NextResponse.json({ received: true, skipped: 'invalid_signature' });
  }

  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const queryPaymentId = url.searchParams.get('data.id') || url.searchParams.get('id');

    let bodyData: any = {};
    try {
      if (rawBody) bodyData = JSON.parse(rawBody);
    } catch {
      // Alguns webhooks do Mercado Pago enviam apenas query params sem body
    }

    const effectiveId = queryPaymentId || bodyData?.data?.id || String(bodyData?.id || '');
    const effectiveTopic = topic || bodyData?.type || bodyData?.action || bodyData?.topic;

    // Log sanitizado: sem dados pessoais nem body completo
    console.log('[Webhook] Recebido:', { topic: effectiveTopic, paymentId: effectiveId });

    if (!effectiveId || effectiveId === 'undefined') {
      return NextResponse.json({ received: true, skipped: 'no_id' });
    }

    const isPaymentTopic =
      !effectiveTopic ||
      effectiveTopic === 'payment' ||
      effectiveTopic === 'payment.created' ||
      effectiveTopic === 'payment.updated' ||
      effectiveTopic === 'created' ||
      effectiveTopic === 'updated';

    if (isPaymentTopic) {
      try {
        // Consulta status real no Mercado Pago (nao confia nos dados do webhook)
        const paymentInfo = await getPaymentStatus(String(effectiveId));

        if (paymentInfo) {
          let matchedOrder: any = null;
          const supabase = createSupabaseAdminClient();
          if (supabase) {
            const { data } = await supabase
              .from('orders')
              .select('id, order_code, order_status, payment_status, payment_method, total_amount, payment_details')
              .contains('payment_details', { transaction_id: String(effectiveId) })
              .maybeSingle();
            if (data) matchedOrder = data;
          }

          if (!matchedOrder) {
            const orders = await repository.getOrders();
            matchedOrder = orders.find(
              (o) => o.payment_details?.transaction_id === String(effectiveId)
            );
          }

          // Fallback para recuperação de pedidos que sofreram timeout durante a criação:
          // Localiza o pedido através do external_reference (código do pedido, ex: AD-1008)
          if (!matchedOrder && paymentInfo.externalReference) {
            if (supabase) {
              const { data } = await supabase
                .from('orders')
                .select('id, order_code, order_status, payment_status, payment_method, total_amount, payment_details')
                .eq('order_code', paymentInfo.externalReference)
                .maybeSingle();
              if (data) matchedOrder = data;
            }
            if (!matchedOrder) {
              const orders = await repository.getOrders();
              matchedOrder = orders.find((o) => o.order_code === paymentInfo.externalReference);
            }
          }

          if (matchedOrder) {
            if (paymentInfo.status === 'approved') {
              // Validacao de valor: valor pago no MP nao pode ser inferior ao valor do pedido
              const paidAmount = Number(paymentInfo.transactionAmount || 0);
              const orderAmount = Number(matchedOrder.total_amount || 0);
              if (orderAmount > 0 && paidAmount > 0 && paidAmount < orderAmount - 0.05) {
                console.error(`[Webhook] Valor divergente: pago R$ ${paidAmount}, esperado R$ ${orderAmount}`);
                return NextResponse.json({ received: true, error: 'amount_mismatch' });
              }

              // Idempotencia: so avanca para 'preparing' se o pagamento ainda nao foi processado
              if (matchedOrder.payment_status !== 'paid') {
                await repository.updatePaymentStatus(matchedOrder.id, 'paid', {
                  status_detail: paymentInfo.statusDetail,
                  date_approved: paymentInfo.dateApproved,
                });

                // Idempotencia de status: so avanca se o status atual for anterior a 'preparing'
                const currentRank = STATUS_RANK[matchedOrder.order_status] ?? 0;
                const preparingRank = STATUS_RANK['preparing'];
                if (currentRank < preparingRank) {
                  await repository.updateOrderStatus(matchedOrder.id, 'preparing');
                }
                console.log('[Webhook] Pedido aprovado:', matchedOrder.order_code);
              } else {
                console.log('[Webhook] Pedido ja estava pago, ignorando duplicata:', matchedOrder.order_code);
              }
            } else if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') {
              // Nao regride pedidos ja em andamento
              const currentRank = STATUS_RANK[matchedOrder.order_status] ?? 0;
              if (currentRank < STATUS_RANK['preparing'] && matchedOrder.payment_status === 'pending') {
                await repository.updatePaymentStatus(matchedOrder.id, 'failed', {
                  status_detail: paymentInfo.statusDetail,
                });
                console.log('[Webhook] Pagamento recusado para pedido:', matchedOrder.order_code);
              }
            }
          } else {
            console.log('[Webhook] Nenhum pedido encontrado para paymentId:', effectiveId);
          }
        }
      } catch (innerErr: any) {
        console.error('[Webhook] Erro ao processar pagamento:', innerErr.message || innerErr);
        return NextResponse.json({ received: true, error: 'processing_error' });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Webhook] Erro geral:', error?.message || error);
    return NextResponse.json({ received: true, error: 'handler_error' });
  }
}

// GET para verificacao da URL pelo Mercado Pago
export async function GET() {
  return NextResponse.json({ ok: true, service: 'Acai Daiane Webhook' });
}