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

export function getMpAccessToken(): string {
  return (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();
}

/**
 * Verifica se as credenciais do Mercado Pago estão configuradas no ambiente
 */
export function isMercadoPagoConfigured(): boolean {
  const token = getMpAccessToken();
  return Boolean(
    token &&
    token.length > 20 &&
    !token.includes('seu-access-token') &&
    (token.startsWith('APP_USR-') || token.startsWith('TEST-'))
  );
}

/**
 * Cria cobrança Pix real via API oficial do Mercado Pago (v1/payments)
 */
export async function createPixPayment(params: CreatePixPaymentParams): Promise<PixPaymentResult> {
  const token = getMpAccessToken();
  const isConfigured = isMercadoPagoConfigured();

  if (!isConfigured) {
    return {
      success: false,
      status: 'rejected',
      errorMessage: 'Credencial do Mercado Pago (MERCADO_PAGO_ACCESS_TOKEN) não configurada ou inválida no servidor.',
    };
  }

  try {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    const isHttpsUrl = Boolean(siteUrl && siteUrl.startsWith('https://') && !siteUrl.includes('localhost'));
    const notificationUrl = isHttpsUrl ? `${siteUrl}/api/payments/webhook` : undefined;

    // Garante email de formato válido para o payer
    const customerEmail = (params.customerEmail || '').trim();
    const payerEmail = customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
      ? customerEmail
      : `cliente_${params.orderCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;

    // Separa nome e sobrenome
    const nameParts = (params.customerName || 'Cliente').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Consumidor';

    // Limpa telefone se fornecido
    const cleanPhone = (params.customerPhone || '').replace(/\D/g, '');

    const payload: any = {
      transaction_amount: Number(params.amount.toFixed(2)),
      description: (params.description || `Pedido ${params.orderCode} - Açaí Daiane`).substring(0, 100),
      payment_method_id: 'pix',
      external_reference: params.orderCode,
      payer: {
        email: payerEmail,
        first_name: firstName,
        last_name: lastName,
      },
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
    };

    if (cleanPhone.length >= 10) {
      payload.payer.phone = {
        area_code: cleanPhone.substring(0, 2),
        number: cleanPhone.substring(2),
      };
    }

    if (notificationUrl) {
      payload.notification_url = notificationUrl;
    }

    // Idempotência determinística por pedido para evitar cobranças duplicadas
    const idempotencyKey = `pix-${params.orderCode}-${params.orderId}`;

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.message ||
        (Array.isArray(data.cause) && data.cause[0]?.description) ||
        'Erro ao gerar Pix no Mercado Pago.';
      console.error('Erro Mercado Pago Pix API:', response.status, errorMsg, data);
      return {
        success: false,
        status: 'rejected',
        errorMessage: errorMsg,
      };
    }

    const txData = data.point_of_interaction?.transaction_data;
    const qrCode = txData?.qr_code || '';
    let qrCodeBase64 = txData?.qr_code_base64 || '';

    // Garante prefixo data:image/png;base64 se vier sem prefixo
    if (qrCodeBase64 && !qrCodeBase64.startsWith('data:')) {
      qrCodeBase64 = `data:image/png;base64,${qrCodeBase64}`;
    }

    // Fallback: se o MP retornar apenas o qrCode string (copia e cola), gera a imagem base64
    if (!qrCodeBase64 && qrCode) {
      try {
        qrCodeBase64 = await QRCode.toDataURL(qrCode, { width: 300, margin: 2 });
      } catch (err) {
        console.error('Erro ao gerar QRCode base64 via lib:', err);
      }
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
    console.error('Falha de conexão com Mercado Pago:', error);
    return {
      success: false,
      status: 'rejected',
      errorMessage: error.message || 'Falha de comunicação com o servidor do Mercado Pago.',
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
  const token = getMpAccessToken();
  if (!token || paymentId.startsWith('SIM-PIX-')) {
    return { status: 'pending' };
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
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
