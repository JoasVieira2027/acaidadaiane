import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// ──────────────────────────────────────────────────────────────
// POST /api/push/subscribe
// Registra um endpoint de push para acompanhar um pedido.
// Recebe: { orderCode, subscription: { endpoint, keys: { p256dh, auth } } }
// ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderCode, subscription } = body;

    const cleanCode = orderCode ? String(orderCode).trim().toUpperCase() : '';

    if (!cleanCode || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { success: false, message: 'Dados de inscrição incompletos.' },
        { status: 400 }
      );
    }

    if (!isSupabaseAdminConfigured()) {
      // Modo dev sem Supabase — retorna sucesso silencioso
      return NextResponse.json({ success: true, message: 'dev-mode' });
    }

    const supabase = createSupabaseAdminClient()!;

    // Upsert: insere ou atualiza se já existir o mesmo endpoint para o pedido
    const { error } = await supabase
      .from('order_push_subscriptions')
      .upsert(
        {
          order_code: cleanCode,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: req.headers.get('user-agent') || '',
        },
        { onConflict: 'order_code,endpoint' }
      );

    if (error) {
      console.error('Erro ao salvar inscrição push:', error);
      return NextResponse.json({ success: false, message: 'Erro ao salvar inscrição.' }, { status: 500 });
    }

    console.log(`[Subscribe] Inscrição registrada para pedido ${cleanCode}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/push/subscribe error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE /api/push/subscribe
// Remove a inscrição push de um pedido (usuário desativou notificações).
// Recebe: { orderCode, endpoint }
// ──────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderCode, endpoint } = body;

    if (!orderCode || !endpoint) {
      return NextResponse.json({ success: false, message: 'Dados insuficientes.' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ success: true });
    }

    const supabase = createSupabaseAdminClient()!;
    await supabase
      .from('order_push_subscriptions')
      .delete()
      .eq('order_code', String(orderCode).trim().toUpperCase())
      .eq('endpoint', endpoint);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/push/subscribe error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
