import { NextResponse } from 'next/server';
import { repository } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await repository.getStoreStatus();
    const settings = await repository.getSettings();
    const hours = await repository.getBusinessHours();

    return NextResponse.json({
      success: true,
      status,
      settings,
      hours,
    });
  } catch (error: any) {
    console.error('Erro na rota GET de store-status:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao obter status da loja' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

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

    return NextResponse.json({
      success: true,
      status: updatedStatus,
      settings: currentSettings,
      hours: currentHours,
      message: 'Status e configurações da loja atualizados com sucesso',
    });
  } catch (error: any) {
    console.error('Erro na rota POST de store-status:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar status da loja' },
      { status: 500 }
    );
  }
}
