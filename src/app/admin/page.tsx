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
} from 'lucide-react';
import { Order, StoreCurrentStatus } from '@/lib/types';
import { initialOrders } from '@/lib/data/mockData';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [storeStatus, setStoreStatus] = useState<StoreCurrentStatus | null>(null);

  useEffect(() => {
    fetch('/api/store-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStoreStatus(data.status);
      })
      .catch(() => {});
  }, []);

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

      {/* Alerta de Status da Loja */}
      {storeStatus && (
        <div
          className="card"
          style={{
            padding: '1.25rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: `4px solid ${storeStatus.isOpen ? 'var(--success)' : 'var(--danger)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {storeStatus.isOpen ? (
              <CheckCircle size={22} style={{ color: 'var(--success)' }} />
            ) : (
              <AlertCircle size={22} style={{ color: 'var(--danger)' }} />
            )}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                {storeStatus.isOpen ? 'Loja Aberta para Pedidos' : 'Loja Fechada no Momento'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {storeStatus.message}
              </p>
            </div>
          </div>

          <Link href="/admin/horarios" className="btn btn-secondary btn-sm">
            <span>Ajustar Horários</span>
            <ChevronRight size={14} />
          </Link>
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
                      className={`badge ${
                        order.order_status === 'completed'
                          ? 'badge-success'
                          : order.order_status === 'cancelled'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {order.order_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                    <Link
                      href={`/admin/pedidos/${order.order_code}/print`}
                      className="btn btn-secondary btn-sm"
                      title="Imprimir Pedido"
                    >
                      <Printer size={14} />
                      <span>Imprimir</span>
                    </Link>
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
