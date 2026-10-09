'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Phone,
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
  Truck,
  CheckCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { Order, OrderStatus } from '@/lib/types';
import { generateWhatsAppOrderMessage, getWhatsAppShareUrl } from '@/lib/whatsapp';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';

const statusSteps: { key: OrderStatus; label: string }[] = [
  { key: 'received', label: 'Recebido' },
  { key: 'preparing', label: 'Em Preparação' },
  { key: 'ready', label: 'Pronto' },
  { key: 'out_for_delivery', label: 'Em Rota de Entrega' },
  { key: 'completed', label: 'Concluído' },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const code = (params.code as string) || '';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [storePhone, setStorePhone] = useState('5581999998888');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const autoOpenedWhatsAppRef = React.useRef(false);

  // Busca telefone oficial nas configurações da loja
  useEffect(() => {
    fetch('/api/store-status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.whatsapp_number) {
          setStorePhone(d.settings.whatsapp_number);
        }
      })
      .catch(() => {});
  }, []);

  const fetchOrder = useCallback(async (isManual = false) => {
    if (!code) return;
    if (isManual) setIsCheckingPayment(true);
    try {
      const res = await fetch(`/api/orders/${code}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error('Erro ao buscar pedido:', err);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setIsCheckingPayment(false), 500);
      }
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;

    fetchOrder();

    // Atualiza com maior frequência (5s) enquanto o Pix estiver pendente
    const isWaitingPix = order?.payment_method === 'pix' && order?.payment_status === 'pending';
    const intervalMs = isWaitingPix ? 5000 : 15000;

    const interval = setInterval(() => {
      fetchOrder();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [code, fetchOrder, order?.payment_method, order?.payment_status]);

  // Garante que o QR code seja gerado e exibido
  useEffect(() => {
    if (!order?.payment_details) return;

    const base64 = order.payment_details.qr_code_base64;
    const copiaECola = order.payment_details.pix_copia_e_cola;

    if (base64 && base64.length > 20) {
      const formatted = base64.startsWith('data:image')
        ? base64
        : `data:image/png;base64,${base64}`;
      setQrCodeDataUrl(formatted);
    } else if (copiaECola) {
      QRCode.toDataURL(copiaECola, {
        margin: 1,
        width: 200,
        color: {
          dark: '#1e082b',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Erro ao gerar QR code local:', err));
    }
  }, [order?.payment_details]);

  const handleCopyPix = () => {
    if (order?.payment_details?.pix_copia_e_cola) {
      navigator.clipboard.writeText(order.payment_details.pix_copia_e_cola);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Carregando dados do pedido...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div className="container" style={{ flex: 1, padding: '3rem 1rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Pedido não encontrado</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Não encontramos um pedido com o código #{code}.
          </p>
          <Link href="/" className="btn btn-primary">
            <ArrowLeft size={16} />
            <span>Voltar ao Cardápio</span>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const whatsAppMessage = generateWhatsAppOrderMessage(order);
  const whatsAppUrl = getWhatsAppShareUrl(storePhone, whatsAppMessage);

  // Dispara envio automático para WhatsApp assim que o Pix for aprovado
  useEffect(() => {
    if (
      order &&
      order.payment_method === 'pix' &&
      order.payment_status === 'paid' &&
      !autoOpenedWhatsAppRef.current
    ) {
      autoOpenedWhatsAppRef.current = true;
      const timer = setTimeout(() => {
        try {
          window.open(whatsAppUrl, '_blank');
        } catch (e) {
          console.warn('Bloqueio de popup ou erro ao abrir WhatsApp:', e);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [order?.payment_status, order?.payment_method, whatsAppUrl]);

  const isPixPending = order.payment_method === 'pix' && order.payment_status !== 'paid';
  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.order_status);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main className="container" style={{ flex: 1, padding: '2rem 1rem', maxWidth: '780px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} />
            <span>Voltar ao Cardápio</span>
          </Link>
        </div>

        {/* Card Principal de Confirmação */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <span className="badge badge-brand" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Pedido #{order.order_code}
              </span>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {order.customer_name}, seu pedido foi registrado!
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {new Date(order.created_at).toLocaleString('pt-BR', { timeZone: 'America/Recife' })}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Total</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                R$ {order.total_amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Linha do Tempo / Status do Pedido */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Status Operacional do Pedido
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              {statusSteps.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={step.key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      flex: 1,
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isPassed ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                        color: isPassed ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        marginBottom: '0.4rem',
                        border: isCurrent ? '3px solid var(--border-focus)' : 'none',
                      }}
                    >
                      {isPassed ? <Check size={16} strokeWidth={3} /> : idx + 1}
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Integração Pix (se selecionado e aguardando pagamento) */}
          {order.payment_method === 'pix' && (
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                border: '1px solid var(--border-color)',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Pagamento via Pix Online
                </h3>
                <span
                  className={`badge ${
                    order.payment_status === 'paid' ? 'badge-success' : 'badge-warning'
                  }`}
                >
                  {order.payment_status === 'paid' ? 'Pix Aprovado' : 'Aguardando Pagamento'}
                </span>
              </div>

              {order.payment_status === 'paid' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#16a34a', backgroundColor: '#dcfce7', padding: '0.9rem', borderRadius: 'var(--radius-sm)' }}>
                  <CheckCircle2 size={22} />
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, display: 'block' }}>
                      Pagamento Pix Confirmado com Sucesso!
                    </span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                      O pedido já está liberado e foi encaminhado para a equipe de produção.
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Valor a Pagar via Pix:</span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--brand-primary)' }}>R$ {order.total_amount.toFixed(2)}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchOrder(true)}
                      disabled={isCheckingPayment}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                    >
                      <RefreshCw size={14} className={isCheckingPayment ? 'animate-spin' : ''} />
                      <span>{isCheckingPayment ? 'Verificando...' : 'Verificar Pagamento Agora'}</span>
                    </button>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Abra o app do seu banco, escolha <strong>Pagar via Pix</strong> e escaneie o QR Code ou utilize o código <strong>Copia e Cola</strong> abaixo:
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                    {qrCodeDataUrl ? (
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '0.6rem',
                          borderRadius: 'var(--radius-md)',
                          display: 'inline-block',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrCodeDataUrl}
                          alt="QR Code Pix Oficial"
                          style={{
                            width: '180px',
                            height: '180px',
                            display: 'block',
                            borderRadius: '4px',
                            imageRendering: 'pixelated',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '180px',
                          height: '180px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '1rem',
                          textAlign: 'center',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Gerando QR Code...
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        Código Pix Copia e Cola
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          readOnly
                          value={order.payment_details?.pix_copia_e_cola || ''}
                          className="form-input"
                          style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
                        />
                        <button
                          type="button"
                          onClick={handleCopyPix}
                          className="btn btn-secondary btn-sm"
                          style={{ flexShrink: 0 }}
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                          <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        O pagamento é verificado automaticamente a cada 15 segundos. Ao aprovar, o status atualiza sozinho nesta tela.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão de Envio para WhatsApp Comercial - Liberado somente após Pix ser pago */}
          <div style={{ marginBottom: '1.5rem' }}>
            {isPixPending ? (
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  border: '2px dashed #d1d5db',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: '#4b5563' }}>
                  <Lock size={18} />
                  <span>Aguardando Pagamento Pix para Liberar Envio no WhatsApp</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>
                  Assim que você pagar o Pix, o botão será liberado e abrirá automaticamente o WhatsApp comercial com os detalhes do seu pedido.
                </p>
              </div>
            ) : (
              <div>
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    backgroundColor: '#16a34a',
                    padding: '0.95rem 1rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Phone size={18} />
                  <span>
                    {order.payment_method === 'pix'
                      ? 'Enviar Pedido Confirmado no WhatsApp'
                      : 'Enviar Pedido no WhatsApp Comercial'}
                  </span>
                  <ExternalLink size={16} />
                </a>
                <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.4rem', textAlign: 'center', fontWeight: 600 }}>
                  {order.payment_method === 'pix'
                    ? 'Pagamento Pix confirmado! Se o WhatsApp não tiver aberto sozinho, clique no botão acima.'
                    : 'Encaminhe a mensagem pronta direto para nosso atendimento agilizar a separação e entrega.'}
                </p>
              </div>
            )}
          </div>

          {/* Itens do Pedido */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              Itens Comprados
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {item.quantity}x {item.product_name}
                    </div>
                    {item.selected_options && item.selected_options.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {item.selected_options.map((opt, i) => (
                          <span key={i} style={{ display: 'block' }}>
                            • {opt.group_name}: {opt.option_name}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.item_notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                        Obs: {item.item_notes}
                      </div>
                    )}
                  </div>
                  <span style={{ fontWeight: 700 }}>R$ {item.total_price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Resumo da Cobrança */}
            <div
              style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span>R$ {order.subtotal.toFixed(2)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Desconto ({order.coupon_code || 'Cupom'})</span>
                  <span>- R$ {order.discount_amount.toFixed(2)}</span>
                </div>
              )}
              {order.order_type === 'delivery' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Taxa de Entrega ({order.neighborhood_name})</span>
                  <span>{order.delivery_fee === 0 ? 'Grátis' : `R$ ${order.delivery_fee.toFixed(2)}`}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border-color)',
                  color: 'var(--brand-primary)',
                }}
              >
                <span>Total</span>
                <span>R$ {order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
