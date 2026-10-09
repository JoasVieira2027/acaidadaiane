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

// POST /api/option-groups — cria ou atualiza um grupo ou opção
export async function POST(req: NextRequest) {
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

// DELETE /api/option-groups?id=xxx — remove o grupo
export async function DELETE(req: NextRequest) {
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
