'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Ban, X, DollarSign, Loader2 } from 'lucide-react';
import { Option, OptionGroup } from '@/lib/types';
import { initialOptionGroups } from '@/lib/data/mockData';

export default function AdminComplementsPage() {
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>(initialOptionGroups);
  const [loading, setLoading] = useState(true);

  // Estado para Criar/Editar Grupo
  const [editingGroup, setEditingGroup] = useState<Partial<OptionGroup> | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Estado para Criar/Editar Opção
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<Partial<Option> | null>(null);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/option-groups');
      const data = await res.json();
      if (data.success && Array.isArray(data.optionGroups)) {
        setOptionGroups(data.optionGroups);
      }
    } catch (err) {
      console.error('Error loading option groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 1. Alternar Disponibilidade da Opção
  const handleToggleOptionAvailable = async (groupId: string, optionId: string) => {
    const group = optionGroups.find((g) => g.id === groupId);
    const opt = group?.options?.find((o) => o.id === optionId);
    if (!opt) return;

    const updatedOpt = { ...opt, is_available: !opt.is_available };

    setOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options?.map((o) => (o.id === optionId ? updatedOpt : o)),
        };
      })
    );

    try {
      await fetch('/api/option-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-option', groupId, option: updatedOpt }),
      });
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  // 2. Salvar Grupo (Criar ou Editar)
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup?.name?.trim()) return;

    try {
      const res = await fetch('/api/option-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: editingGroup }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }

    setIsGroupModalOpen(false);
    setEditingGroup(null);
  };

  // 3. Excluir Grupo
  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Tem certeza que deseja excluir este grupo inteiro de complementos?')) {
      try {
        await fetch(`/api/option-groups?id=${groupId}`, { method: 'DELETE' });
        await loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // 4. Salvar Opção (Criar ou Editar valor/nome)
  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroupId || !editingOption?.name?.trim()) return;

    try {
      await fetch('/api/option-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-option',
          groupId: targetGroupId,
          option: {
            ...editingOption,
            name: editingOption.name.trim(),
            price: parseFloat(String(editingOption.price || 0).replace(',', '.')) || 0,
          },
        }),
      });
      await loadData();
    } catch (err) {
      console.error(err);
    }

    setIsOptionModalOpen(false);
    setEditingOption(null);
    setTargetGroupId(null);
  };

  // 5. Excluir Opção
  const handleDeleteOption = async (groupId: string, optionId: string) => {
    if (confirm('Deseja excluir este complemento/adicional?')) {
      try {
        await fetch('/api/option-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete-option', groupId, optionId }),
        });
        await loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Complementos e Adicionais</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Crie novos grupos, altere nomes, edite preços dos adicionais e gerencie a disponibilidade de cada item.
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
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.85rem',
              }}
            >
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
                    setEditingOption({ name: '', price: 0 });
                    setIsOptionModalOpen(true);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={14} />
                  <span>Adicionar Adicional</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingGroup(group);
                    setIsGroupModalOpen(true);
                  }}
                  className="btn btn-secondary btn-sm"
                  title="Editar Grupo"
                >
                  <Edit size={14} />
                  <span>Editar Grupo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteGroup(group.id)}
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--danger)' }}
                  title="Excluir Grupo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Lista de Opções do Grupo */}
            {group.options && group.options.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {group.options.map((opt) => (
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
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opt.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          color: opt.price > 0 ? 'var(--brand-primary)' : 'var(--text-muted)',
                          fontWeight: 700,
                        }}
                      >
                        {opt.price > 0 ? `+ R$ ${Number(opt.price).toFixed(2)}` : 'Incluso (Grátis)'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleOptionAvailable(group.id, opt.id)}
                        className={`badge ${opt.is_available ? 'badge-success' : 'badge-danger'}`}
                        style={{ cursor: 'pointer', border: 'none', fontSize: '0.75rem' }}
                      >
                        {opt.is_available ? 'Ativo' : 'Esgotado'}
                      </button>

                      {/* Editar Nome e Valor */}
                      <button
                        type="button"
                        onClick={() => {
                          setTargetGroupId(group.id);
                          setEditingOption(opt);
                          setIsOptionModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.4rem' }}
                        title="Alterar valor ou nome"
                      >
                        <Edit size={13} />
                      </button>

                      {/* Excluir Opção */}
                      <button
                        type="button"
                        onClick={() => handleDeleteOption(group.id, opt.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.4rem', color: 'var(--danger)' }}
                        title="Excluir complemento"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhum complemento adicionado a este grupo ainda. Clique em "Adicionar Adicional".
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Modal Grupo de Opções */}
      {isGroupModalOpen && editingGroup && (
        <div className="modal-overlay" onClick={() => setIsGroupModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {editingGroup.id ? 'Editar Grupo' : 'Novo Grupo de Opções'}
              </h2>
              <button type="button" onClick={() => setIsGroupModalOpen(false)} className="btn btn-secondary btn-sm">
                <X size={18} />
              </button>
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
                  {editingGroup.id ? 'Salvar Alterações' : 'Criar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Opção (Nome e Preço) */}
      {isOptionModalOpen && editingOption && (
        <div className="modal-overlay" onClick={() => setIsOptionModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {editingOption.id ? 'Editar Complemento & Valor' : 'Adicionar Novo Complemento'}
              </h2>
              <button type="button" onClick={() => setIsOptionModalOpen(false)} className="btn btn-secondary btn-sm">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveOption} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome do Complemento / Adicional *</label>
                <input
                  type="text"
                  required
                  value={editingOption.name || ''}
                  onChange={(e) => setEditingOption({ ...editingOption, name: e.target.value })}
                  className="form-input"
                  placeholder="Ex: Creme de Ninho Trufado"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Preço Adicional (R$)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.10"
                    value={editingOption.price ?? 0}
                    onChange={(e) => setEditingOption({ ...editingOption, price: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="0.00 se for incluso ou gratuito"
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Digite 0 se este complemento não tiver custo adicional.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsOptionModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingOption.id ? 'Atualizar Valor' : 'Adicionar ao Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
