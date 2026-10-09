'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Tag, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Coupon } from '@/lib/types';
import { initialCoupons } from '@/lib/data/mockData';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/coupons', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.coupons)) {
        setCoupons(data.coupons);
      }
    } catch (err) {
      console.error('Erro ao buscar cupons:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleToggleActive = async (id: string) => {
    const target = coupons.find((c) => c.id === id);
    if (!target) return;
    const updated = { ...target, is_active: !target.is_active };

    setCoupons((prev) => prev.map((c) => (c.id === id ? updated : c)));

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon: updated }),
      });
      const data = await res.json();
      if (!data.success) {
        showFeedback('Erro ao atualizar status do cupom', 'error');
        await loadCoupons();
      }
    } catch {
      showFeedback('Erro de conexão ao atualizar cupom', 'error');
      await loadCoupons();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este cupom?')) return;
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/coupons?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showFeedback('Cupom excluído com sucesso!');
      } else {
        showFeedback('Erro ao excluir cupom', 'error');
        await loadCoupons();
      }
    } catch {
      showFeedback('Erro de conexão ao excluir cupom', 'error');
      await loadCoupons();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon?.code || editingCoupon.discount_value === undefined) return;

    setIsSaving(true);
    const newCp: Coupon = {
      id: editingCoupon.id || `cp-${Date.now()}`,
      code: editingCoupon.code.toUpperCase().trim(),
      discount_type: editingCoupon.discount_type || 'percentage',
      discount_value: Number(editingCoupon.discount_value),
      min_order_amount: Number(editingCoupon.min_order_amount || 0),
      max_uses: editingCoupon.max_uses ? Number(editingCoupon.max_uses) : null,
      used_count: editingCoupon.used_count || 0,
      is_active: editingCoupon.is_active ?? true,
    };

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon: newCp }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Cupom salvo com sucesso!');
        setIsModalOpen(false);
        setEditingCoupon(null);
        await loadCoupons();
      } else {
        showFeedback(data.message || 'Erro ao salvar cupom', 'error');
      }
    } catch {
      showFeedback('Erro de conexão ao salvar cupom', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', width: '100%' }}>
      {feedbackMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            marginBottom: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: feedbackMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${feedbackMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: feedbackMsg.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
          }}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Cupons de Desconto</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Cadastre códigos promocionais em porcentagem ou valor fixo com regras de valor mínimo e limite de uso.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingCoupon({
              code: '',
              discount_type: 'percentage',
              discount_value: 10,
              min_order_amount: 25,
              is_active: true,
            });
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span>Novo Cupom</span>
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Código</th>
              <th style={{ padding: '0.85rem 1rem' }}>Desconto</th>
              <th style={{ padding: '0.85rem 1rem' }}>Pedido Mínimo</th>
              <th style={{ padding: '0.85rem 1rem' }}>Usos / Limite</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((cp) => (
              <tr key={cp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                  {cp.code}
                </td>
                <td style={{ padding: '1rem', fontWeight: 700 }}>
                  {cp.discount_type === 'percentage'
                    ? `${cp.discount_value}% de desconto`
                    : `R$ ${cp.discount_value.toFixed(2)} de desconto`}
                </td>
                <td style={{ padding: '1rem' }}>
                  {cp.min_order_amount > 0 ? `R$ ${cp.min_order_amount.toFixed(2)}` : 'Sem mínimo'}
                </td>
                <td style={{ padding: '1rem' }}>
                  {cp.used_count} / {cp.max_uses ? cp.max_uses : 'Ilimitado'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(cp.id)}
                    className={`badge ${cp.is_active ? 'badge-success' : 'badge-danger'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {cp.is_active ? 'Ativo' : 'Desativado'}
                  </button>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCoupon(cp);
                        setIsModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cp.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--danger)' }}
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Cupom */}
      {isModalOpen && editingCoupon && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {editingCoupon.id ? 'Editar Cupom' : 'Cadastrar Cupom'}
              </h2>
            </div>
            <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Código do Cupom *</label>
                <input
                  type="text"
                  required
                  value={editingCoupon.code || ''}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  className="form-input"
                  placeholder="Ex: DAIANE10"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de Desconto</label>
                  <select
                    className="form-select"
                    value={editingCoupon.discount_type || 'percentage'}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discount_type: e.target.value as any })}
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Valor do Desconto *</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={editingCoupon.discount_value ?? ''}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Pedido Mínimo (R$)</label>
                  <input
                    type="number"
                    step="1.00"
                    value={editingCoupon.min_order_amount ?? ''}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, min_order_amount: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Limite de Usos (Opcional)</label>
                  <input
                    type="number"
                    value={editingCoupon.max_uses ?? ''}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, max_uses: parseInt(e.target.value, 10) || null })}
                    className="form-input"
                    placeholder="Sem limite"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  <span>{isSaving ? 'Salvando...' : 'Salvar Cupom'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
