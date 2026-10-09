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
      settings: {
        store_name: settings.store_name,
        whatsapp_number: settings.whatsapp_number,
        address_text: settings.address_text,
        accept_pix: settings.accept_pix,
        accept_cash: settings.accept_cash,
        accept_card_delivery: settings.accept_card_delivery,
        accept_card_link: settings.accept_card_link,
        allow_pickup: settings.allow_pickup,
        allow_delivery: settings.allow_delivery,
      },
      hours,
    });
  } catch (error: any) {
    console.error('Erro na rota de store-status:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao obter status da loja' },
      { status: 500 }
    );
  }
}
