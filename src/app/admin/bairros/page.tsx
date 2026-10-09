'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Neighborhood } from '@/lib/types';
import { initialNeighborhoods } from '@/lib/data/mockData';

export default function AdminNeighborhoodsPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(initialNeighborhoods);
  const [editingNb, setEditingNb] = useState<Partial<Neighborhood> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToggleActive = (id: string) => {
    setNeighborhoods((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_active: !n.is_active } : n))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover este bairro?')) {
      setNeighborhoods((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNb?.name || editingNb.delivery_fee === undefined) return;

    if (editingNb.id) {
      setNeighborhoods((prev) =>
        prev.map((n) => (n.id === editingNb.id ? ({ ...n, ...editingNb } as Neighborhood) : n))
      );
    } else {
      const newNb: Neighborhood = {
        id: `nb-${Date.now()}`,
        name: editingNb.name,
        delivery_fee: Number(editingNb.delivery_fee),
        min_order_amount: Number(editingNb.min_order_amount || 0),
        free_delivery_threshold: editingNb.free_delivery_threshold ? Number(editingNb.free_delivery_threshold) : null,
        is_active: editingNb.is_active ?? true,
        display_order: neighborhoods.length + 1,
      };
      setNeighborhoods((prev) => [...prev, newNb]);
    }

    setIsModalOpen(false);
    setEditingNb(null);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Bairros e Taxas de Entrega</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Configure taxas de frete por região, pedido mínimo e regras de entrega grátis.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingNb({ name: '', delivery_fee: 5.0, min_order_amount: 20.0, is_active: true });
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span>Novo Bairro</span>
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Bairro</th>
              <th style={{ padding: '0.85rem 1rem' }}>Taxa de Entrega</th>
              <th style={{ padding: '0.85rem 1rem' }}>Pedido Mínimo</th>
              <th style={{ padding: '0.85rem 1rem' }}>Frete Grátis Acima de</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {neighborhoods.map((n) => (
              <tr key={n.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontWeight: 700 }}>{n.name}</td>
                <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  R$ {n.delivery_fee.toFixed(2)}
                </td>
                <td style={{ padding: '1rem' }}>
                  {n.min_order_amount > 0 ? `R$ ${n.min_order_amount.toFixed(2)}` : 'Sem mínimo'}
                </td>
                <td style={{ padding: '1rem' }}>
                  {n.free_delivery_threshold ? (
                    <span className="badge badge-success">R$ {n.free_delivery_threshold.toFixed(2)}</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Não configurado</span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(n.id)}
                    className={`badge ${n.is_active ? 'badge-success' : 'badge-danger'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {n.is_active ? 'Ativo' : 'Desativado'}
                  </button>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNb(n);
                        setIsModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
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

      {/* Modal Bairro */}
      {isModalOpen && editingNb && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {editingNb.id ? 'Editar Bairro' : 'Cadastrar Bairro'}
              </h2>
            </div>
            <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome do Bairro *</label>
                <input
                  type="text"
                  required
                  value={editingNb.name || ''}
                  onChange={(e) => setEditingNb({ ...editingNb, name: e.target.value })}
                  className="form-input"
                  placeholder="Ex: Boa Viagem"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Taxa de Entrega (R$) *</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={editingNb.delivery_fee ?? ''}
                    onChange={(e) => setEditingNb({ ...editingNb, delivery_fee: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Pedido Mínimo (R$)</label>
                  <input
                    type="number"
                    step="1.00"
                    value={editingNb.min_order_amount ?? ''}
                    onChange={(e) => setEditingNb({ ...editingNb, min_order_amount: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Valor para Entrega Grátis (R$ opcional)</label>
                <input
                  type="number"
                  step="1.00"
                  value={editingNb.free_delivery_threshold ?? ''}
                  onChange={(e) => setEditingNb({ ...editingNb, free_delivery_threshold: parseFloat(e.target.value) || null })}
                  className="form-input"
                  placeholder="Deixe em branco se não houver"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Bairro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
