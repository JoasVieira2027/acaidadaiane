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

// GET público: necessário para o cardápio verificar se a loja está aberta
export async function GET() {
  try {
    const status = await repository.getStoreStatus();
    const settings = await repository.getSettings();
    const hours = await repository.getBusinessHours();

    return NextResponse.json(
      {
        success: true,
        status,
        settings,
        hours,
      },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Erro na rota GET de store-status:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao obter status da loja' },
      { status: 500 }
    );
  }
}

// POST requer admin — apenas administradores podem alterar configurações e horários
export async function POST(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();

    let settingsToUpdate: any = null;
    if (body.settings) {
      settingsToUpdate = body.settings;
    } else if (
      body.is_manually_opened !== undefined ||
      body.is_manually_closed !== undefined ||
      body.open_message !== undefined ||
      body.closed_message !== undefined ||
      body.store_name !== undefined ||
      body.whatsapp_number !== undefined
    ) {
      settingsToUpdate = body;
    }

    if (settingsToUpdate) {
      await repository.updateSettings(settingsToUpdate);
    }

    if (body.hours && Array.isArray(body.hours)) {
      await repository.updateBusinessHours(body.hours);
    }

    const updatedStatus = await repository.getStoreStatus();
    const currentSettings = await repository.getSettings();
    const currentHours = await repository.getBusinessHours();

    try {
      revalidatePath('/', 'page');
      revalidatePath('/admin', 'page');
      revalidatePath('/admin/horarios', 'page');
      revalidatePath('/admin/configuracoes', 'page');
    } catch {}

    return NextResponse.json(
      {
        success: true,
        status: updatedStatus,
        settings: currentSettings,
        hours: currentHours,
        message: 'Status e configurações da loja atualizados com sucesso',
      },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Erro na rota POST de store-status:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar status da loja' },
      { status: 500 }
    );
  }
}
