'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Ban } from 'lucide-react';
import { Option, OptionGroup } from '@/lib/types';
import { initialOptionGroups } from '@/lib/data/mockData';

export default function AdminComplementsPage() {
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>(initialOptionGroups);
  const [editingGroup, setEditingGroup] = useState<Partial<OptionGroup>>({
    name: '',
    is_required: false,
    min_options: 0,
    max_options: 1,
    is_active: true,
  });
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Modal para adicionar opção ao grupo
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState(0);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);

  const handleToggleOptionAvailable = (groupId: string, optionId: string) => {
    setOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options?.map((opt) =>
            opt.id === optionId ? { ...opt, is_available: !opt.is_available } : opt
          ),
        };
      })
    );
  };

  const handleSaveOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroupId || !newOptionName.trim()) return;

    const newOpt: Option = {
      id: `opt-${Date.now()}`,
      group_id: targetGroupId,
      name: newOptionName.trim(),
      price: Number(newOptionPrice),
      is_available: true,
      max_quantity_per_item: 1,
      display_order: 10,
    };

    setOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id !== targetGroupId) return g;
        return { ...g, options: [...(g.options || []), newOpt] };
      })
    );

    setIsOptionModalOpen(false);
    setNewOptionName('');
    setNewOptionPrice(0);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup.name?.trim()) return;

    if (editingGroup.id) {
      setOptionGroups((prev) =>
        prev.map((g) => (g.id === editingGroup.id ? ({ ...g, ...editingGroup } as OptionGroup) : g))
      );
    } else {
      const newG: OptionGroup = {
        id: `grp-${Date.now()}`,
        name: editingGroup.name,
        is_required: editingGroup.is_required || false,
        min_options: editingGroup.min_options || 0,
        max_options: editingGroup.max_options || 1,
        display_order: optionGroups.length + 1,
        is_active: true,
        options: [],
      };
      setOptionGroups((prev) => [...prev, newG]);
    }

    setIsGroupModalOpen(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Complementos e Grupos de Opções</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Crie grupos reutilizáveis de tamanhos, frutas, caldas e adicionais nobres para associar aos produtos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingGroup({
              name: '',
              is_required: false,
              min_options: 0,
              max_options: 1,
              is_active: true,
            });
            setIsGroupModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span>Novo Grupo</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {optionGroups.map((group) => (
          <div key={group.id} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{group.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {group.is_required ? 'Obrigatório' : 'Opcional'} • Escolha de {group.min_options} até {group.max_options} opções
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setTargetGroupId(group.id);
                    setIsOptionModalOpen(true);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus size={14} />
                  <span>Adicionar Opção</span>
                </button>
              </div>
            </div>

            {/* Itens do Grupo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {group.options?.map((opt) => (
                <div
                  key={opt.id}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>{opt.name}</span>
                    <span style={{ fontSize: '0.8rem', color: opt.price > 0 ? 'var(--brand-primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                      {opt.price > 0 ? `+ R$ ${opt.price.toFixed(2)}` : 'Incluso (Grátis)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleOptionAvailable(group.id, opt.id)}
                    className={`badge ${opt.is_available ? 'badge-success' : 'badge-danger'}`}
                    style={{ cursor: 'pointer', border: 'none', fontSize: '0.75rem' }}
                  >
                    {opt.is_available ? 'Disponível' : 'Esgotado'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Grupo */}
      {isGroupModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGroupModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Novo Grupo de Opções</h2>
            </div>
            <form onSubmit={handleSaveGroup} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome do Grupo *</label>
                <input
                  type="text"
                  required
                  value={editingGroup.name || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  className="form-input"
                  placeholder="Ex: Frutas Frescas (Até 3 inclusas)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mínimo de escolhas</label>
                  <input
                    type="number"
                    min="0"
                    value={editingGroup.min_options || 0}
                    onChange={(e) => setEditingGroup({ ...editingGroup, min_options: parseInt(e.target.value, 10) || 0 })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Máximo de escolhas</label>
                  <input
                    type="number"
                    min="1"
                    value={editingGroup.max_options || 1}
                    onChange={(e) => setEditingGroup({ ...editingGroup, max_options: parseInt(e.target.value, 10) || 1 })}
                    className="form-input"
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={editingGroup.is_required || false}
                  onChange={(e) => setEditingGroup({ ...editingGroup, is_required: e.target.checked })}
                />
                <span>Seleção Obrigatória pelo cliente</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Criar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Opção */}
      {isOptionModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOptionModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Adicionar Item / Opção</h2>
            </div>
            <form onSubmit={handleSaveOption} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Opção *</label>
                <input
                  type="text"
                  required
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  className="form-input"
                  placeholder="Ex: Creme de Ninho Trufado"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Preço Adicional (R$)</label>
                <input
                  type="number"
                  step="0.10"
                  value={newOptionPrice}
                  onChange={(e) => setNewOptionPrice(parseFloat(e.target.value) || 0)}
                  className="form-input"
                  placeholder="0.00 se for gratuito"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsOptionModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
