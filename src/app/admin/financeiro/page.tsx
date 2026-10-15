'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Calendar,
  Plus,
  Trash2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Layers,
  Sparkles,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Order, Product, Expense, ExpenseCategory } from '@/lib/types';
import { initialOrders, initialExpenses, initialProducts } from '@/lib/data/mockData';

type PeriodFilter = 'today' | '7days' | 'month' | 'all';

export default function AdminFinanceiroPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [loading, setLoading] = useState(false);

  // Modal de Nova Despesa
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpCategory, setNewExpCategory] = useState<ExpenseCategory>('variavel');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpDate, setNewExpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newExpNotes, setNewExpNotes] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Carrega dados da API
  const loadData = async () => {
    setLoading(true);
    try {
      const [resOrders, resProds, resExp] = await Promise.all([
        fetch('/api/orders', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/products', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/expenses', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      ]);

      if (resOrders?.success && Array.isArray(resOrders.orders)) {
        setOrders(resOrders.orders);
      }
      if (resProds?.success && Array.isArray(resProds.products)) {
        setProducts(resProds.products);
      }
      if (resExp?.success && Array.isArray(resExp.expenses)) {
        setExpenses(resExp.expenses);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtra por período
  const { filteredOrders, filteredExpenses, periodLabel } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let orderFilter = (dateStr: string) => true;
    let expFilter = (dateStr: string) => true;
    let label = 'Todo o Período';

    if (period === 'today') {
      label = 'Hoje';
      orderFilter = (d) => new Date(d).getTime() >= startOfToday;
      expFilter = (d) => new Date(d).getTime() >= startOfToday;
    } else if (period === '7days') {
      label = 'Últimos 7 dias';
      orderFilter = (d) => new Date(d).getTime() >= startOf7Days;
      expFilter = (d) => new Date(d).getTime() >= startOf7Days;
    } else if (period === 'month') {
      label = 'Este Mês';
      orderFilter = (d) => new Date(d).getTime() >= startOfMonth;
      expFilter = (d) => new Date(d).getTime() >= startOfMonth;
    }

    const fOrders = orders.filter((o) => o.order_status !== 'cancelled' && orderFilter(o.created_at));
    const fExpenses = expenses.filter((e) => expFilter(e.date));

    return { filteredOrders: fOrders, filteredExpenses: fExpenses, periodLabel: label };
  }, [orders, expenses, period]);

  // Mapa de produtos para acesso rápido aos custos unitários
  const productCostMap = useMemo(() => {
    const map = new Map<string, { totalUnitCost: number; name: string }>();
    products.forEach((p) => {
      const cc = p.cost_config;
      const unitCost = cc
        ? (Number(cc.ingredient_cost) || 0) +
          (Number(cc.packaging_cost) || 0) +
          (Number(cc.other_cost) || 0) +
          (Number(cc.complement_cost) || 0)
        : (Number(p.price) || 0) * 0.4; // Estimativa padrão de 40% se não configurado
      map.set(p.id, { totalUnitCost: unitCost, name: p.name });
    });
    return map;
  }, [products]);

  // Cálculos financeiros
  const metrics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
    const orderCount = filteredOrders.length;
    const avgTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Custo estimado dos produtos vendidos
    let totalProductCost = 0;
    const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
    const sizeSalesMap = new Map<string, { qty: number; revenue: number }>();

    filteredOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item) => {
          const qty = Number(item.quantity) || 1;
          const revenue = Number(item.total_price) || 0;
          const pInfo = item.product_id ? productCostMap.get(item.product_id) : null;
          const cost = pInfo ? pInfo.totalUnitCost * qty : revenue * 0.4;
          totalProductCost += cost;

          // Ranking produtos
          const pKey = item.product_name || 'Produto sem nome';
          const cur = productSalesMap.get(pKey) || { name: pKey, qty: 0, revenue: 0 };
          cur.qty += qty;
          cur.revenue += revenue;
          productSalesMap.set(pKey, cur);

          // Identificar tamanho (ex: copo 300ml, 500ml, 700ml)
          const lowerName = item.product_name.toLowerCase();
          let detectedSize = 'Outro';
          if (lowerName.includes('300ml') || lowerName.includes('pequeno') || lowerName.includes(' p ')) detectedSize = '300ml (P)';
          else if (lowerName.includes('500ml') || lowerName.includes('médio') || lowerName.includes(' m ')) detectedSize = '500ml (M)';
          else if (lowerName.includes('700ml') || lowerName.includes('grande') || lowerName.includes(' g ')) detectedSize = '700ml (G)';
          else if (lowerName.includes('600ml')) detectedSize = '600ml (Tigela)';
          else if (lowerName.includes('1l') || lowerName.includes('1 litro')) detectedSize = '1 Litro';

          if (Array.isArray(item.selected_options)) {
            const sizeOpt = item.selected_options.find(
              (opt) => opt.group_name?.toLowerCase().includes('tamanho')
            );
            if (sizeOpt) detectedSize = sizeOpt.option_name;
          }

          const curSize = sizeSalesMap.get(detectedSize) || { qty: 0, revenue: 0 };
          curSize.qty += qty;
          curSize.revenue += revenue;
          sizeSalesMap.set(detectedSize, curSize);
        });
      }
    });

    // Despesas operacionais do período
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    // Lucro estimado e margem
    const estimatedProfit = totalRevenue - totalProductCost - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0;

    // Top produtos
    const topProducts = Array.from(productSalesMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Top tamanhos
    const topSizes = Array.from(sizeSalesMap.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => b.qty - a.qty);

    return {
      totalRevenue,
      orderCount,
      avgTicket,
      totalProductCost,
      totalExpenses,
      estimatedProfit,
      profitMargin,
      topProducts,
      topSizes,
    };
  }, [filteredOrders, filteredExpenses, productCostMap]);

  // Dados para o Gráfico de Evolução de Vendas (Últimos 7 dias ou por dia)
  const chartData = useMemo(() => {
    const daysMap = new Map<string, { label: string; revenue: number; orders: number }>();
    const daysToShow = 7;
    const now = new Date();

    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      daysMap.set(key, { label: `${weekday.toUpperCase()} ${dayNum}`, revenue: 0, orders: 0 });
    }

    orders.forEach((o) => {
      if (o.order_status !== 'cancelled' && o.created_at) {
        const key = o.created_at.split('T')[0];
        if (daysMap.has(key)) {
          const item = daysMap.get(key)!;
          item.revenue += Number(o.total_amount) || 0;
          item.orders += 1;
        }
      }
    });

    const list = Array.from(daysMap.values());
    const maxRev = Math.max(...list.map((d) => d.revenue), 100);
    return { list, maxRev };
  }, [orders]);

  // Salvar Despesa
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle.trim() || !newExpAmount) return;
    setSavingExpense(true);
    setFeedbackMsg(null);

    const parsedAmount = parseFloat(newExpAmount.replace(',', '.').trim()) || 0;

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense: {
            title: newExpTitle.trim(),
            category: newExpCategory,
            amount: parsedAmount,
            date: newExpDate,
            notes: newExpNotes.trim() || null,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.expense) {
        setExpenses((prev) => [data.expense, ...prev.filter((item) => item.id !== data.expense.id)]);
        setNewExpTitle('');
        setNewExpAmount('');
        setNewExpNotes('');
        setShowExpenseModal(false);
        setFeedbackMsg('Despesa cadastrada com sucesso!');
        setTimeout(() => setFeedbackMsg(null), 3500);
      } else {
        alert(data.message || 'Erro ao salvar despesa.');
      }
    } catch {
      alert('Erro de conexão ao salvar despesa.');
    } finally {
      setSavingExpense(false);
    }
  };

  // Excluir Despesa
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Deseja realmente remover esta despesa?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      } else {
        alert('Erro ao excluir despesa.');
      }
    } catch {
      alert('Erro ao conectar.');
    }
  };

  const categoryLabels: Record<ExpenseCategory, { label: string; badge: string }> = {
    fixa: { label: 'Custo Fixo', badge: 'badge-info' },
    variavel: { label: 'Variável', badge: 'badge-warning' },
    ingredientes: { label: 'Ingredientes', badge: 'badge-brand' },
    embalagens: { label: 'Embalagens', badge: 'badge-info' },
    outros: { label: 'Outros', badge: 'badge' },
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
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            Gestão Financeira & Resultados
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Acompanhe faturamento, custos de produtos, despesas e lucro real do negócio.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 700 }}
          >
            <Plus size={16} />
            <span>Lançar Despesa</span>
          </button>
          <Link href="/admin/produtos" className="btn btn-outline btn-sm">
            <Package size={16} />
            <span>Configurar Custos</span>
          </Link>
        </div>
      </div>

      {/* Feedback message */}
      {feedbackMsg && (
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
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Barra de Filtro de Período */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          marginBottom: '2rem',
          overflowX: 'auto',
        }}
      >
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            padding: '0.4rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Calendar size={14} />
          <span>Período:</span>
        </span>
        {(
          [
            { id: 'today', label: 'Hoje' },
            { id: '7days', label: 'Últimos 7 dias' },
            { id: 'month', label: 'Este Mês' },
            { id: 'all', label: 'Todo o Período' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPeriod(item.id)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: period === item.id ? 'var(--brand-primary)' : 'transparent',
              color: period === item.id ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: period === item.id ? 800 : 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Grid de Cards Métricas Financeiras */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Faturamento */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--brand-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Faturamento ({periodLabel})</span>
            <DollarSign size={18} style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            R$ {metrics.totalRevenue.toFixed(2).replace('.', ',')}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{metrics.orderCount} pedidos confirmados</span>
        </div>

        {/* Ticket Médio */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Ticket Médio</span>
            <TrendingUp size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            R$ {metrics.avgTicket.toFixed(2).replace('.', ',')}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Média gasta por cliente</span>
        </div>

        {/* Custo dos Produtos */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f97316' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Custo dos Produtos</span>
            <Package size={18} style={{ color: '#f97316' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f97316' }}>
            R$ {metrics.totalProductCost.toFixed(2).replace('.', ',')}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ingredientes & embalagens dos pedidos</span>
        </div>

        {/* Despesas Operacionais */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Despesas Lançadas</span>
            <CreditCard size={18} style={{ color: 'var(--danger)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--danger)' }}>
            R$ {metrics.totalExpenses.toFixed(2).replace('.', ',')}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filteredExpenses.length} despesas no período</span>
        </div>

        {/* Lucro Estimado Líquido */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: metrics.estimatedProfit >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${metrics.estimatedProfit >= 0 ? 'var(--success)' : 'var(--danger)'}`,
            borderLeft: `5px solid ${metrics.estimatedProfit >= 0 ? 'var(--success)' : 'var(--danger)'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: metrics.estimatedProfit >= 0 ? 'var(--success)' : 'var(--danger)',
              }}
            >
              Lucro Estimado Líquido
            </span>
            {metrics.estimatedProfit >= 0 ? (
              <ArrowUpRight size={18} style={{ color: 'var(--success)' }} />
            ) : (
              <ArrowDownRight size={18} style={{ color: 'var(--danger)' }} />
            )}
          </div>
          <div
            style={{
              fontSize: '1.85rem',
              fontWeight: 900,
              color: metrics.estimatedProfit >= 0 ? 'var(--success)' : 'var(--danger)',
            }}
          >
            R$ {metrics.estimatedProfit.toFixed(2).replace('.', ',')}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Margem Líquida:{' '}
            <strong style={{ color: metrics.estimatedProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {metrics.profitMargin.toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução das Vendas (SVG responsivo) */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Evolução de Vendas (Últimos 7 Dias)</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Faturamento diário registrado na loja
            </p>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
            Pico: R$ {chartData.maxRev.toFixed(2).replace('.', ',')}
          </div>
        </div>

        {/* Barras do Gráfico */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.75rem',
            height: '180px',
            paddingTop: '1rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {chartData.list.map((day, idx) => {
            const pct = Math.max(8, Math.min(100, (day.revenue / chartData.maxRev) * 100));
            const isZero = day.revenue === 0;

            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                {/* Valor no topo da barra */}
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: isZero ? 'var(--text-muted)' : 'var(--brand-primary)',
                    marginBottom: '0.35rem',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isZero ? '—' : `R$ ${day.revenue.toFixed(0)}`}
                </span>

                {/* Barra */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '48px',
                    height: `${pct}%`,
                    backgroundColor: isZero ? 'var(--bg-tertiary)' : 'var(--brand-primary)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.4s ease',
                    boxShadow: !isZero ? '0 2px 6px rgba(88, 28, 135, 0.25)' : 'none',
                  }}
                  title={`${day.label}: R$ ${day.revenue.toFixed(2)} (${day.orders} pedidos)`}
                />

                {/* Rótulo do dia */}
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.5rem',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Rankings (Produtos mais vendidos e Tamanhos mais vendidos) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Produtos Mais Vendidos */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Sparkles size={18} style={{ color: 'var(--brand-primary)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Produtos Mais Vendidos</h2>
          </div>

          {metrics.topProducts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum pedido no período selecionado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {metrics.topProducts.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: idx === 0 ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                        color: idx === 0 ? '#ffffff' : 'var(--text-muted)',
                        fontWeight: 900,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.name}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.qty} {p.qty === 1 ? 'unidade vendida' : 'unidades vendidas'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--brand-primary)', whiteSpace: 'nowrap' }}>
                    R$ {p.revenue.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tamanhos / Categorias Mais Vendidos */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Layers size={18} style={{ color: 'var(--brand-primary)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Tamanhos Mais Populares</h2>
          </div>

          {metrics.topSizes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum dado disponível no período.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {metrics.topSizes.map((s, idx) => {
                const totalSizesQty = metrics.topSizes.reduce((acc, x) => acc + x.qty, 0);
                const sharePct = totalSizesQty > 0 ? Math.round((s.qty / totalSizesQty) * 100) : 0;

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.label}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        <strong>{s.qty} un</strong> ({sharePct}%) • R$ {s.revenue.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    {/* Barra de progresso */}
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${sharePct}%`,
                          backgroundColor:
                            idx === 0 ? 'var(--brand-primary)' : idx === 1 ? 'var(--info)' : 'var(--success)',
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Seção: Despesas Operacionais Registradas */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Despesas Operacionais ({periodLabel})</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Controle de custos fixos, embalagens, frutas e manutenção
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} />
            <span>Adicionar Despesa</span>
          </button>
        </div>

        {filteredExpenses.length === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              border: '2px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Nenhuma despesa lançada para o período selecionado.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Descrição</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Categoria</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Data</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Valor</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}
                  >
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{exp.title}</div>
                      {exp.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp.notes}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span className={`badge ${categoryLabels[exp.category]?.badge || 'badge-info'}`} style={{ fontSize: '0.75rem' }}>
                        {categoryLabels[exp.category]?.label || exp.category}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)' }}>
                      {new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 800, color: 'var(--danger)' }}>
                      - R$ {Number(exp.amount).toFixed(2).replace('.', ',')}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="btn btn-sm"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#dc2626',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          padding: '0.35rem 0.5rem',
                        }}
                        title="Excluir Despesa"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Nova Despesa */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', width: '90%', padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Nova Despesa Operacional</h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '50%', padding: '0.3rem' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Descrição da Despesa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conta de Luz, Embalagens 500ml, Morango Ceasa"
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Valor (R$) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0,00"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Data da Despesa</label>
                  <input
                    type="date"
                    required
                    value={newExpDate}
                    onChange={(e) => setNewExpDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Categoria</label>
                <select
                  value={newExpCategory}
                  onChange={(e) => setNewExpCategory(e.target.value as ExpenseCategory)}
                  className="form-select"
                >
                  <option value="fixa">Custo Fixo (Aluguel, Luz, Internet)</option>
                  <option value="ingredientes">Ingredientes / Insumos (Açaí, frutas, leite)</option>
                  <option value="embalagens">Embalagens & Descartáveis</option>
                  <option value="variavel">Custo Variável (Gás, taxas, entregas extras)</option>
                  <option value="outros">Outros / Manutenção</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Observações adicionais (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Fornecedor, nota fiscal ou detalhes"
                  value={newExpNotes}
                  onChange={(e) => setNewExpNotes(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 800 }}
                >
                  {savingExpense ? 'Salvando...' : 'Salvar Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
