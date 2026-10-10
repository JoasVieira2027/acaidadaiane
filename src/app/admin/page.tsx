'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  DollarSign,
  Clock,
  TrendingUp,
  Printer,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle,
  Power,
  RotateCcw,
  Loader2,
  Trash2,
  Ban,
} from 'lucide-react';
import { Order, StoreCurrentStatus, StoreSettings } from '@/lib/types';
import { initialOrders } from '@/lib/data/mockData';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [storeStatus, setStoreStatus] = useState<StoreCurrentStatus | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchStatus = () => {
    fetch('/api/store-status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStoreStatus(data.status);
          if (data.settings) setSettings(data.settings);
        }
      })
      .catch(() => {});
  };

  const fetchOrders = () => {
    fetch('/api/orders', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      })
      .catch((err) => console.error('Erro ao buscar pedidos no dashboard:', err));
  };

  useEffect(() => {
    fetchStatus();
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleStore = async (mode: 'open' | 'close' | 'auto') => {
    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      const payload: Partial<StoreSettings> = {
        is_manually_opened: mode === 'open',
        is_manually_closed: mode === 'close',
      };

      const res = await fetch('/api/store-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setStoreStatus(data.status);
        if (data.settings) setSettings(data.settings);
        setStatusMessage(
          mode === 'open'
            ? 'Loja ABERTA com sucesso! Clientes já podem fazer pedidos.'
            : mode === 'close'
            ? 'Loja FECHADA com sucesso! Novos pedidos estão bloqueados.'
            : 'Modo automático reativado! A loja seguirá os horários cadastrados.'
        );
      } else {
        alert(data.message || 'Erro ao alterar estado da loja.');
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      alert('Erro de conexão ao alterar status da loja.');
    } finally {
      setIsUpdatingStatus(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!window.confirm(`Deseja realmente CANCELAR o pedido #${order.order_code}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: 'cancelled' }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, order_status: 'cancelled' } : o))
        );
      }
    } catch {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, order_status: 'cancelled' } : o))
      );
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!window.confirm(`ATENÇÃO: Tem certeza que deseja EXCLUIR permanentemente o pedido #${order.order_code}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id && o.order_code !== order.order_code));
      } else {
        alert(data.message || 'Erro ao excluir pedido.');
      }
    } catch (err) {
      console.error('Erro ao excluir pedido:', err);
      alert('Erro de conexão ao excluir pedido.');
    }
  };

  const statusMap: Record<string, { label: string; badge: string }> = {
    received: { label: 'Recebido', badge: 'badge-warning' },
    preparing: { label: 'Em preparação', badge: 'badge-warning' },
    ready: { label: 'Pronto', badge: 'badge-info' },
    out_for_delivery: { label: 'Saiu p/ entrega', badge: 'badge-info' },
    completed: { label: 'Concluído', badge: 'badge-success' },
    cancelled: { label: 'Cancelado', badge: 'badge-danger' },
  };

  // Métricas calculadas
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (o) => o.order_status === 'received' || o.order_status === 'preparing'
  ).length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', width: '100%' }}>
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            Visão Geral da Operação
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Acompanhe pedidos em tempo real, faturamento e disponibilidade do cardápio.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/produtos" className="btn btn-secondary btn-sm">
            <Plus size={16} />
            <span>Cadastrar Produto</span>
          </Link>
          <Link href="/admin/pedidos" className="btn btn-primary btn-sm">
            <ShoppingBag size={16} />
            <span>Gerenciar Pedidos</span>
          </Link>
        </div>
      </div>

      {/* Feedback de Ação */}
      {statusMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: 'var(--success-bg)',
            color: 'var(--success)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: '1px solid var(--success)',
          }}
        >
          <CheckCircle size={18} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Card de Controle Rápido de Status da Loja */}
      {storeStatus && (
        <div
          className="card"
          style={{
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            borderLeft: `6px solid ${storeStatus.isOpen ? 'var(--success)' : 'var(--danger)'}`,
            backgroundColor: storeStatus.isOpen ? 'rgba(34, 197, 94, 0.04)' : 'rgba(239, 68, 68, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 320px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: storeStatus.isOpen ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: storeStatus.isOpen ? 'var(--success)' : 'var(--danger)',
                flexShrink: 0,
              }}
            >
              {storeStatus.isOpen ? <CheckCircle size={26} /> : <AlertCircle size={26} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  {storeStatus.isOpen ? 'Loja ABERTA para Pedidos' : 'Loja FECHADA no Momento'}
                </h3>
                {settings?.is_manually_opened && (
                  <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                    ⚡ Forçado Aberto Manualmente
                  </span>
                )}
                {settings?.is_manually_closed && (
                  <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>
                    🚫 Forçado Fechado Manualmente
                  </span>
                )}
                {!settings?.is_manually_opened && !settings?.is_manually_closed && (
                  <span className="badge" style={{ fontSize: '0.72rem', backgroundColor: 'var(--bg-tertiary)' }}>
                    🕒 Horário Automático Programado
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {storeStatus.message}
              </p>
            </div>
          </div>

          {/* Botões Rápidos de Ação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {!storeStatus.isOpen ? (
              <button
                type="button"
                onClick={() => handleToggleStore('open')}
                disabled={isUpdatingStatus}
                className="btn btn-sm"
                style={{
                  backgroundColor: 'var(--success)',
                  color: '#ffffff',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                }}
              >
                {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                <span>Abrir Loja Agora</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleStore('close')}
                disabled={isUpdatingStatus}
                className="btn btn-sm"
                style={{
                  backgroundColor: 'var(--danger)',
                  color: '#ffffff',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                }}
              >
                {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                <span>Fechar Loja Agora</span>
              </button>
            )}

            {(settings?.is_manually_opened || settings?.is_manually_closed) && (
              <button
                type="button"
                onClick={() => handleToggleStore('auto')}
                disabled={isUpdatingStatus}
                className="btn btn-secondary btn-sm"
                title="Voltar a seguir os horários automáticos cadastrados"
              >
                <RotateCcw size={15} />
                <span>Modo Automático</span>
              </button>
            )}

            <Link href="/admin/horarios" className="btn btn-secondary btn-sm">
              <span>Configurar Horários</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Cards de Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Pedidos Pendentes
            </span>
            <Clock size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{pendingOrders}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aguardando preparo ou envio</span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Total de Pedidos
            </span>
            <ShoppingBag size={18} style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totalOrders}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registrados na plataforma</span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Faturamento Bruto
            </span>
            <DollarSign size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>R$ {totalRevenue.toFixed(2)}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Receita acumulada</span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Ticket Médio
            </span>
            <TrendingUp size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>R$ {averageTicket.toFixed(2)}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Média por pedido</span>
        </div>
      </div>

      {/* Pedidos Recentes */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Pedidos Recentes</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Últimos pedidos recebidos no cardápio
            </p>
          </div>
          <Link href="/admin/pedidos" className="btn btn-outline btn-sm">
            <span>Ver Todos</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Código</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Cliente</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Tipo</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Valor</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((order) => (
                <tr
                  key={order.id}
                  style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}
                >
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700 }}>
                    #{order.order_code}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    <div>{order.customer_name}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.customer_phone}</span>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                      {order.order_type === 'delivery' ? 'Entrega' : 'Retirada'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700 }}>
                    R$ {order.total_amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    <span
                      className={`badge ${statusMap[order.order_status]?.badge || 'badge-info'}`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {statusMap[order.order_status]?.label || order.order_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Link
                        href={`/admin/pedidos/${order.order_code}/print`}
                        className="btn btn-outline btn-sm"
                        title="Imprimir Comprovante"
                      >
                        <Printer size={13} />
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
                            padding: '0.3rem 0.45rem',
                          }}
                          title="Cancelar Pedido"
                        >
                          <Ban size={13} />
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
                          padding: '0.3rem 0.45rem',
                        }}
                        title="Excluir Pedido Permanentemente"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
