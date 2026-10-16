import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { sendOrderStatusPush, VAPID_PUBLIC, VAPID_EMAIL } from '@/lib/push';

export const dynamic = 'force-dynamic';

/**
 * GET /api/push/debug?code=AD-1001
 * Diagnóstico completo do sistema de push notifications.
 * Verificar: env vars, Supabase, subscriptions, envio de teste.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || 'TEST-001';

  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'SET (' + process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.slice(0, 12) + '...)' : 'NOT SET (usando default)',
      VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY ? 'SET' : 'NOT SET (usando default)',
      VAPID_EMAIL: process.env.VAPID_EMAIL || 'NOT SET (usando default)',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET — sem essa chave o subscribe FALHA!',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    },
    vapidPublicKey: VAPID_PUBLIC.slice(0, 20) + '...',
    supabaseConfigured: isSupabaseAdminConfigured(),
    subscriptions: null as any,
    testPushResult: null as any,
  };

  // Verificar subscriptions no banco
  if (isSupabaseAdminConfigured()) {
    const supabase = createSupabaseAdminClient()!;
    const { data, error } = await supabase
      .from('order_push_subscriptions')
      .select('order_code, endpoint, created_at, user_agent')
      .order('created_at', { ascending: false })
      .limit(10);

    report.subscriptions = error
      ? { error: error.message }
      : (data || []).map((s: any) => ({
          order_code: s.order_code,
          endpoint: s.endpoint?.slice(0, 40) + '...',
          created_at: s.created_at,
          user_agent: (s.user_agent || '').slice(0, 60),
        }));

    // Testar envio para o código passado
    if (code !== 'TEST-001') {
      const result = await sendOrderStatusPush(code, 'out_for_delivery');
      report.testPushResult = result;
    }
  } else {
    report.subscriptions = 'Supabase não configurado — verifique as env vars no Vercel';
  }

  return NextResponse.json(report, { status: 200 });
}
