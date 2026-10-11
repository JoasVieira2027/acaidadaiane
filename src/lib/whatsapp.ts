import type { Order } from './types';

/**
 * Formata um valor numérico para a moeda brasileira (R$) com tolerância a tipos
 */
function formatCurrency(value: any): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value || 0));
  const safeNum = isNaN(num) ? 0 : num;
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(safeNum);
  } catch {
    return `R$ ${safeNum.toFixed(2).replace('.', ',')}`;
  }
}

/**
 * Mapeia métodos de pagamento para descrições textuais limpas (sem emojis)
 */
function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'pix':
      return 'Pix Online';
    case 'cash':
      return 'Dinheiro na Entrega / Retirada';
    case 'card_delivery':
      return 'Cartão na Entrega / Retirada (Maquininha)';
    case 'card_link':
      return 'Cartão Online por Link de Pagamento';
    default:
      return method;
  }
}

/**
 * Mapeia status de pagamento para descrições textuais
 */
function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'Aprovado / Confirmado';
    case 'pending':
      return 'Aguardando Pagamento';
    case 'failed':
      return 'Recusado / Não Concluído';
    case 'refunded':
      return 'Estornado';
    default:
      return status;
  }
}

/**
 * Gera o texto do pedido formatado para o WhatsApp sem emojis, limpo e profissional
 */
export function generateWhatsAppOrderMessage(order: Order, storeName = 'Açaí Daiane'): string {
  let dateFormatted = '';
  try {
    const rawDate = order.created_at ? String(order.created_at).replace(' ', 'T') : '';
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      try {
        dateFormatted = d.toLocaleString('pt-BR', {
          timeZone: 'America/Recife',
          dateStyle: 'short',
          timeStyle: 'short',
        });
      } catch {
        // Fallback para navegadores mobile sem suporte a timezone específico
        const pad = (n: number) => String(n).padStart(2, '0');
        dateFormatted = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
  } catch {
    dateFormatted = '';
  }

  const lines: string[] = [];

  lines.push(`Olá, ${storeName}! 👋`);
  lines.push(`Acabei de realizar um pedido pelo site e gostaria de confirmá-lo.`);
  lines.push('');
  lines.push(`*DETALHES DO MEU PEDIDO*`);
  lines.push(`Pedido: #${order.order_code || 'PEDIDO'}`);
  if (dateFormatted) {
    lines.push(`Data e Horário: ${dateFormatted}`);
  }
  lines.push('----------------------------------------');
  lines.push('*MEUS DADOS*');
  lines.push(`Nome: ${order.customer_name || 'Cliente'}`);
  lines.push(`Telefone: ${order.customer_phone || ''}`);
  lines.push(`Modalidade: ${order.order_type === 'delivery' ? 'Entrega em Domicílio' : 'Retirada no Balcão'}`);

  if (order.order_type === 'delivery') {
    lines.push(`Bairro: ${order.neighborhood_name || 'Não informado'}`);
    lines.push(`Endereço: ${order.address_street || ''}, nº ${order.address_number || 'S/N'}`);
    if (order.address_complement) {
      lines.push(`Complemento: ${order.address_complement}`);
    }
    if (order.address_reference) {
      lines.push(`Ponto de Referência: ${order.address_reference}`);
    }
  }

  lines.push('----------------------------------------');
  lines.push('*ITENS DO PEDIDO*');

  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    order.items.forEach((item, index) => {
      const itemTotal = typeof item.total_price === 'number' ? item.total_price : parseFloat(String(item.total_price || 0));
      lines.push(`${index + 1}. ${item.quantity || 1}x ${item.product_name || 'Item'} - ${formatCurrency(itemTotal)}`);

      let selectedOpts = item.selected_options;
      if (typeof selectedOpts === 'string') {
        try {
          selectedOpts = JSON.parse(selectedOpts);
        } catch {
          selectedOpts = [];
        }
      }

      if (Array.isArray(selectedOpts) && selectedOpts.length > 0) {
        selectedOpts.forEach((opt: any) => {
          const optPrice = typeof opt.price === 'number' ? opt.price : parseFloat(String(opt.price || 0));
          const optQty = typeof opt.quantity === 'number' ? opt.quantity : parseInt(String(opt.quantity || 1), 10);
          const optPriceStr = optPrice > 0 ? ` (+${formatCurrency(optPrice * optQty)})` : '';
          const optQtyStr = optQty > 1 ? `${optQty}x ` : '';
          lines.push(`   - ${opt.group_name || 'Opção'}: ${optQtyStr}${opt.option_name || ''}${optPriceStr}`);
        });
      }

      if (item.item_notes) {
        lines.push(`   Obs item: ${item.item_notes}`);
      }
    });
  }

  lines.push('----------------------------------------');
  lines.push('*RESUMO FINANCEIRO*');
  lines.push(`Subtotal: ${formatCurrency(order.subtotal)}`);

  const disc = typeof order.discount_amount === 'number' ? order.discount_amount : parseFloat(String(order.discount_amount || 0));
  if (disc > 0) {
    lines.push(`Cupom de Desconto (${order.coupon_code || 'Aplicado'}): -${formatCurrency(disc)}`);
  }

  if (order.order_type === 'delivery') {
    const fee = typeof order.delivery_fee === 'number' ? order.delivery_fee : parseFloat(String(order.delivery_fee || 0));
    lines.push(`Taxa de Entrega: ${fee === 0 ? 'Grátis' : formatCurrency(fee)}`);
  }

  lines.push(`*VALOR TOTAL: ${formatCurrency(order.total_amount)}*`);
  lines.push('----------------------------------------');
  lines.push('*PAGAMENTO*');
  lines.push(`Forma: ${getPaymentMethodLabel(order.payment_method)}`);
  lines.push(`Status do Pagamento: ${getPaymentStatusLabel(order.payment_status)}`);

  if (order.order_notes) {
    lines.push('----------------------------------------');
    lines.push('*OBSERVAÇÕES GERAIS*');
    lines.push(order.order_notes);
  }

  lines.push('----------------------------------------');
  lines.push('Aguardo a confirmação. Obrigado(a)! 😊');

  return lines.join('\n');
}

/**
 * Cria o link direto para iniciar a conversa no WhatsApp com a mensagem pronta
 */
export function getWhatsAppShareUrl(phoneNumber: string, message: string): string {
  const cleanPhone = (phoneNumber || '').replace(/\D/g, '');
  const encodedText = encodeURIComponent(message || '');
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
