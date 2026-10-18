import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { repository } from '@/lib/data/repository';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

// GET público (necessário para o checkout mostrar bairros)
export async function GET() {
  try {
    const neighborhoods = await repository.getNeighborhoods();
    return NextResponse.json({ success: true, neighborhoods }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('GET /api/neighborhoods error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao listar bairros.' }, { status: 500 });
  }
}

// POST requer admin
export async function POST(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { neighborhood } = body;

    if (!neighborhood?.name || neighborhood.delivery_fee === undefined) {
      return NextResponse.json({ success: false, message: 'Nome e taxa de entrega são obrigatórios.' }, { status: 400 });
    }

    const saved = await repository.saveNeighborhood(neighborhood);
    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin/bairros', 'page');
    } catch {}

    return NextResponse.json({ success: true, neighborhood: saved }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('POST /api/neighborhoods error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao salvar bairro.' }, { status: 500 });
  }
}

// DELETE requer admin
export async function DELETE(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID é obrigatório.' }, { status: 400 });
    }

    await repository.deleteNeighborhood(id);
    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin/bairros', 'page');
    } catch {}

    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('DELETE /api/neighborhoods error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao remover bairro.' }, { status: 500 });
  }
}
