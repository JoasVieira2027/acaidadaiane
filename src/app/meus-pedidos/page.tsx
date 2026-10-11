'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Phone,
  Search,
  ArrowLeft,
  ShoppingBag,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  PackageSearch,
  Truck,
  ChefHat,
  Package,
} from 'lucide-react';
import { Order, OrderStatus } from '@/lib/types';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';

// ── Helpers ────────────────────────────────────────────────────
const toNum = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const n = parseFloat(String(val || '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

const formatPrice = (val: any) => `R$ ${toNum(val).toFixed(2)}`;

const formatDate = (val: any): string => {
  if (!val) return '';
  try {
    const d = new Date(String(val).replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { timeZone: 'America/Recife', dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
};

// ── Status helpers ─────────────────────────────────────────────
type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
};

const STATUS_MAP: Record<OrderStatus | string, StatusConfig> = {
  received:        { label: 'Recebido',          color: '#1d4ed8', bg: '#dbeafe', icon: <Clock size={13} /> },
  preparing:       { label: 'Em Preparação',     color: '#b45309', bg: '#fef3c7', icon: <ChefHat size={13} /> },
  ready:           { label: 'Pronto',             color: '#059669', bg: '#d1fae5', icon: <Package size={13} /> },
  out_for_delivery:{ label: 'Saiu para Entrega', color: '#7c3aed', bg: '#ede9fe', icon: <Truck size={13} /> },
  completed:       { label: 'Concluído',          color: '#15803d', bg: '#dcfce7', icon: <CheckCircle2 size={13} /> },
  cancelled:       { label: 'Cancelado',          color: '#b91c1c', bg: '#fee2e2', icon: <XCircle size={13} /> },
};

const PAYMENT_LABEL: Record<string, string> = {
  pix:           'Pix Online',
  cash:          'Dinheiro',
  card_delivery: 'Cartão na Entrega',
  card_link:     'Link de Pagamento',
};

// ── Component ─────────────────────────────────────────────────
export default function MeusPedidosPage() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 8) {
      setError('Informe pelo menos 8 dígitos do seu telefone.');
      inputRef.current?.focus();
      return;
    }
    setError('');
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/orders/by-phone?phone=${encodeURIComponent(clean)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setError(data.message || 'Erro ao buscar pedidos.');
        setOrders(null);
      }
    } catch {
      setError('Falha na conexão. Tente novamente.');
      setOrders(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)', padding: '2rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '680px' }}>

          {/* Voltar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                transition: 'color 0.15s',
              }}
            >
              <ArrowLeft size={16} />
              <span>Voltar ao Cardápio</span>
            </Link>
          </div>

          {/* Cabeçalho */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-accent-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <PackageSearch size={28} color="var(--brand-primary)" />
            </div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                color: 'var(--text-primary)',
                marginBottom: '0.4rem',
              }}
            >
              Meus Pedidos
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Informe seu número de WhatsApp para ver o histórico de pedidos
            </p>
          </div>

          {/* Formulário de busca */}
          <div
            className="card"
            style={{ padding: '1.75rem', marginBottom: '2rem' }}
          >
            <form onSubmit={handleSearch}>
              <label
                htmlFor="phone-input"
                className="form-label"
                style={{ marginBottom: '0.5rem', display: 'block' }}
              >
                Número de WhatsApp / Telefone
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Phone
                    size={17}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    id="phone-input"
                    ref={inputRef}
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="(81) 99999-9999"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', height: '46px' }}
                    autoComplete="tel"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ height: '46px', paddingInline: '1.25rem', flexShrink: 0 }}
                >
                  {loading ? (
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Search size={18} />
                  )}
                  <span>{loading ? 'Buscando...' : 'Buscar'}</span>
                </button>
              </div>

              {error && (
                <p
                  style={{
                    marginTop: '0.6rem',
                    fontSize: '0.85rem',
                    color: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <XCircle size={14} />
                  {error}
                </p>
              )}

              <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                🔒 Usamos apenas o número para localizar seus pedidos. Nenhum dado é armazenado nesta busca.
              </p>
            </form>
          </div>

          {/* Resultados */}
          {searched && !loading && orders !== null && (
            <>
              {orders.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem 1.5rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <ShoppingBag size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Nenhum pedido encontrado
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    Não encontramos pedidos com esse número.<br />
                    Confira se digitou o número correto.
                  </p>
                  <Link href="/" className="btn btn-primary btn-sm">
                    Fazer um Pedido
                  </Link>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {orders.length} pedido{orders.length > 1 ? 's' : ''} encontrado{orders.length > 1 ? 's' : ''}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {orders.map((order) => {
                      const st = STATUS_MAP[order.order_status] || STATUS_MAP.received;
                      const itemCount = order.items?.reduce((s, i) => s + (i.quantity || 1), 0) ?? 0;

                      return (
                        <Link
                          key={order.id}
                          href={`/pedido/${encodeURIComponent(order.order_code)}`}
                          style={{ textDecoration: 'none' }}
                        >
                          <div
                            className="card"
                            style={{
                              padding: '1.1rem 1.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              cursor: 'pointer',
                              transition: 'border-color 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brand-primary)';
                              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)';
                              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
                            }}
                          >
                            {/* Ícone de status */}
                            <div
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: st.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                color: st.color,
                              }}
                            >
                              <ShoppingBag size={20} />
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                  #{order.order_code}
                                </span>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    backgroundColor: st.bg,
                                    color: st.color,
                                  }}
                                >
                                  {st.icon}
                                  {st.label}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <span>{formatDate(order.created_at)}</span>
                                {itemCount > 0 && (
                                  <span>{itemCount} item{itemCount > 1 ? 's' : ''}</span>
                                )}
                                <span>{PAYMENT_LABEL[order.payment_method] || order.payment_method}</span>
                              </div>
                            </div>

                            {/* Total + seta */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--brand-primary)', display: 'block' }}>
                                {formatPrice(order.total_amount)}
                              </span>
                              <ChevronRight size={18} color="var(--text-muted)" style={{ marginTop: '0.1rem' }} />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Animação de spin inline */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
