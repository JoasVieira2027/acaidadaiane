'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { Coupon } from '@/lib/types';
import { initialCoupons } from '@/lib/data/mockData';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToggleActive = (id: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover este cupom?')) {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon?.code || editingCoupon.discount_value === undefined) return;

    if (editingCoupon.id) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === editingCoupon.id ? ({ ...c, ...editingCoupon } as Coupon) : c))
      );
    } else {
      const newCp: Coupon = {
        id: `cp-${Date.now()}`,
        code: editingCoupon.code.toUpperCase().trim(),
        discount_type: editingCoupon.discount_type || 'percentage',
        discount_value: Number(editingCoupon.discount_value),
        min_order_amount: Number(editingCoupon.min_order_amount || 0),
        max_uses: editingCoupon.max_uses ? Number(editingCoupon.max_uses) : null,
        used_count: 0,
        is_active: editingCoupon.is_active ?? true,
      };
      setCoupons((prev) => [...prev, newCp]);
    }

    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', width: '100%' }}>
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
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Cupom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
