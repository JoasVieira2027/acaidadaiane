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

// GET /api/option-groups — lista todos os grupos com opções
export async function GET() {
  try {
    const groups = await repository.getOptionGroups();
    return NextResponse.json({ success: true, optionGroups: groups }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('GET /api/option-groups error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao carregar complementos.' }, { status: 500 });
  }
}

// POST /api/option-groups — cria ou atualiza um grupo ou opção (REQUER AUTENTICACAO ADMIN)
export async function POST(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();

    if (body.action === 'save-option') {
      const { groupId, option } = body;
      if (!groupId || !option?.name) {
        return NextResponse.json({ success: false, message: 'ID do grupo e nome da opção são obrigatórios.' }, { status: 400 });
      }
      const savedOption = await repository.saveOption(groupId, {
        ...option,
        price: parseFloat(String(option.price || 0).replace(',', '.')) || 0,
        max_quantity_per_item: Number(option.max_quantity_per_item || 1),
      });
      try {
        revalidatePath('/', 'page');
        revalidatePath('/admin/complementos', 'page');
      } catch {}
      return NextResponse.json({ success: true, option: savedOption }, { headers: noStoreHeaders });
    }

    if (body.action === 'delete-option') {
      const { groupId, optionId } = body;
      if (!groupId || !optionId) {
        return NextResponse.json({ success: false, message: 'IDs obrigatórios.' }, { status: 400 });
      }
      await repository.deleteOption(groupId, optionId);
      try {
        revalidatePath('/', 'page');
        revalidatePath('/admin/complementos', 'page');
      } catch {}
      return NextResponse.json({ success: true }, { headers: noStoreHeaders });
    }

    if (body.action === 'clone-group-for-product') {
      const { groupId, productId } = body;
      if (!groupId || !productId) {
        return NextResponse.json({ success: false, message: 'groupId e productId são obrigatórios.' }, { status: 400 });
      }

      const allGroups = await repository.getOptionGroups();
      const sourceGroup = allGroups.find((g) => g.id === groupId);
      if (!sourceGroup) {
        return NextResponse.json({ success: false, message: 'Grupo não encontrado.' }, { status: 404 });
      }

      // Cria cópia independente do grupo
      const newGroupData = {
        name: `${sourceGroup.name}`,
        description: sourceGroup.description,
        is_required: sourceGroup.is_required,
        min_options: sourceGroup.min_options,
        max_options: sourceGroup.max_options,
        display_order: sourceGroup.display_order,
        is_active: sourceGroup.is_active,
      };

      const clonedGroup = await repository.saveOptionGroup(newGroupData);

      // Copia todas as opções
      if (sourceGroup.options && sourceGroup.options.length > 0) {
        for (const opt of sourceGroup.options) {
          await repository.saveOption(clonedGroup.id, {
            name: opt.name,
            price: opt.price,
            is_available: opt.is_available,
            description: opt.description,
            max_quantity_per_item: opt.max_quantity_per_item,
            display_order: opt.display_order,
          });
        }
      }

      // Atualiza associação no Supabase se configurado
      const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
      const supabase = createSupabaseAdminClient();
      if (supabase) {
        await supabase
          .from('product_option_groups')
          .delete()
          .eq('product_id', productId)
          .eq('option_group_id', groupId);

        await supabase
          .from('product_option_groups')
          .insert([{
            product_id: productId,
            option_group_id: clonedGroup.id,
            display_order: 1,
          }]);
      }

      try {
        revalidatePath('/', 'page');
        revalidatePath('/admin/produtos', 'page');
        revalidatePath('/admin/complementos', 'page');
      } catch {}

      return NextResponse.json({
        success: true,
        clonedGroup,
        message: 'Grupo clonado com sucesso para este produto.',
      }, { headers: noStoreHeaders });
    }

    // Salvar grupo
    const { group } = body;
    if (!group?.name) {
      return NextResponse.json({ success: false, message: 'Nome do grupo é obrigatório.' }, { status: 400 });
    }

    const savedGroup = await repository.saveOptionGroup({
      ...group,
      min_options: Number(group.min_options || 0),
      max_options: Number(group.max_options || 1),
      display_order: Number(group.display_order || 1),
    });

    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin/complementos', 'page');
    } catch {}

    return NextResponse.json({ success: true, group: savedGroup }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('POST /api/option-groups error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao salvar complemento.' }, { status: 500 });
  }
}

// DELETE /api/option-groups?id=xxx — remove o grupo (REQUER AUTENTICACAO ADMIN)
export async function DELETE(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID obrigatório.' }, { status: 400 });
    }

    await repository.deleteOptionGroup(id);
    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin/complementos', 'page');
    } catch {}

    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('DELETE /api/option-groups error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao remover grupo.' }, { status: 500 });
  }
}
