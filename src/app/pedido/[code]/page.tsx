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

const toNum = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

const formatPrice = (val: any): string => {
  return toNum(val).toFixed(2);
};

const formatOrderDate = (val: any): string => {
  if (!val) return '';
  try {
    const raw = String(val).replace(' ', 'T');
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleString('pt-BR', { timeZone: 'America/Recife' });
    } catch {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  } catch {
    return '';
  }
};

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const routeParams = useParams();

  // Extração inicial segura e síncrona para evitar suspense sem boundary
  const [code, setCode] = useState<string>(() => {
    if (routeParams?.code) {
      return Array.isArray(routeParams.code) ? routeParams.code[0] : routeParams.code;
    }
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/pedido\/([^\/\?#]+)/i);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
    return '';
  });

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [storePhone, setStorePhone] = useState('5581999998888');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const autoOpenedWhatsAppRef = React.useRef(false);

  // Resolução da Promise do Next.js 15 em background
  useEffect(() => {
    if (params && typeof (params as any).then === 'function') {
      params.then((p) => {
        if (p?.code && p.code !== code) {
          setCode(p.code);
        }
      }).catch(() => {});
    }
  }, [params, code]);

  // Atualização caso useParams mude
  useEffect(() => {
    if (routeParams?.code) {
      const c = Array.isArray(routeParams.code) ? routeParams.code[0] : routeParams.code;
      if (c && c !== code) {
        setCode(c);
      }
    }
  }, [routeParams?.code, code]);

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
      const res = await fetch(`/api/orders/${encodeURIComponent(code)}`, { cache: 'no-store' });
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

  // Garante que o QR code seja gerado e exibido com segurança
  useEffect(() => {
    if (!order?.payment_details) return;

    try {
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
    } catch (e) {
      console.error('Exceção ao gerar QR code:', e);
    }
  }, [order?.payment_details]);

  const copyFallback = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  const handleCopyPix = () => {
    if (order?.payment_details?.pix_copia_e_cola) {
      const text = order.payment_details.pix_copia_e_cola;
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          }).catch(() => {
            copyFallback(text);
          });
        } else {
          copyFallback(text);
        }
      } catch {
        copyFallback(text);
      }
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

  const { whatsAppMessage, whatsAppUrl } = React.useMemo(() => {
    if (!order) return { whatsAppMessage: '', whatsAppUrl: '' };
    try {
      const msg = generateWhatsAppOrderMessage(order);
      const url = getWhatsAppShareUrl(storePhone, msg);
      return { whatsAppMessage: msg, whatsAppUrl: url };
    } catch (e) {
      console.error('Erro ao gerar mensagem WhatsApp:', e);
      const fallbackMsg = `*Açaí Daiane*\nPedido #${order.order_code || ''}\nTotal: R$ ${formatPrice(order.total_amount)}`;
      return {
        whatsAppMessage: fallbackMsg,
        whatsAppUrl: getWhatsAppShareUrl(storePhone, fallbackMsg),
      };
    }
  }, [order, storePhone]);

  // Dispara envio automático para WhatsApp assim que o Pix for aprovado
  useEffect(() => {
    if (
      order &&
      order.payment_method === 'pix' &&
      order.payment_status === 'paid' &&
      whatsAppUrl &&
      !autoOpenedWhatsAppRef.current
    ) {
      autoOpenedWhatsAppRef.current = true;
      const timer = setTimeout(() => {
        try {
          if (typeof window !== 'undefined') {
            window.open(whatsAppUrl, '_blank');
          }
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
                {formatOrderDate(order.created_at)}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Total</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                R$ {formatPrice(order.total_amount)}
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
                      <strong style={{ fontSize: '1.25rem', color: 'var(--brand-primary)' }}>R$ {formatPrice(order.total_amount)}</strong>
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

          {/* Botão de Envio para WhatsApp Comercial */}
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
              {order.items?.map((item, index) => {
                let opts = item.selected_options;
                if (typeof opts === 'string') {
                  try { opts = JSON.parse(opts); } catch { opts = []; }
                }
                if (!Array.isArray(opts)) opts = [];

                return (
                  <div
                    key={item.id || index}
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
                      {opts.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {opts.map((opt: any, i: number) => (
                            <span key={i} style={{ display: 'block' }}>
                              • {opt.group_name || 'Opção'}: {opt.option_name}
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
                    <span style={{ fontWeight: 700 }}>R$ {formatPrice(item.total_price)}</span>
                  </div>
                );
              })}
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
                <span>R$ {formatPrice(order.subtotal)}</span>
              </div>
              {toNum(order.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Desconto ({order.coupon_code || 'Cupom'})</span>
                  <span>- R$ {formatPrice(order.discount_amount)}</span>
                </div>
              )}
              {order.order_type === 'delivery' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Taxa de Entrega ({order.neighborhood_name})</span>
                  <span>{toNum(order.delivery_fee) === 0 ? 'Grátis' : `R$ ${formatPrice(order.delivery_fee)}`}</span>
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
                <span>R$ {formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
