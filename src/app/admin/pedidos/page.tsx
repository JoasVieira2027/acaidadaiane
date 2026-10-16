'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Printer,
  Eye,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  PackageCheck,
  ChevronDown,
  Trash2,
  Ban,
  MessageSquare,
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus } from '@/lib/types';
import { getWhatsAppShareUrl } from '@/lib/whatsapp';
import { initialOrders } from '@/lib/data/mockData';

const paymentMethodLabels: Record<string, string> = {
  pix: 'Pix Online',
  cash: 'Dinheiro',
  card_delivery: 'Cartão Maquininha',
  card_link: 'Cartão por Link',
};

const statusLabels: Record<OrderStatus, { label: string; badge: string }> = {
  received: { label: 'Recebido', badge: 'badge-warning' },
  preparing: { label: 'Em preparação', badge: 'badge-warning' },
  ready: { label: 'Pronto', badge: 'badge-info' },
  out_for_delivery: { label: 'Saiu para entrega', badge: 'badge-info' },
  completed: { label: 'Concluído', badge: 'badge-success' },
  cancelled: { label: 'Cancelado', badge: 'badge-danger' },
};

// Gera mensagem profissional de "Saiu para Entrega" para o WhatsApp do cliente
function generateDeliveryWhatsAppMessage(order: Order): string {
  const lines: string[] = [];
  lines.push(`Olá, ${order.customer_name}.`);
  lines.push('');
  lines.push(`Informamos que o seu pedido *#${order.order_code}* saiu para entrega e em breve chegará ao seu endereço.`);
  lines.push('');
  if (order.order_type === 'delivery') {
    lines.push(`*Endereco de entrega:*`);
    lines.push(`${order.address_street || ''}, n. ${order.address_number || 'S/N'}${order.address_complement ? ` - ${order.address_complement}` : ''}`);
    lines.push(`Bairro: ${order.neighborhood_name || ''}`);
    if (order.address_reference) lines.push(`Referencia: ${order.address_reference}`);
    lines.push('');
  }
  lines.push(`*Resumo:*`);
  if (order.items && order.items.length > 0) {
    order.items.forEach((item) => {
      lines.push(`- ${item.quantity || 1}x ${item.product_name}`);
    });
  }
  lines.push('');
  lines.push(`*Total:* R$ ${order.total_amount.toFixed(2)}`);
  lines.push('');
  lines.push(`Em caso de duvidas, estamos a disposicao.`);
  return lines.join('\n');
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleWhatsAppDelivery = (order: Order) => {
    const msg = generateDeliveryWhatsAppMessage(order);
    const cleanPhone = order.customer_phone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const url = getWhatsAppShareUrl(phone, msg);
    window.open(url, '_blank');
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId || o.order_code === orderId ? { ...o, order_status: newStatus } : o))
        );
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.order_code === orderId)) {
          setSelectedOrder((prev) => (prev ? { ...prev, order_status: newStatus } : null));
        }
      }
    } catch {
      // Atualização local de fallback
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
      );
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, newPaymentStatus: PaymentStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newPaymentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.order_code === orderId ? { ...o, payment_status: newPaymentStatus } : o
          )
        );
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.order_code === orderId)) {
          setSelectedOrder((prev) => (prev ? { ...prev, payment_status: newPaymentStatus } : null));
        }
      }
    } catch {
      // Atualização local de fallback
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, payment_status: newPaymentStatus } : o))
      );
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!window.confirm(`Deseja realmente CANCELAR o pedido #${order.order_code}?`)) {
      return;
    }
    await handleUpdateStatus(order.id, 'cancelled');
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!window.confirm(`ATENÇÃO: Tem certeza que deseja EXCLUIR permanentemente o pedido #${order.order_code}? Esta ação apagará o pedido definitivamente.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id && o.order_code !== order.order_code));
        if (selectedOrder && (selectedOrder.id === order.id || selectedOrder.order_code === order.order_code)) {
          setSelectedOrder(null);
        }
      } else {
        alert(data.message || 'Erro ao excluir pedido.');
      }
    } catch (err) {
      console.error('Erro ao excluir pedido:', err);
      alert('Erro de conexão ao excluir pedido.');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.order_status !== statusFilter) return false;
    if (typeFilter !== 'all' && o.order_type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const codeMatch = o.order_code.toLowerCase().includes(q);
      const nameMatch = o.customer_name.toLowerCase().includes(q);
      const phoneMatch = o.customer_phone.includes(q);
      return codeMatch || nameMatch || phoneMatch;
    }
    return true;
  });

  return (
    <div className="admin-page-container">
      <div className="admin-header-row">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Gestão de Pedidos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Acompanhe o fluxo operacional desde o recebimento até a entrega concluída.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div
        className="card"
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por número, cliente ou telefone..."
            className="form-input"
            style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.5rem 0.85rem' }}
          >
            <option value="all">Todos os Status</option>
            <option value="received">Recebido</option>
            <option value="preparing">Em preparação</option>
            <option value="ready">Pronto</option>
            <option value="out_for_delivery">Saiu para entrega</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>

          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.5rem 0.85rem' }}
          >
            <option value="all">Todas as Modalidades</option>
            <option value="delivery">Entrega em Domicílio</option>
            <option value="pickup">Retirada no Balcão</option>
          </select>
        </div>
      </div>

      {/* ── VISUALIZAÇÃO DESKTOP: TABELA COM HORIZONTAL SCROLL ── */}
      <div className="card admin-desktop-table" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Pedido</th>
                <th style={{ padding: '0.85rem 1rem' }}>Cliente</th>
                <th style={{ padding: '0.85rem 1rem' }}>Tipo</th>
                <th style={{ padding: '0.85rem 1rem' }}>Total</th>
                <th style={{ padding: '0.85rem 1rem' }}>Pagamento</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status Operacional</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum pedido encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  return (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}
                    >
                      <td style={{ padding: '1rem', fontWeight: 800 }}>
                        #{order.order_code}
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.customer_phone}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-brand" style={{ fontSize: '0.75rem' }}>
                          {order.order_type === 'delivery' ? `Entrega (${order.neighborhood_name || 'Bairro'})` : 'Retirada'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800 }}>
                        R$ {order.total_amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <select
                          value={order.payment_status}
                          onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value as PaymentStatus)}
                          className="form-select"
                          style={{
                            fontSize: '0.78rem',
                            padding: '0.3rem 0.5rem',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-full, 9999px)',
                            cursor: 'pointer',
                            backgroundColor:
                              order.payment_status === 'paid'
                                ? 'rgba(34, 197, 94, 0.12)'
                                : 'rgba(234, 179, 8, 0.15)',
                            color: order.payment_status === 'paid' ? '#15803d' : '#a16207',
                            border:
                              order.payment_status === 'paid'
                                ? '1px solid rgba(34, 197, 94, 0.35)'
                                : '1px solid rgba(234, 179, 8, 0.35)',
                          }}
                        >
                          <option value="pending">🟡 Pendente</option>
                          <option value="paid">🟢 Pago</option>
                          <option value="cancelled">🔴 Cancelado</option>
                        </select>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.25rem',
                            fontWeight: 500,
                          }}
                        >
                          {paymentMethodLabels[order.payment_method] || order.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <select
                          value={order.order_status}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                          className="form-select"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', fontWeight: 600 }}
                        >
                          <option value="received">Recebido</option>
                          <option value="preparing">Em preparação</option>
                          <option value="ready">Pronto</option>
                          <option value="out_for_delivery">Saiu para entrega</option>
                          <option value="completed">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          {order.order_status === 'out_for_delivery' && (
                            <button
                              type="button"
                              onClick={() => handleWhatsAppDelivery(order)}
                              className="btn btn-sm"
                              style={{
                                backgroundColor: '#22c55e',
                                color: '#fff',
                                border: 'none',
                                padding: '0.35rem 0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                              }}
                              title="Avisar cliente no WhatsApp que saiu para entrega"
                            >
                              <MessageSquare size={13} />
                              WhatsApp
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="btn btn-secondary btn-sm"
                            title="Ver detalhes do pedido"
                          >
                            <Eye size={14} />
                          </button>
                          <Link
                            href={`/admin/pedidos/${order.order_code}/print`}
                            className="btn btn-outline btn-sm"
                            title="Imprimir Comprovante"
                          >
                            <Printer size={14} />
                          </Link>
                          {order.order_status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order)}
                              className="btn btn-sm"
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#dc2626',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '0.35rem 0.5rem',
                              }}
                              title="Cancelar Pedido"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#b91c1c',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '0.35rem 0.5rem',
                            }}
                            title="Excluir Pedido Definitivamente"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── VISUALIZAÇÃO MOBILE: CARDS RESPONSIVOS DE PEDIDO ── */}
      <div className="admin-mobile-cards">
        {filteredOrders.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum pedido encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredOrders.map((order) => {
            return (
              <div
                key={order.id}
                className="card"
                style={{
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  borderLeft: `5px solid ${
                    order.order_status === 'completed'
                      ? 'var(--success)'
                      : order.order_status === 'cancelled'
                      ? 'var(--danger)'
                      : 'var(--brand-primary)'
                  }`,
                }}
              >
                {/* Linha 1: Pedido #, Horário e Tipo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      #{order.order_code}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="badge badge-brand" style={{ fontSize: '0.72rem', textTransform: 'none' }}>
                    {order.order_type === 'delivery' ? `Entrega (${order.neighborhood_name || 'Bairro'})` : 'Retirada'}
                  </span>
                </div>

                {/* Linha 2: Cliente & Telefone */}
                <div style={{ fontSize: '0.88rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {order.customer_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {order.customer_phone}
                  </div>
                </div>

                {/* Linha 3: Total e Pagamento */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Valor Total</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--brand-primary)' }}>
                      R$ {order.total_amount.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <select
                      value={order.payment_status}
                      onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value as PaymentStatus)}
                      className="form-select"
                      style={{
                        fontSize: '0.78rem',
                        padding: '0.35rem 0.6rem',
                        fontWeight: 700,
                        borderRadius: '9999px',
                        cursor: 'pointer',
                        backgroundColor:
                          order.payment_status === 'paid'
                            ? 'rgba(34, 197, 94, 0.12)'
                            : 'rgba(234, 179, 8, 0.15)',
                        color: order.payment_status === 'paid' ? '#15803d' : '#a16207',
                        border:
                          order.payment_status === 'paid'
                            ? '1px solid rgba(34, 197, 94, 0.35)'
                            : '1px solid rgba(234, 179, 8, 0.35)',
                      }}
                    >
                      <option value="pending">🟡 Pendente</option>
                      <option value="paid">🟢 Pago</option>
                      <option value="cancelled">🔴 Cancelado</option>
                    </select>
                  </div>
                </div>

                {/* Linha 4: Status Operacional */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Status Operacional
                  </label>
                  <select
                    value={order.order_status}
                    onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                    className="form-select"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', fontWeight: 700, width: '100%' }}
                  >
                    <option value="received">Recebido</option>
                    <option value="preparing">Em preparação</option>
                    <option value="ready">Pronto</option>
                    <option value="out_for_delivery">Saiu para entrega</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                {/* Linha 5: Ações do Pedido */}
                {/* Botão WhatsApp Entrega — aparece só quando saiu para entrega */}
                {order.order_status === 'out_for_delivery' && (
                  <button
                    type="button"
                    onClick={() => handleWhatsAppDelivery(order)}
                    className="btn btn-sm"
                    style={{
                      width: '100%',
                      backgroundColor: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      padding: '0.65rem',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <MessageSquare size={16} />
                    Avisar no WhatsApp — Saiu para Entrega 🛵
                  </button>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.2rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', padding: '0.55rem' }}
                  >
                    <Eye size={15} />
                    <span>Ver Detalhes</span>
                  </button>
                  <Link
                    href={`/admin/pedidos/${order.order_code}/print`}
                    target="_blank"
                    className="btn btn-outline btn-sm"
                    style={{ justifyContent: 'center', padding: '0.55rem 0.85rem' }}
                    title="Imprimir Cupom"
                  >
                    <Printer size={15} />
                  </Link>
                  {order.order_status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order)}
                      className="btn btn-sm"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#dc2626',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '0.55rem 0.7rem',
                      }}
                      title="Cancelar Pedido"
                    >
                      <Ban size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(order)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#b91c1c',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '0.55rem 0.7rem',
                    }}
                    title="Excluir Pedido Definitivamente"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Detalhes do Pedido */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-brand">Pedido #{selectedOrder.order_code}</span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.25rem' }}>Detalhes do Pedido</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link
                  href={`/admin/pedidos/${selectedOrder.order_code}/print`}
                  className="btn btn-outline btn-sm"
                >
                  <Printer size={14} />
                  <span>Imprimir</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CLIENTE</h4>
                <p style={{ fontWeight: 600 }}>{selectedOrder.customer_name} • {selectedOrder.customer_phone}</p>
                {selectedOrder.order_type === 'delivery' && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Endereço: {selectedOrder.address_street}, nº {selectedOrder.address_number} - {selectedOrder.neighborhood_name}
                    {selectedOrder.address_complement && ` (${selectedOrder.address_complement})`}
                  </p>
                )}
              </div>

              {/* Status do Pagamento e Status Operacional editáveis no Modal */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    PAGAMENTO ({paymentMethodLabels[selectedOrder.payment_method] || selectedOrder.payment_method})
                  </h4>
                  <select
                    value={selectedOrder.payment_status}
                    onChange={(e) => handleUpdatePaymentStatus(selectedOrder.id, e.target.value as PaymentStatus)}
                    className="form-select"
                    style={{
                      width: '100%',
                      fontSize: '0.82rem',
                      padding: '0.35rem 0.5rem',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor:
                        selectedOrder.payment_status === 'paid'
                          ? 'rgba(34, 197, 94, 0.12)'
                          : 'rgba(234, 179, 8, 0.15)',
                      color: selectedOrder.payment_status === 'paid' ? '#15803d' : '#a16207',
                      border:
                        selectedOrder.payment_status === 'paid'
                          ? '1px solid rgba(34, 197, 94, 0.35)'
                          : '1px solid rgba(234, 179, 8, 0.35)',
                    }}
                  >
                    <option value="pending">🟡 Pendente</option>
                    <option value="paid">🟢 Pago</option>
                    <option value="cancelled">🔴 Cancelado</option>
                  </select>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    STATUS OPERACIONAL
                  </h4>
                  <select
                    value={selectedOrder.order_status}
                    onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    className="form-select"
                    style={{
                      width: '100%',
                      fontSize: '0.82rem',
                      padding: '0.35rem 0.5rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <option value="received">Recebido</option>
                    <option value="preparing">Em preparação</option>
                    <option value="ready">Pronto</option>
                    <option value="out_for_delivery">Saiu para entrega</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ITENS DO PEDIDO</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>R$ {item.total_price.toFixed(2)}</span>
                      </div>
                      {item.selected_options && item.selected_options.length > 0 && (() => {
                        const grouped = item.selected_options.reduce<Record<string, string[]>>((acc, opt) => {
                          const gName = opt.group_name || 'Opção';
                          if (!acc[gName]) acc[gName] = [];
                          const priceStr = opt.price > 0 ? ` (+R$ ${opt.price.toFixed(2)})` : '';
                          const qtyStr = (opt.quantity && opt.quantity > 1) ? `${opt.quantity}x ` : '';
                          acc[gName].push(`${qtyStr}${opt.option_name}${priceStr}`);
                          return acc;
                        }, {});

                        return (
                          <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {Object.entries(grouped).map(([gName, names]) => (
                              <div key={gName} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                                  • {gName}:
                                </strong>{' '}
                                {names.join(', ')}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                <span>Total:</span>
                <span style={{ color: 'var(--brand-primary)' }}>R$ {selectedOrder.total_amount.toFixed(2)}</span>
              </div>

              {/* Botão WhatsApp — Avisar cliente que saiu para entrega */}
              {selectedOrder.order_status === 'out_for_delivery' && (
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={18} color="#16a34a" />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#15803d' }}>
                      Pedido saiu para entrega!
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#166534', margin: 0 }}>
                    Envie uma mensagem profissional avisando o cliente que o pedido já está a caminho.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleWhatsAppDelivery(selectedOrder)}
                    style={{
                      backgroundColor: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.7rem 1rem',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                    }}
                  >
                    <MessageSquare size={16} />
                    Avisar {selectedOrder.customer_name} no WhatsApp 🛵
                  </button>
                </div>
              )}

              {/* Botões operacionais de Cancelar e Excluir */}
              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedOrder.order_status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(selectedOrder)}
                      className="btn btn-sm"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#dc2626',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        fontWeight: 600,
                      }}
                    >
                      <Ban size={14} />
                      <span>Cancelar Pedido</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(selectedOrder)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#b91c1c',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      fontWeight: 600,
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Excluir Pedido</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
