import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

// GET /api/expenses - lista todas as despesas operacionais
export async function GET() {
  try {
    const expenses = await repository.getExpenses();
    return NextResponse.json({ success: true, expenses }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao listar despesas.' }, { status: 500 });
  }
}

// POST /api/expenses - cadastra ou atualiza uma despesa
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { expense } = body;

    if (!expense?.title || expense.amount === undefined || expense.amount === null) {
      return NextResponse.json(
        { success: false, message: 'Título e valor da despesa são obrigatórios.' },
        { status: 400 }
      );
    }

    const saved = await repository.saveExpense(expense);
    return NextResponse.json({ success: true, expense: saved }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao salvar despesa.' }, { status: 500 });
  }
}

// DELETE /api/expenses?id=... - remove uma despesa
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID da despesa é obrigatório.' }, { status: 400 });
    }

    await repository.deleteExpense(id);
    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('DELETE /api/expenses error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao excluir despesa.' }, { status: 500 });
  }
}
