import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { repository } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET() {
  try {
    const coupons = await repository.getCoupons();
    return NextResponse.json({ success: true, coupons }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('GET /api/coupons error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao listar cupons.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { coupon } = body;

    if (!coupon?.code || coupon.discount_value === undefined) {
      return NextResponse.json({ success: false, message: 'Código e valor de desconto são obrigatórios.' }, { status: 400 });
    }

    const saved = await repository.saveCoupon(coupon);
    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin/cupons', 'page');
    } catch {}

    return NextResponse.json({ success: true, coupon: saved }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('POST /api/coupons error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao salvar cupom.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID é obrigatório.' }, { status: 400 });
    }

    await repository.deleteCoupon(id);
    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin/cupons', 'page');
    } catch {}

    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('DELETE /api/coupons error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao remover cupom.' }, { status: 500 });
  }
}
