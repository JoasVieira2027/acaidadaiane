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

// GET /api/products — lista todos os produtos com grupos de complementos (público para o cardápio)
export async function GET() {
  try {
    const [products, categories, optionGroups] = await Promise.all([
      repository.getProducts(),
      repository.getCategories(),
      repository.getOptionGroups(),
    ]);

    const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createSupabaseAdminClient();

    let associations: { product_id: string; option_group_id: string; display_order: number }[] = [];
    if (supabase) {
      const { data } = await supabase
        .from('product_option_groups')
        .select('product_id, option_group_id, display_order')
        .order('display_order', { ascending: true });
      if (data) associations = data;
    }

    const productsWithGroups = products.map((p) => {
      let groups = p.option_groups || [];
      if (supabase && associations.length > 0) {
        const productAssocs = associations
          .filter((a) => a.product_id === p.id)
          .sort((a, b) => a.display_order - b.display_order);

        if (productAssocs.length > 0) {
          groups = productAssocs
            .map((a) => {
              const group = optionGroups.find((g) => g.id === a.option_group_id);
              return group ? { ...group, display_order: a.display_order } : null;
            })
            .filter(Boolean) as any[];
        }
      }

      const category = categories.find((c) => c.id === p.category_id);

      return { ...p, option_groups: groups, category_name: category?.name || '' };
    });

    return NextResponse.json(
      { success: true, products: productsWithGroups, categories, optionGroups },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('GET /api/products:', error);
    return NextResponse.json({ success: false, message: 'Erro ao buscar produtos.' }, { status: 500 });
  }
}

// POST /api/products — criar ou atualizar produto (REQUER AUTENTICAÇÃO ADMIN)
export async function POST(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();

    // Reordenação em lote de produtos
    if (body.action === 'reorder' && Array.isArray(body.products)) {
      await repository.updateProductsOrder(body.products);
      try {
        revalidatePath('/', 'page');
        revalidatePath('/admin/produtos', 'page');
      } catch {}
      return NextResponse.json({ success: true }, { headers: noStoreHeaders });
    }

    const { product, option_group_ids } = body;

    if (!product?.name || product.price === undefined) {
      return NextResponse.json({ success: false, message: 'Nome e preço são obrigatórios.' }, { status: 400 });
    }

    const parsePrice = (v: any): number => {
      if (typeof v === 'number') return v;
      if (!v && v !== 0) return 0;
      const clean = String(v).replace(',', '.').trim();
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : n;
    };

    // Salvar produto
    let saved = await repository.saveProduct({
      ...product,
      price: parsePrice(product.price),
      promotional_price: product.promotional_price !== undefined && product.promotional_price !== null && product.promotional_price !== ''
        ? parsePrice(product.promotional_price)
        : null,
    });

    // Atualizar associações de grupos se Supabase disponível
    const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createSupabaseAdminClient();

    if (supabase && Array.isArray(option_group_ids)) {
      await supabase.from('product_option_groups').delete().eq('product_id', saved.id);

      if (option_group_ids.length > 0) {
        const rows = option_group_ids.map((gid: string, idx: number) => ({
          product_id: saved.id,
          option_group_id: gid,
          display_order: idx + 1,
        }));
        await supabase.from('product_option_groups').insert(rows);
      }
    } else if (Array.isArray(option_group_ids)) {
      const allOptionGroups = await repository.getOptionGroups();
      const matchedGroups = option_group_ids
        .map((gid: string, idx: number) => {
          const g = allOptionGroups.find((og) => og.id === gid);
          return g ? { ...g, display_order: idx + 1 } : null;
        })
        .filter(Boolean);
      saved = await repository.saveProduct({
        ...saved,
        option_groups: matchedGroups as any,
      });
    }

    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin/produtos', 'page');
    } catch {}

    return NextResponse.json({ success: true, product: saved }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('POST /api/products:', error);
    return NextResponse.json({ success: false, message: 'Erro ao salvar produto.' }, { status: 500 });
  }
}

// DELETE /api/products?id=xxx (REQUER AUTENTICAÇÃO ADMIN)
export async function DELETE(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'ID obrigatório.' }, { status: 400 });

    await repository.deleteProduct(id);

    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin/produtos', 'page');
    } catch {}

    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Erro ao excluir produto.' }, { status: 500 });
  }
}
