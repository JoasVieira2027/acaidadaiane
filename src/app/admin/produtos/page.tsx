'use client';

import React, { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Tag,
  Flame,
  Sparkles,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { Product } from '@/lib/types';
import { initialCategories, initialOptionGroups, initialProducts } from '@/lib/data/mockData';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToggleAvailable = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, is_available: !p.is_available } : p))
    );
  };

  const handleDuplicate = (product: Product) => {
    const duplicated: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      name: `${product.name} (Cópia)`,
      display_order: products.length + 1,
    };
    setProducts((prev) => [...prev, duplicated]);
  };

  const handleDelete = (productId: string) => {
    if (confirm('Tem certeza que deseja excluir este produto do cardápio?')) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || editingProduct.price === undefined) return;

    if (editingProduct.id) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? ({ ...p, ...editingProduct } as Product) : p))
      );
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        category_id: editingProduct.category_id || initialCategories[0].id,
        name: editingProduct.name,
        name_en: editingProduct.name_en || '',
        name_es: editingProduct.name_es || '',
        description: editingProduct.description || '',
        price: Number(editingProduct.price),
        promotional_price: editingProduct.promotional_price ? Number(editingProduct.promotional_price) : null,
        is_promo_active: editingProduct.is_promo_active || false,
        is_featured: editingProduct.is_featured || false,
        is_bestseller: editingProduct.is_bestseller || false,
        is_new: editingProduct.is_new || false,
        is_available: editingProduct.is_available ?? true,
        allow_notes: editingProduct.allow_notes ?? true,
        display_order: editingProduct.display_order || products.length + 1,
        option_groups: editingProduct.option_groups || [],
      };
      setProducts((prev) => [...prev, newProd]);
    }

    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Gerenciamento de Produtos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Cadastre, edite preços normais e promocionais, organize categorias e altere a disponibilidade.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingProduct({
              name: '',
              category_id: initialCategories[0].id,
              price: 15.0,
              is_available: true,
              allow_notes: true,
            });
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span>Novo Produto</span>
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Produto</th>
              <th style={{ padding: '0.85rem 1rem' }}>Categoria</th>
              <th style={{ padding: '0.85rem 1rem' }}>Preço Normal</th>
              <th style={{ padding: '0.85rem 1rem' }}>Promoção</th>
              <th style={{ padding: '0.85rem 1rem' }}>Destaques</th>
              <th style={{ padding: '0.85rem 1rem' }}>Disponibilidade</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const cat = initialCategories.find((c) => c.id === p.category_id);
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>
                    <div>{p.name}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                      {p.description ? p.description.slice(0, 45) + '...' : ''}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{cat?.name || 'Sem categoria'}</td>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>R$ {p.price.toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>
                    {p.is_promo_active && p.promotional_price ? (
                      <span className="badge badge-danger">R$ {p.promotional_price.toFixed(2)}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {p.is_bestseller && (
                        <span title="Mais Vendido">
                          <Flame size={16} style={{ color: 'var(--warning)' }} />
                        </span>
                      )}
                      {p.is_new && (
                        <span title="Novidade">
                          <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
                        </span>
                      )}
                      {p.is_promo_active && (
                        <span title="Promoção">
                          <Tag size={16} style={{ color: 'var(--danger)' }} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleAvailable(p.id)}
                      className={`badge ${p.is_available ? 'badge-success' : 'badge-danger'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                    >
                      {p.is_available ? 'Disponível' : 'Indisponível'}
                    </button>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(p);
                          setIsModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(p)}
                        className="btn btn-secondary btn-sm"
                        title="Duplicar"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Criação / Edição */}
      {isModalOpen && editingProduct && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {editingProduct.id ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="form-input"
                  placeholder="Ex: Copo Supremo de Morango"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome em Inglês (EN)</label>
                  <input
                    type="text"
                    value={editingProduct.name_en || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name_en: e.target.value })}
                    className="form-input"
                    placeholder="Supreme Strawberry Cup"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome em Espanhol (ES)</label>
                  <input
                    type="text"
                    value={editingProduct.name_es || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name_es: e.target.value })}
                    className="form-input"
                    placeholder="Vaso Supremo de Fresa"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Categoria *</label>
                  <select
                    className="form-select"
                    value={editingProduct.category_id || initialCategories[0].id}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                  >
                    {initialCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Preço Normal (R$) *</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={editingProduct.price ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Promoção */}
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingProduct.is_promo_active || false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_promo_active: e.target.checked })}
                  />
                  <span>Ativar Preço Promocional</span>
                </label>
                {editingProduct.is_promo_active && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Preço Promocional (R$)</label>
                    <input
                      type="number"
                      step="0.10"
                      value={editingProduct.promotional_price ?? ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, promotional_price: parseFloat(e.target.value) || null })}
                      className="form-input"
                      placeholder="Valor menor que o preço normal"
                    />
                  </div>
                )}
              </div>

              {/* Destaques */}
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={editingProduct.is_bestseller || false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_bestseller: e.target.checked })}
                  />
                  <span>Mais Vendido</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={editingProduct.is_new || false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_new: e.target.checked })}
                  />
                  <span>Novidade</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={editingProduct.is_available ?? true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_available: e.target.checked })}
                  />
                  <span>Disponível no Cardápio</span>
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Descrição</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="form-textarea"
                  placeholder="Ingredientes e detalhes do produto"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
