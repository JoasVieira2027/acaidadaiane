'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  ShoppingBag,
  DollarSign,
  Phone,
  MessageCircle,
  Clock,
  Search,
  ExternalLink,
  ChevronRight,
  Award,
  Sparkles,
  Heart,
  Calendar,
  X,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { Order } from '@/lib/types';
import { initialOrders } from '@/lib/data/mockData';

type CustomerProfile = {
  phone: string;
  cleanPhone: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  averageTicket: number;
  lastOrderDate: string;
  favoriteProducts: { name: string; count: number }[];
  orders: Order[];
};

export default function AdminClientesPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  // Busca pedidos da API
  useEffect(() => {
    fetch('/api/orders', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      })
      .catch((err) => console.error('Erro ao buscar pedidos em clientes:', err));
  }, []);

  // Agrupa pedidos por telefone (WhatsApp)
  const customers = useMemo(() => {
    const map = new Map<string, {
      name: string;
      phone: string;
      cleanPhone: string;
      orders: Order[];
      productCounts: Map<string, number>;
    }>();

    orders.forEach((o) => {
      if (o.order_status === 'cancelled') return;
      const rawPhone = o.customer_phone || '';
      const clean = rawPhone.replace(/\D/g, '');
      if (!clean) return;

      const existing = map.get(clean) || {
        name: o.customer_name || 'Cliente',
        phone: rawPhone,
        cleanPhone: clean,
        orders: [],
        productCounts: new Map<string, number>(),
      };

      // Atualiza nome com o mais recente se disponível
      if (o.customer_name && o.customer_name.trim()) {
        existing.name = o.customer_name.trim();
      }
      existing.orders.push(o);

      // Contagem de produtos pedidos
      if (Array.isArray(o.items)) {
        o.items.forEach((item) => {
          const pName = item.product_name || 'Produto';
          const cur = existing.productCounts.get(pName) || 0;
          existing.productCounts.set(pName, cur + (Number(item.quantity) || 1));
        });
      }

      map.set(clean, existing);
    });

    const list: CustomerProfile[] = [];

    map.forEach((data) => {
      // Ordena pedidos por data decrescente
      const sortedOrders = [...data.orders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const totalSpent = sortedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const orderCount = sortedOrders.length;
      const averageTicket = orderCount > 0 ? totalSpent / orderCount : 0;
      const lastOrderDate = sortedOrders[0]?.created_at || '';

      // Produtos mais pedidos pelo cliente
      const favoriteProducts = Array.from(data.productCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      list.push({
        phone: data.phone,
        cleanPhone: data.cleanPhone,
        name: data.name,
        orderCount,
        totalSpent,
        averageTicket,
        lastOrderDate,
        favoriteProducts,
        orders: sortedOrders,
      });
    });

    // Ordena inicialmente por maior valor total gasto
    return list.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  // Destaques / Top Clientes
  const topSpentCustomer = useMemo(() => {
    if (customers.length === 0) return null;
    return [...customers].sort((a, b) => b.totalSpent - a.totalSpent)[0];
  }, [customers]);

  const topFrequencyCustomer = useMemo(() => {
    if (customers.length === 0) return null;
    return [...customers].sort((a, b) => b.orderCount - a.orderCount)[0];
  }, [customers]);

  const recurringCount = useMemo(() => {
    return customers.filter((c) => c.orderCount > 1).length;
  }, [customers]);

  // Filtro de busca por nome ou telefone
  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const term = search.toLowerCase().trim();
    const cleanTerm = term.replace(/\D/g, '');

    return customers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(term);
      const matchPhone = cleanTerm ? c.cleanPhone.includes(cleanTerm) : c.phone.includes(term);
      return matchName || matchPhone;
    });
  }, [customers, search]);

  const formatPhone = (phoneStr: string) => {
    const clean = phoneStr.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phoneStr;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            Base de Clientes (Sem Cadastro)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Histórico inteligente agrupado automaticamente pelo WhatsApp e telefone do pedido.
          </p>
        </div>

        <Link href="/admin/pedidos" className="btn btn-primary btn-sm">
          <ShoppingBag size={16} />
          <span>Ver Todos os Pedidos</span>
        </Link>
      </div>

      {/* Cards de Destaque / Resumo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Maior Comprador em R$ */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid var(--brand-primary)',
            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-accent-subtle) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              💎 Cliente Que Mais Gastou
            </span>
            <Award size={18} style={{ color: 'var(--brand-primary)' }} />
          </div>
          {topSpentCustomer ? (
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {topSpentCustomer.name}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--brand-primary)', marginTop: '0.1rem' }}>
                R$ {topSpentCustomer.totalSpent.toFixed(2).replace('.', ',')}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {topSpentCustomer.orderCount} {topSpentCustomer.orderCount === 1 ? 'pedido' : 'pedidos'} • {formatPhone(topSpentCustomer.phone)}
              </span>
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sem dados ainda</span>
          )}
        </div>

        {/* Mais Frequente */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid var(--success)',
            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--success-bg) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              🏆 Cliente Mais Frequente
            </span>
            <Sparkles size={18} style={{ color: 'var(--success)' }} />
          </div>
          {topFrequencyCustomer ? (
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {topFrequencyCustomer.name}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)', marginTop: '0.1rem' }}>
                {topFrequencyCustomer.orderCount} {topFrequencyCustomer.orderCount === 1 ? 'pedido' : 'pedidos'}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Total: R$ {topFrequencyCustomer.totalSpent.toFixed(2).replace('.', ',')} • {formatPhone(topFrequencyCustomer.phone)}
              </span>
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sem dados ainda</span>
          )}
        </div>

        {/* Total de Clientes Únicos */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Clientes Únicos</span>
            <Users size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {customers.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Identificados automaticamente por WhatsApp
          </span>
        </div>

        {/* Clientes Recorrentes */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Taxa de Fidelidade</span>
            <TrendingUp size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#8b5cf6' }}>
            {customers.length > 0 ? `${Math.round((recurringCount / customers.length) * 100)}%` : '0%'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {recurringCount} clientes já pediram mais de 1 vez
          </span>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do cliente ou número de WhatsApp..."
            className="form-input"
            style={{ paddingLeft: '2.75rem', width: '100%' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Lista / Cards de Clientes */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
            Clientes Cadastrados por Pedido ({filteredCustomers.length})
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Ordenado por maior volume financeiro
          </span>
        </div>

        {filteredCustomers.length === 0 ? (
          <div
            style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              border: '2px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Nenhum cliente encontrado com os critérios de busca.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredCustomers.map((c) => (
              <div
                key={c.cleanPhone}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  gap: '1rem',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {/* Info do Cliente */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 280px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-accent-subtle)',
                      color: 'var(--brand-primary)',
                      fontWeight: 900,
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {c.name}
                      </span>
                      {c.orderCount >= 3 && (
                        <span className="badge badge-brand" style={{ fontSize: '0.68rem' }}>
                          ⭐ Fiel ({c.orderCount}x)
                        </span>
                      )}
                      {c.totalSpent > 100 && (
                        <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                          VIP
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Phone size={12} />
                        <span>{formatPhone(c.phone)}</span>
                      </span>

                      {/* Botão de WhatsApp direto */}
                      <a
                        href={`https://wa.me/55${c.cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm"
                        style={{
                          backgroundColor: '#25D366',
                          color: '#ffffff',
                          padding: '0.15rem 0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          borderRadius: '999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                        title="Iniciar conversa no WhatsApp"
                      >
                        <MessageCircle size={11} />
                        <span>WhatsApp</span>
                      </a>
                    </div>

                    {/* Produtos Favoritos */}
                    {c.favoriteProducts.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        <strong>Mais pede:</strong>{' '}
                        {c.favoriteProducts.map((p) => `${p.name} (${p.count}x)`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Métricas do Cliente */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      TOTAL COMPRADO
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--brand-primary)' }}>
                      R$ {c.totalSpent.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {c.orderCount} {c.orderCount === 1 ? 'pedido' : 'pedidos'} • Méd: R$ {c.averageTicket.toFixed(2).replace('.', ',')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      ÚLTIMA COMPRA
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatDate(c.lastOrderDate)}
                    </div>
                  </div>

                  {/* Botão Ver Histórico */}
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(c)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 700 }}
                  >
                    <span>Ver Histórico</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Histórico de Pedidos do Cliente */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '650px', width: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Topo do Modal */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{selectedCustomer.name}</h3>
                  <span className="badge badge-brand" style={{ fontSize: '0.75rem' }}>
                    {selectedCustomer.orderCount} {selectedCustomer.orderCount === 1 ? 'pedido' : 'pedidos'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  WhatsApp: {formatPhone(selectedCustomer.phone)} • Total Acumulado: R${' '}
                  {selectedCustomer.totalSpent.toFixed(2).replace('.', ',')}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '50%', padding: '0.35rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Todos os pedidos realizados por este número:
              </div>

              {selectedCustomer.orders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--brand-primary)', fontSize: '0.95rem' }}>
                        #{ord.order_code}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                        {ord.order_type === 'delivery' ? 'Entrega' : 'Retirada'}
                      </span>
                      <span
                        className={`badge ${
                          ord.order_status === 'completed'
                            ? 'badge-success'
                            : ord.order_status === 'cancelled'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {ord.order_status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatDate(ord.created_at)}
                    </div>
                  </div>

                  {/* Itens do pedido */}
                  {Array.isArray(ord.items) && (
                    <div style={{ margin: '0.5rem 0', padding: '0.5rem 0', borderTop: '1px dashed var(--border-subtle)', borderBottom: '1px dashed var(--border-subtle)' }}>
                      {ord.items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', margin: '0.2rem 0' }}>
                          <span>
                            {it.quantity}x {it.product_name}
                          </span>
                          <span style={{ fontWeight: 700 }}>
                            R$ {Number(it.total_price).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Endereço / Notas */}
                  {ord.address_street && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} />
                      <span>
                        {ord.address_street}, {ord.address_number} ({ord.neighborhood_name})
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '0.5rem',
                      paddingTop: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Pagamento: {ord.payment_method.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                      Total: R$ {Number(ord.total_amount).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Rodapé do Modal */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-tertiary)',
              }}
            >
              <a
                href={`https://wa.me/55${selectedCustomer.cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm"
                style={{ backgroundColor: '#25D366', color: '#ffffff', fontWeight: 700 }}
              >
                <MessageCircle size={16} />
                <span>Conversar no WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="btn btn-secondary btn-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
