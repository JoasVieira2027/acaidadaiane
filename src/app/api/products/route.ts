import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

// GET /api/products — lista todos os produtos com grupos de complementos
export async function GET() {
  try {
    const [products, categories, optionGroups] = await Promise.all([
      repository.getProducts(),
      repository.getCategories(),
      repository.getOptionGroups(),
    ]);

    // Buscar associações produto <-> grupo se Supabase estiver configurado
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

    // Montar produtos com seus grupos
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

    return NextResponse.json({ success: true, products: productsWithGroups, categories, optionGroups });
  } catch (error: any) {
    console.error('GET /api/products:', error);
    return NextResponse.json({ success: false, message: 'Erro ao buscar produtos.' }, { status: 500 });
  }
}

// POST /api/products — criar ou atualizar produto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product, option_group_ids } = body;

    if (!product?.name || product.price === undefined) {
      return NextResponse.json({ success: false, message: 'Nome e preço são obrigatórios.' }, { status: 400 });
    }

    // Salvar produto
    let saved = await repository.saveProduct({
      ...product,
      price: Number(product.price),
      promotional_price: product.promotional_price ? Number(product.promotional_price) : null,
    });

    // Atualizar associações de grupos se Supabase disponível
    const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createSupabaseAdminClient();

    if (supabase && Array.isArray(option_group_ids)) {
      // Remove associações antigas deste produto
      await supabase.from('product_option_groups').delete().eq('product_id', saved.id);

      // Insere novas associações
      if (option_group_ids.length > 0) {
        const rows = option_group_ids.map((gid: string, idx: number) => ({
          product_id: saved.id,
          option_group_id: gid,
          display_order: idx + 1,
        }));
        await supabase.from('product_option_groups').insert(rows);
      }
    } else if (Array.isArray(option_group_ids)) {
      // In-memory fallback
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

    return NextResponse.json({ success: true, product: saved });
  } catch (error: any) {
    console.error('POST /api/products:', error);
    return NextResponse.json({ success: false, message: 'Erro ao salvar produto.' }, { status: 500 });
  }
}

// DELETE /api/products?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'ID obrigatório.' }, { status: 400 });

    await repository.deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Erro ao excluir produto.' }, { status: 500 });
  }
}
