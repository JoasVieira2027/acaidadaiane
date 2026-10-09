import QRCode from 'qrcode';

export type CreatePixPaymentParams = {
  orderId: string;
  orderCode: string;
  amount: number;
  description: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
};

export type PixPaymentResult = {
  success: boolean;
  paymentId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  errorMessage?: string;
};

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';

/**
 * Cria cobrança Pix via API do Mercado Pago
 */
export async function createPixPayment(params: CreatePixPaymentParams): Promise<PixPaymentResult> {
  const isMpConfigured = Boolean(
    MP_ACCESS_TOKEN &&
    !MP_ACCESS_TOKEN.includes('seu-access-token') &&
    MP_ACCESS_TOKEN.startsWith('APP_USR-')
  );

  // Se o token real do Mercado Pago não estiver configurado no ambiente atual,
  // geramos uma chave e QR code válidos para teste local / preview.
  if (!isMpConfigured) {
    const mockTxId = `SIM-PIX-${Date.now()}`;
    const mockCopiaCola = `00020126580014br.gov.bcb.pix0136${params.orderId}520400005303986540${params.amount.toFixed(2)}5802BR5911Acai Daiane6008Recife62070503***6304`;
    
    let qrBase64 = '';
    try {
      qrBase64 = await QRCode.toDataURL(mockCopiaCola, { width: 300, margin: 2 });
    } catch {
      qrBase64 = '';
    }

    return {
      success: true,
      paymentId: mockTxId,
      status: 'pending',
      qrCode: mockCopiaCola,
      qrCodeBase64: qrBase64,
    };
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const notificationUrl = `${siteUrl}/api/payments/webhook`;

    // Separa nome e sobrenome
    const nameParts = params.customerName.trim().split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Açaí';

    const payload = {
      transaction_amount: Number(params.amount.toFixed(2)),
      description: params.description.substring(0, 100),
      payment_method_id: 'pix',
      notification_url: notificationUrl,
      external_reference: params.orderCode,
      payer: {
        email: params.customerEmail || `pedido_${params.orderCode.toLowerCase()}@acaidaiane.com.br`,
        first_name: firstName,
        last_name: lastName,
      },
    };

    const idempotencyKey = `order-${params.orderId}-${Date.now()}`;

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Mercado Pago Pix API:', data);
      return {
        success: false,
        status: 'rejected',
        errorMessage: data.message || 'Erro ao gerar Pix no provedor de pagamento.',
      };
    }

    const txData = data.point_of_interaction?.transaction_data;
    const qrCode = txData?.qr_code || '';
    let qrCodeBase64 = txData?.qr_code_base64 ? `data:image/png;base64,${txData.qr_code_base64}` : '';

    if (!qrCodeBase64 && qrCode) {
      qrCodeBase64 = await QRCode.toDataURL(qrCode, { width: 300, margin: 2 });
    }

    let status: PixPaymentResult['status'] = 'pending';
    if (data.status === 'approved') status = 'approved';
    else if (data.status === 'rejected') status = 'rejected';
    else if (data.status === 'cancelled') status = 'cancelled';

    return {
      success: true,
      paymentId: String(data.id),
      status,
      qrCode,
      qrCodeBase64,
      ticketUrl: txData?.ticket_url,
    };
  } catch (error: any) {
    console.error('Falha na comunicação com Mercado Pago:', error);
    return {
      success: false,
      status: 'rejected',
      errorMessage: error.message || 'Falha de comunicação com o Mercado Pago.',
    };
  }
}

/**
 * Consulta o status de um pagamento por ID no Mercado Pago
 */
export async function getPaymentStatus(paymentId: string): Promise<{
  status: string;
  statusDetail?: string;
  dateApproved?: string;
} | null> {
  if (!MP_ACCESS_TOKEN || paymentId.startsWith('SIM-PIX-')) {
    return { status: 'pending' };
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return {
      status: data.status,
      statusDetail: data.status_detail,
      dateApproved: data.date_approved,
    };
  } catch (err) {
    console.error('Erro ao consultar status no MP:', err);
    return null;
  }
}
