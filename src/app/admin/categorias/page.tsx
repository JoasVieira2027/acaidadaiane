'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Category } from '@/lib/types';
import { initialCategories } from '@/lib/data/mockData';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToggleActive = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover esta categoria?')) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setCategories(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    if (editingCategory.id) {
      setCategories((prev) =>
        prev.map((c) => (c.id === editingCategory.id ? ({ ...c, ...editingCategory } as Category) : c))
      );
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: editingCategory.name,
        name_en: editingCategory.name_en || '',
        name_es: editingCategory.name_es || '',
        description: editingCategory.description || '',
        display_order: categories.length + 1,
        is_active: editingCategory.is_active ?? true,
      };
      setCategories((prev) => [...prev, newCat]);
    }

    setIsModalOpen(false);
    setEditingCategory(null);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Categorias do Cardápio</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Organize a estrutura e a ordem de exibição das categorias dinâmicas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingCategory({ name: '', is_active: true });
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span>Nova Categoria</span>
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Ordem</th>
              <th style={{ padding: '0.85rem 1rem' }}>Nome da Categoria</th>
              <th style={{ padding: '0.85rem 1rem' }}>Descrição</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, index) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem', borderRadius: '4px' }}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={index === categories.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem', borderRadius: '4px' }}
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: 700 }}>{c.name}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                  {c.description ? c.description.slice(0, 50) + '...' : '-'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(c.id)}
                    className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {c.is_active ? 'Ativa' : 'Desativada'}
                  </button>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(c);
                        setIsModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
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

      {/* Modal Categoria */}
      {isModalOpen && editingCategory && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {editingCategory.id ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
            </div>

            <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Categoria (PT) *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="form-input"
                  placeholder="Ex: Tigelas Especiais"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome em Inglês (EN)</label>
                  <input
                    type="text"
                    value={editingCategory.name_en || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name_en: e.target.value })}
                    className="form-input"
                    placeholder="Special Bowls"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome em Espanhol (ES)</label>
                  <input
                    type="text"
                    value={editingCategory.name_es || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name_es: e.target.value })}
                    className="form-input"
                    placeholder="Bowls Especiales"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Descrição</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
