import webpush from 'web-push';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const DEFAULT_VAPID_PUBLIC =
  'BC80XQI3kOyCt90jFpSzgEIcZcno_-gosPpcPyY87Y-2gnHDiJSB6ESMhnAdyOufxEvJjV8eWD8McxxayZpveZc';
export const DEFAULT_VAPID_PRIVATE =
  'W02U8YL1L2zppae_ZsIvDf2HnB7VAjk3vPdHBsnJiqE';
export const DEFAULT_VAPID_EMAIL =
  'mailto:contato@acaidadaiane.com.br';

export const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
export const VAPID_PRIVATE =
  process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE;
export const VAPID_EMAIL =
  process.env.VAPID_EMAIL || DEFAULT_VAPID_EMAIL;

let vapidConfigured = false;
try {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidConfigured = true;
} catch (e) {
  console.error('[Push] Erro ao configurar VAPID:', e);
}

const statusMessages: Record<string, { title: string; body: string }> = {
  received: {
    title: 'Pedido Recebido! 🟣',
    body: 'Seu pedido foi registrado e está na fila de produção.',
  },
  preparing: {
    title: 'Preparando seu açaí! 🥣',
    body: 'Nossa equipe já começou a montar seu pedido com muito capricho.',
  },
  ready: {
    title: 'Pedido Pronto! ✨',
    body: 'Seu açaí está prontinho! Se for retirada no balcão, já pode vir buscar.',
  },
  out_for_delivery: {
    title: 'Saiu para Entrega! 🛵💨',
    body: 'O entregador já está a caminho com o seu açaí geladinho!',
  },
  completed: {
    title: 'Pedido Entregue! 💜',
    body: 'Obrigado por pedir no Açaí da Daiane! Bom apetite!',
  },
  cancelled: {
    title: 'Pedido Cancelado ⚠️',
    body: 'Seu pedido foi cancelado. Entre em contato conosco pelo WhatsApp.',
  },
};

/**
 * Envia notificação push para todos os navegadores/dispositivos inscritos no pedido
 */
export async function sendOrderStatusPush(orderCode: string, status: string) {
  if (!orderCode || !status) return { success: false, reason: 'missing-params' };

  const cleanCode = String(orderCode).trim().toUpperCase();

  if (!isSupabaseAdminConfigured()) {
    console.warn('[Push] Supabase admin não configurado.');
    return { success: true, sent: 0, reason: 'supabase-not-configured' };
  }

  const supabase = createSupabaseAdminClient()!;

  const { data: subs, error } = await supabase
    .from('order_push_subscriptions')
    .select('*')
    .ilike('order_code', cleanCode);

  if (error) {
    console.error('[Push] Erro ao buscar inscrições para', cleanCode, error);
    return { success: false, reason: 'db-error' };
  }

  if (!subs || subs.length === 0) {
    console.log('[Push] Nenhuma inscrição encontrada para o pedido', cleanCode);
    return { success: true, sent: 0, reason: 'no-subscribers' };
  }

  const notification = statusMessages[status] || {
    title: 'Atualização no seu pedido! 🔔',
    body: `Seu pedido ${cleanCode} foi atualizado.`,
  };

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: '/icon.png',
    badge: '/icon.png',
    tag: `pedido-${cleanCode}`,
    orderCode: cleanCode,
    url: `/pedido/${cleanCode}`,
  });

  const expiredEndpoints: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subs.map(async (sub: any) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushSub, payload, {
          TTL: 86400,
          urgency: 'high',
        });
        sent++;
        console.log('[Push] Notificação enviada com sucesso para endpoint:', sub.endpoint.slice(0, 35) + '...');
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.error(`[Push] Erro ao enviar para ${sub.endpoint.slice(0, 35)}...:`, err.message || err);
        }
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    await supabase
      .from('order_push_subscriptions')
      .delete()
      .eq('order_code', orderCode)
      .in('endpoint', expiredEndpoints);
  }

  return { success: true, sent, total: subs.length };
}
