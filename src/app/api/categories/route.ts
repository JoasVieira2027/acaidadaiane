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
    const categories = await repository.getCategories();
    return NextResponse.json({ success: true, categories }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao listar categorias.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Reordenação em lote
    if (body.action === 'reorder' && Array.isArray(body.categories)) {
      for (const cat of body.categories) {
        await repository.saveCategory(cat);
      }
      const updated = await repository.getCategories();
      try {
        revalidatePath('/', 'page');
        revalidatePath('/admin/categorias', 'page');
      } catch {}
      return NextResponse.json({ success: true, categories: updated }, { headers: noStoreHeaders });
    }

    const { category } = body;
    if (!category?.name) {
      return NextResponse.json({ success: false, message: 'Nome da categoria é obrigatório.' }, { status: 400 });
    }

    const saved = await repository.saveCategory(category);
    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin/categorias', 'page');
    } catch {}
    return NextResponse.json({ success: true, category: saved }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao salvar categoria.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID é obrigatório.' }, { status: 400 });
    }

    await repository.deleteCategory(id);
    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin/categorias', 'page');
    } catch {}
    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('DELETE /api/categories error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao remover categoria.' }, { status: 500 });
  }
}
