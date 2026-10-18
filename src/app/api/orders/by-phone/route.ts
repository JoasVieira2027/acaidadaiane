import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

// GET /api/orders/by-phone — busca pedidos por telefone (REQUER AUTENTICACAO ADMIN)
// Clientes usam a pagina /meus-pedidos que consulta por order_code, nao por telefone em massa
export async function GET(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get('phone') || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');

    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Telefone invalido. Informe pelo menos 8 digitos.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ success: false, message: 'Erro ao buscar pedidos.' }, { status: 500 });
      }

      const orders = (data || []).filter((o: any) => {
        const stored = (o.customer_phone || '').replace(/\D/g, '');
        const searchSuffix = cleanPhone.slice(-9);
        const storedSuffix = stored.slice(-9);
        return searchSuffix === storedSuffix;
      });

      return NextResponse.json({ success: true, orders });
    }

    const allOrders = await repository.getOrders();
    const orders = allOrders.filter((o) => {
      const stored = (o.customer_phone || '').replace(/\D/g, '');
      const searchSuffix = cleanPhone.slice(-9);
      const storedSuffix = stored.slice(-9);
      return searchSuffix === storedSuffix;
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('GET /api/orders/by-phone error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}