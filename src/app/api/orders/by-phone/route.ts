import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionToken, ADMIN_COOKIE_NAME } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

function sanitizeOrderForCustomer(o: any) {
  return {
    id: o.id,
    order_code: o.order_code,
    order_status: o.order_status,
    order_type: o.order_type,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    total_amount: o.total_amount,
    subtotal: o.subtotal,
    delivery_fee: o.delivery_fee,
    created_at: o.created_at,
    items: (o.items || []).map((it: any) => ({
      product_name: it.product_name,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total_price: it.total_price,
      selected_options: it.selected_options,
    })),
  };
}

// GET /api/orders/by-phone?phone=...
// Para clientes: retorna histórico resumido sem dados sensíveis (endereço completo, telefone exposto).
// Para admin autenticado: retorna o pedido completo.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get('phone') || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');

    // Exige pelo menos 10 dígitos (DDD + número) para busca pública por telefone
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, message: 'Informe o número completo com DDD (mínimo 10 dígitos).' },
        { status: 400 }
      );
    }

    const isAdmin = isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
    const supabase = createSupabaseAdminClient();

    let matchedOrders: any[] = [];

    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ success: false, message: 'Erro ao buscar pedidos.' }, { status: 500 });
      }

      matchedOrders = (data || []).filter((o: any) => {
        const stored = (o.customer_phone || '').replace(/\D/g, '');
        const searchSuffix = cleanPhone.slice(-9);
        const storedSuffix = stored.slice(-9);
        return searchSuffix === storedSuffix;
      });
    } else {
      const allOrders = await repository.getOrders();
      matchedOrders = allOrders.filter((o) => {
        const stored = (o.customer_phone || '').replace(/\D/g, '');
        const searchSuffix = cleanPhone.slice(-9);
        const storedSuffix = stored.slice(-9);
        return searchSuffix === storedSuffix;
      });
    }

    const orders = isAdmin
      ? matchedOrders
      : matchedOrders.map(sanitizeOrderForCustomer);

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('GET /api/orders/by-phone error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno ao consultar pedidos.' }, { status: 500 });
  }
}