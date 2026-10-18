import { NextRequest, NextResponse } from 'next/server';
import { sendOrderStatusPush } from '@/lib/push';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { orderCode, status } = body;

    const result = await sendOrderStatusPush(orderCode, status);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST /api/push/send error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
