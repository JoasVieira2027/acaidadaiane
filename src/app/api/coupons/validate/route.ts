import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, message: 'Código de cupom obrigatório' }, { status: 400 });
    }

    const coupon = await repository.getCouponByCode(code);

    if (!coupon) {
      return NextResponse.json({ success: false, message: 'Cupom não encontrado' }, { status: 404 });
    }

    if (!coupon.is_active) {
      return NextResponse.json({ success: false, message: 'Este cupom está desativado' }, { status: 400 });
    }

    // Valida datas
    const nowIso = new Date().toISOString();
    if (coupon.start_date && nowIso < coupon.start_date) {
      return NextResponse.json({ success: false, message: 'Cupom ainda não está válido' }, { status: 400 });
    }
    if (coupon.end_date && nowIso > coupon.end_date) {
      return NextResponse.json({ success: false, message: 'Cupom expirado' }, { status: 400 });
    }

    // Valida limite de usos
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ success: false, message: 'Limite de utilizações deste cupom esgotado' }, { status: 400 });
    }

    // Valida valor mínimo do pedido
    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return NextResponse.json(
        {
          success: false,
          message: `Este cupom exige pedido mínimo de R$ ${coupon.min_order_amount.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_order_amount: coupon.min_order_amount,
      },
    });
  } catch (error: any) {
    console.error('Erro na validação de cupom:', error);
    return NextResponse.json({ success: false, message: 'Erro no servidor' }, { status: 500 });
  }
}
