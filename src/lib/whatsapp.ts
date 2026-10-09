import { Order } from './types';

/**
 * Formata um valor numérico para a moeda brasileira (R$)
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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
  const dateFormatted = new Date(order.created_at).toLocaleString('pt-BR', {
    timeZone: 'America/Recife',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const lines: string[] = [];

  lines.push(`*NOVO PEDIDO - ${storeName.toUpperCase()}*`);
  lines.push(`Pedido: #${order.order_code}`);
  lines.push(`Data e Horário: ${dateFormatted}`);
  lines.push('----------------------------------------');
  lines.push('*DADOS DO CLIENTE*');
  lines.push(`Nome: ${order.customer_name}`);
  lines.push(`Telefone: ${order.customer_phone}`);
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

  if (order.items && order.items.length > 0) {
    order.items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.quantity}x ${item.product_name} - ${formatCurrency(item.total_price)}`);

      if (item.selected_options && item.selected_options.length > 0) {
        item.selected_options.forEach((opt) => {
          const optPriceStr = opt.price > 0 ? ` (+${formatCurrency(opt.price * (opt.quantity || 1))})` : '';
          const optQtyStr = opt.quantity && opt.quantity > 1 ? `${opt.quantity}x ` : '';
          lines.push(`   - ${opt.group_name}: ${optQtyStr}${opt.option_name}${optPriceStr}`);
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

  if (order.discount_amount > 0) {
    lines.push(`Cupom de Desconto (${order.coupon_code || 'Aplicado'}): -${formatCurrency(order.discount_amount)}`);
  }

  if (order.order_type === 'delivery') {
    lines.push(`Taxa de Entrega: ${order.delivery_fee === 0 ? 'Grátis' : formatCurrency(order.delivery_fee)}`);
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
  lines.push('Acompanhe seu pedido pelo site ou tire dúvidas respondendo a esta mensagem.');

  return lines.join('\n');
}

/**
 * Cria o link direto para iniciar a conversa no WhatsApp com a mensagem pronta
 */
export function getWhatsAppShareUrl(phoneNumber: string, message: string): string {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
