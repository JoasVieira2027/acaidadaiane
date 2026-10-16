import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY             || '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL                   || 'mailto:admin@acaidadaiane.com.br';

let vapidConfigured = false;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidConfigured = true;
  } catch (e) {
    console.error('Erro ao configurar VAPID:', e);
  }
}

const statusMessages: Record<string, { title: string; body: string }> = {
  received:         { title: 'Pedido Recebido!',         body: 'Seu pedido foi registrado e esta na fila de producao.'       },
  preparing:        { title: 'Preparando seu pedido!',   body: 'Nossa equipe ja comecou a preparar seu acai com carinho.'    },
  ready:            { title: 'Pedido Pronto!',            body: 'Seu acai esta pronto! Se for retirada, pode vir buscar.'    },
  out_for_delivery: { title: 'Saiu para entrega!',        body: 'Seu pedido esta a caminho. Fique de olho na porta!'         },
  completed:        { title: 'Pedido Entregue!',          body: 'Obrigado pela preferencia! Esperamos voce em breve.'        },
  cancelled:        { title: 'Pedido Cancelado',          body: 'Seu pedido foi cancelado. Fale conosco se precisar de ajuda.'},
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderCode, status } = body;

    if (!orderCode || !status) {
      return NextResponse.json({ success: false, message: 'orderCode e status sao obrigatorios.' }, { status: 400 });
    }

    if (!vapidConfigured) {
      console.warn('VAPID nao configurado - push ignorado em dev.');
      return NextResponse.json({ success: true, sent: 0, reason: 'vapid-not-configured' });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ success: true, sent: 0, reason: 'supabase-not-configured' });
    }

    const supabase = createSupabaseAdminClient()!;

    const { data: subs, error } = await supabase
      .from('order_push_subscriptions')
      .select('*')
      .eq('order_code', orderCode);

    if (error) {
      console.error('Erro ao buscar inscricoes push:', error);
      return NextResponse.json({ success: false, message: 'Erro ao buscar inscricoes.' }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: 'no-subscribers' });
    }

    const notification = statusMessages[status] || {
      title: 'Atualizacao no seu pedido!',
      body:  `Seu pedido ${orderCode} foi atualizado.`,
    };

    const payload = JSON.stringify({
      title:     notification.title,
      body:      notification.body,
      icon:      '/icon.png',
      tag:       `pedido-${orderCode}`,
      orderCode,
      url:       `/pedido/${orderCode}`,
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
          await webpush.sendNotification(pushSub, payload, { TTL: 86400 });
          sent++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.error(`Erro ao enviar push para ${sub.endpoint}:`, err.message || err);
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

    return NextResponse.json({ success: true, sent, total: subs.length });
  } catch (error: any) {
    console.error('POST /api/push/send error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
