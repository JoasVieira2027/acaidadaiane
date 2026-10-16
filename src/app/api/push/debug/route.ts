import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { sendOrderStatusPush, VAPID_PUBLIC, VAPID_EMAIL } from '@/lib/push';

export const dynamic = 'force-dynamic';

/**
 * GET /api/push/debug?code=AD-1001&send=1
 * Diagnóstico completo do sistema de push notifications.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || '';
  const sendTest = searchParams.get('send') === '1';

  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        ? 'SET (' + process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.slice(0, 12) + '...)'
        : 'NOT SET (usando default)',
      VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY ? 'SET' : 'NOT SET (usando default)',
      VAPID_EMAIL_RAW: process.env.VAPID_EMAIL || 'NOT SET (usando default)',
      VAPID_EMAIL_RESOLVED: VAPID_EMAIL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? 'SET'
        : 'NOT SET — sem essa chave o subscribe FALHA!',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    },
    vapidPublicKey: VAPID_PUBLIC.slice(0, 20) + '...',
    supabaseConfigured: isSupabaseAdminConfigured(),
    subscriptions: null as any,
    testPushResult: null as any,
  };

  if (isSupabaseAdminConfigured()) {
    const supabase = createSupabaseAdminClient()!;

    const query = supabase
      .from('order_push_subscriptions')
      .select('order_code, endpoint, created_at, user_agent')
      .order('created_at', { ascending: false })
      .limit(20);

    if (code) query.ilike('order_code', code);

    const { data, error } = await query;

    report.subscriptions = error
      ? { error: error.message }
      : (data || []).map((s: any) => ({
          order_code: s.order_code,
          endpoint_preview: s.endpoint?.slice(0, 50) + '...',
          service: s.endpoint?.includes('apple.com') ? 'Apple APNS' : s.endpoint?.includes('googleapis') ? 'Google FCM' : 'Other',
          created_at: s.created_at,
          user_agent: (s.user_agent || '').slice(0, 80),
        }));

    // Enviar push de teste se solicitado
    if (code && sendTest) {
      try {
        const result = await sendOrderStatusPush(code.toUpperCase(), 'out_for_delivery');
        report.testPushResult = result;
      } catch (e: any) {
        report.testPushResult = { error: e.message };
      }
    } else if (code && !sendTest) {
      report.hint = `Para enviar push de teste: /api/push/debug?code=${code}&send=1`;
    }
  } else {
    report.subscriptions = 'Supabase nao configurado — verifique as env vars no Vercel';
  }

  return NextResponse.json(report, { status: 200, headers: { 'Content-Type': 'application/json' } });
}
