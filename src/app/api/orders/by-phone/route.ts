import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get('phone') || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');

    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Telefone inválido. Informe pelo menos 8 dígitos.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    if (supabase) {
      // Busca por sufixo: compara os últimos 9 ou 11 dígitos para tolerar DDD e +55
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ success: false, message: 'Erro ao buscar pedidos.' }, { status: 500 });
      }

      // Filtra no lado do servidor: compara sufixos para tolerar diferentes formatos de telefone
      const orders = (data || []).filter((o: any) => {
        const stored = (o.customer_phone || '').replace(/\D/g, '');
        // Compara os últimos 9 dígitos (número sem DDD) para máxima compatibilidade
        const searchSuffix = cleanPhone.slice(-9);
        const storedSuffix = stored.slice(-9);
        return searchSuffix === storedSuffix;
      });

      return NextResponse.json({ success: true, orders });
    }

    // Fallback in-memory
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
