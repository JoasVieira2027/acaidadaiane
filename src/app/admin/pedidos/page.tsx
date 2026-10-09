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
} from 'lucide-react';
import { Order, OrderStatus } from '@/lib/types';
import { initialOrders } from '@/lib/data/mockData';

const statusLabels: Record<OrderStatus, { label: string; badge: string }> = {
  received: { label: 'Recebido', badge: 'badge-warning' },
  preparing: { label: 'Em preparação', badge: 'badge-warning' },
  ready: { label: 'Pronto', badge: 'badge-info' },
  out_for_delivery: { label: 'Saiu para entrega', badge: 'badge-info' },
  completed: { label: 'Concluído', badge: 'badge-success' },
  cancelled: { label: 'Cancelado', badge: 'badge-danger' },
};

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
    <div style={{ padding: '2rem', maxWidth: '1200px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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

      {/* Lista de Pedidos */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
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
                const statusMeta = statusLabels[order.order_status] || { label: order.order_status, badge: 'badge-info' };

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
                      <span
                        className={`badge ${order.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
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
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="btn btn-secondary btn-sm"
                          title="Ver detalhes"
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
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
              <Link
                href={`/admin/pedidos/${selectedOrder.order_code}/print`}
                className="btn btn-primary btn-sm"
              >
                <Printer size={14} />
                <span>Imprimir</span>
              </Link>
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

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ITENS DO PEDIDO</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>R$ {item.total_price.toFixed(2)}</span>
                      </div>
                      {item.selected_options?.map((opt, i) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          • {opt.group_name}: {opt.option_name} {opt.price > 0 && `(+R$ ${opt.price.toFixed(2)})`}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                <span>Total:</span>
                <span style={{ color: 'var(--brand-primary)' }}>R$ {selectedOrder.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
