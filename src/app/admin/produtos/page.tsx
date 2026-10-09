'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Copy, Tag, Flame, Sparkles, X,
  ImageIcon, Upload, Link2, Link2Off, ChevronDown, ChevronUp,
  AlertCircle, Check, Loader2,
} from 'lucide-react';
import { Product, Category, OptionGroup } from '@/lib/types';

type ProductWithMeta = Product & { category_name?: string; option_group_ids?: string[] };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithMeta[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allGroups, setAllGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductWithMeta> | null>(null);
  const [activeSection, setActiveSection] = useState<'info' | 'image' | 'groups'>('info');

  // Imagem
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grupos associados ao produto editado
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Copiar grupos de outro produto
  const [copyFromProductId, setCopyFromProductId] = useState('');

  // Criar grupo/complemento direto pelo modal
  const [showQuickGroupForm, setShowQuickGroupForm] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState('');
  const [quickGroupRequired, setQuickGroupRequired] = useState(false);
  const [quickGroupMin, setQuickGroupMin] = useState(0);
  const [quickGroupMax, setQuickGroupMax] = useState(1);
  const [quickOptionName, setQuickOptionName] = useState('');
  const [quickOptionPrice, setQuickOptionPrice] = useState('0');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        setCategories(data.categories || []);
        setAllGroups(data.optionGroups || []);
      }
    } catch {
      setError('Erro ao carregar produtos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Abre modal para novo produto
  const openCreate = () => {
    setEditingProduct({
      name: '', category_id: categories[0]?.id || '',
      price: 15, is_available: true, allow_notes: true,
      is_promo_active: false, is_bestseller: false, is_new: false, is_featured: false,
    });
    setSelectedGroupIds([]);
    setImagePreview(null);
    setImageFile(null);
    setImageError(null);
    setActiveSection('info');
    setIsModalOpen(true);
  };

  // Abre modal para editar produto existente
  const openEdit = (p: ProductWithMeta) => {
    setEditingProduct({ ...p });
    const gids = p.option_groups?.map((g: any) => g.id) || [];
    setSelectedGroupIds(gids);
    setImagePreview(p.image_url || null);
    setImageFile(null);
    setImageError(null);
    setActiveSection('info');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setImagePreview(null);
    setImageFile(null);
  };

  // ── Imagem ──────────────────────────────────────────────
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
          else { width = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.82);
      };
      img.src = url;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setImageError('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Arquivo muito grande. Máximo 5MB antes da compressão.');
      return;
    }

    // Comprimir antes de mostrar preview
    const compressed = await compressImage(file);
    setImageFile(compressed);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(compressed);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setEditingProduct((prev) => prev ? { ...prev, image_url: '' } : prev);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Grupos ──────────────────────────────────────────────
  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleCopyGroups = () => {
    if (!copyFromProductId) return;
    const src = products.find((p) => p.id === copyFromProductId);
    if (!src) return;
    const srcGroupIds = src.option_groups?.map((g: any) => g.id) || [];
    setSelectedGroupIds((prev) => Array.from(new Set([...prev, ...srcGroupIds])));
    setCopyFromProductId('');
  };

  const handleCreateQuickGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const res = await fetch('/api/option-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: {
            name: quickGroupName.trim(),
            is_required: quickGroupRequired,
            min_options: Number(quickGroupMin) || 0,
            max_options: Number(quickGroupMax) || 1,
            is_active: true,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.group) {
        const newGroupId = data.group.id;
        // Se preencheu uma opção inicial, adiciona
        if (quickOptionName.trim()) {
          await fetch('/api/option-groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save-option',
              groupId: newGroupId,
              option: {
                name: quickOptionName.trim(),
                price: Number(quickOptionPrice) || 0,
                is_available: true,
              },
            }),
          });
        }
        await loadData();
        setSelectedGroupIds((prev) => [...prev, newGroupId]);
        setQuickGroupName('');
        setQuickOptionName('');
        setQuickOptionPrice('0');
        setShowQuickGroupForm(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingGroup(false);
    }
  };

  // ── Salvar ──────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || editingProduct.price === undefined) return;
    setSaving(true);
    setError(null);

    try {
      let imageUrl = editingProduct.image_url || '';

      // Upload da imagem se selecionou arquivo novo
      if (imageFile) {
        setImageUploading(true);
        const fd = new FormData();
        fd.append('file', imageFile);
        const upRes = await fetch('/api/products/upload-image', { method: 'POST', body: fd });
        const upData = await upRes.json();
        setImageUploading(false);
        if (upData.success) {
          imageUrl = upData.url;
        } else {
          setImageError(upData.message || 'Falha no upload da imagem.');
          // Não bloqueia o salvamento do produto — continua sem imagem nova
        }
      }

      // Se removeu imagem, limpa
      if (!imagePreview && !imageFile) imageUrl = '';

      const payload = {
        product: {
          ...editingProduct,
          image_url: imageUrl,
          price: Number(editingProduct.price),
          promotional_price: editingProduct.promotional_price
            ? Number(editingProduct.promotional_price)
            : null,
        },
        option_group_ids: selectedGroupIds,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Erro ao salvar produto.');
        return;
      }

      await loadData();
      closeModal();
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setSaving(false);
      setImageUploading(false);
    }
  };

  const handleToggleAvailable = async (p: ProductWithMeta) => {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: { ...p, is_available: !p.is_available }, option_group_ids: p.option_groups?.map((g: any) => g.id) || [] }),
    });
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este produto do cardápio?')) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    await loadData();
  };

  const handleDuplicate = async (p: ProductWithMeta) => {
    const payload = {
      product: { ...p, id: undefined, name: `${p.name} (Cópia)` },
      option_group_ids: p.option_groups?.map((g: any) => g.id) || [],
    };
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadData();
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', width: '100%' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900 }}>Gerenciamento de Produtos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Cadastre produtos, adicione imagens e configure complementos.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn btn-primary" disabled={loading}>
          <Plus size={18} />
          <span>Novo Produto</span>
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      {/* Tabela */}
      <div className="admin-table-wrap">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            <p style={{ marginTop: '0.5rem' }}>Carregando produtos...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Produto</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Categoria</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Preço</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Promoção</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Complementos</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
                  </td>
                </tr>
              ) : products.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.1s' }}>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-color)' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                          <ImageIcon size={18} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {p.description ? p.description.slice(0, 40) + (p.description.length > 40 ? '…' : '') : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {p.category_name || categories.find(c => c.id === p.category_id)?.name || '—'}
                  </td>
                  <td style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.9rem' }}>
                    R$ {Number(p.price).toFixed(2)}
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    {p.is_promo_active && p.promotional_price ? (
                      <span className="badge badge-danger">R$ {Number(p.promotional_price).toFixed(2)}</span>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    {p.option_groups && p.option_groups.length > 0 ? (
                      <span className="badge badge-brand">{p.option_groups.length} grupo{p.option_groups.length > 1 ? 's' : ''}</span>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum</span>}
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleAvailable(p)}
                      className={`badge ${p.is_available ? 'badge-success' : 'badge-danger'}`}
                      style={{ cursor: 'pointer', border: 'none', background: 'none' }}
                    >
                      {p.is_available ? 'Disponível' : 'Indisponível'}
                    </button>
                  </td>
                  <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => openEdit(p)} className="btn btn-secondary btn-sm" title="Editar"><Edit size={14} /></button>
                      <button type="button" onClick={() => handleDuplicate(p)} className="btn btn-secondary btn-sm" title="Duplicar"><Copy size={14} /></button>
                      <button type="button" onClick={() => handleDelete(p.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }} title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal de Edição/Criação ── */}
      {isModalOpen && editingProduct && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', width: '100%' }}
          >
            {/* Header do modal */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {editingProduct.id ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button type="button" onClick={closeModal} className="btn btn-secondary btn-sm" style={{ borderRadius: '50%', padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            {/* Tabs de seções */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
              {(['info', 'image', 'groups'] as const).map((sec) => {
                const labels: Record<string, string> = { info: '📋 Informações', image: '🖼️ Imagem', groups: '🔧 Complementos' };
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setActiveSection(sec)}
                    style={{
                      flex: 1, padding: '0.75rem 0.5rem', fontWeight: activeSection === sec ? 700 : 500,
                      fontSize: '0.85rem',
                      color: activeSection === sec ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      backgroundColor: 'transparent', border: 'none',
                      borderBottom: activeSection === sec ? '2px solid var(--brand-primary)' : '2px solid transparent',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {labels[sec]}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSave}>
              <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '60vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* ── SEÇÃO: INFORMAÇÕES ── */}
                {activeSection === 'info' && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Nome do Produto *</label>
                      <input
                        type="text" required className="form-input"
                        value={editingProduct.name || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        placeholder="Ex: Açaí 500ml Especial"
                      />
                    </div>

                    <div className="checkout-grid-2">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Categoria *</label>
                        <select
                          className="form-select"
                          value={editingProduct.category_id || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                        >
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Preço Normal (R$) *</label>
                        <input
                          type="number" step="0.10" required className="form-input"
                          value={editingProduct.price ?? ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Descrição</label>
                      <textarea
                        rows={2} className="form-textarea"
                        value={editingProduct.description || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        placeholder="Ingredientes e detalhes do produto"
                      />
                    </div>

                    {/* Promoção */}
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer', marginBottom: editingProduct.is_promo_active ? '0.75rem' : 0 }}>
                        <input type="checkbox" checked={editingProduct.is_promo_active || false}
                          onChange={(e) => setEditingProduct({ ...editingProduct, is_promo_active: e.target.checked })} />
                        <Tag size={16} style={{ color: 'var(--danger)' }} />
                        <span>Ativar Preço Promocional</span>
                      </label>
                      {editingProduct.is_promo_active && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Preço Promocional (R$)</label>
                          <input
                            type="number" step="0.10" className="form-input"
                            value={editingProduct.promotional_price ?? ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, promotional_price: parseFloat(e.target.value) || null })}
                            placeholder="Valor menor que o preço normal"
                          />
                        </div>
                      )}
                    </div>

                    {/* Destaques e disponibilidade */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {[
                        { key: 'is_bestseller', label: '🔥 Mais Vendido' },
                        { key: 'is_new', label: '✨ Novidade' },
                        { key: 'is_featured', label: '⭐ Destaque' },
                        { key: 'is_available', label: '✅ Disponível' },
                        { key: 'allow_notes', label: '📝 Permite Obs.' },
                      ].map(({ key, label }) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input
                            type="checkbox"
                            checked={(editingProduct as any)[key] ?? false}
                            onChange={(e) => setEditingProduct({ ...editingProduct, [key]: e.target.checked })}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="checkout-grid-2">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Nome em Inglês (EN)</label>
                        <input type="text" className="form-input" value={editingProduct.name_en || ''} onChange={(e) => setEditingProduct({ ...editingProduct, name_en: e.target.value })} placeholder="English name" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Nome em Espanhol (ES)</label>
                        <input type="text" className="form-input" value={editingProduct.name_es || ''} onChange={(e) => setEditingProduct({ ...editingProduct, name_es: e.target.value })} placeholder="Nombre en español" />
                      </div>
                    </div>
                  </>
                )}

                {/* ── SEÇÃO: IMAGEM ── */}
                {activeSection === 'image' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Formatos aceitos: JPG, PNG, WEBP. Tamanho máximo: 5MB (compressão automática aplicada). Resolução recomendada: 800×600px.
                    </p>

                    {/* Prévia */}
                    {imagePreview ? (
                      <div style={{ position: 'relative', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
                        <img
                          src={imagePreview}
                          alt="Prévia"
                          style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '2px solid var(--brand-primary)' }}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          style={{
                            position: 'absolute', top: '8px', right: '8px',
                            background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                            width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', cursor: 'pointer',
                          }}
                          title="Remover imagem"
                        >
                          <X size={16} />
                        </button>
                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px' }}>
                          {imageFile ? 'Nova imagem (não salva)' : 'Imagem atual'}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)',
                          padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)',
                          cursor: 'pointer', transition: 'border-color 0.15s',
                        }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                        <p style={{ fontWeight: 600 }}>Clique para selecionar imagem</p>
                        <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>ou arraste o arquivo aqui</p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-secondary btn-sm"
                        disabled={imageUploading}
                      >
                        <Upload size={16} />
                        <span>{imagePreview ? 'Trocar imagem' : 'Selecionar arquivo'}</span>
                      </button>
                      {imagePreview && (
                        <button type="button" onClick={handleRemoveImage} className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }}>
                          <X size={16} />
                          <span>Remover imagem</span>
                        </button>
                      )}
                    </div>

                    {imageError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <AlertCircle size={16} /><span>{imageError}</span>
                      </div>
                    )}

                    {imageUploading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-primary)', fontSize: '0.875rem' }}>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Enviando imagem...</span>
                      </div>
                    )}

                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      💡 A imagem é comprimida automaticamente para economizar espaço. Produtos sem imagem exibem um placeholder no cardápio.
                    </div>
                  </div>
                )}

                {/* ── SEÇÃO: COMPLEMENTOS ── */}
                {activeSection === 'groups' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Configure os complementos e adicionais vinculados a este produto.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowQuickGroupForm(!showQuickGroupForm)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' }}
                      >
                        <Plus size={15} />
                        <span>{showQuickGroupForm ? 'Fechar Criador Rápido' : 'Criar Novo Grupo / Complemento'}</span>
                      </button>
                    </div>

                    {/* Formulário Rápido de Novo Grupo */}
                    {showQuickGroupForm && (
                      <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                          ✨ Criar Novo Grupo e Vincular a Este Produto
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Nome do Grupo (ex: Frutas, Coberturas)</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Nome do grupo..."
                              value={quickGroupName}
                              onChange={(e) => setQuickGroupName(e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Mínimo</label>
                              <input
                                type="number"
                                min="0"
                                className="form-input"
                                value={quickGroupMin}
                                onChange={(e) => setQuickGroupMin(Number(e.target.value))}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Máximo</label>
                              <input
                                type="number"
                                min="1"
                                className="form-input"
                                value={quickGroupMax}
                                onChange={(e) => setQuickGroupMax(Number(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            id="quickReq"
                            checked={quickGroupRequired}
                            onChange={(e) => setQuickGroupRequired(e.target.checked)}
                          />
                          <label htmlFor="quickReq" style={{ fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                            Grupo obrigatório (cliente precisa escolher no mínimo {quickGroupMin || 1})
                          </label>
                        </div>

                        <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.5rem' }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Primeira Opção (ex: Morango, Leite Condensado)</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Nome da opção..."
                              value={quickOptionName}
                              onChange={(e) => setQuickOptionName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Preço Adic. (R$)</label>
                            <input
                              type="number"
                              step="0.50"
                              min="0"
                              className="form-input"
                              value={quickOptionPrice}
                              onChange={(e) => setQuickOptionPrice(e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <button
                            type="button"
                            onClick={() => setShowQuickGroupForm(false)}
                            className="btn btn-secondary btn-sm"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateQuickGroup}
                            disabled={creatingGroup || !quickGroupName.trim()}
                            className="btn btn-primary btn-sm"
                          >
                            {creatingGroup ? 'Criando...' : 'Salvar e Vincular'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Grupos Vinculados a Este Produto */}
                    {selectedGroupIds.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                            📌 Grupos vinculados a este produto ({selectedGroupIds.length})
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {selectedGroupIds.map((gid) => {
                            const group = allGroups.find((g) => g.id === gid);
                            if (!group) return null;
                            return (
                              <div
                                key={gid}
                                style={{
                                  padding: '0.75rem 1rem',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'var(--bg-accent-subtle)',
                                  border: '1.5px solid var(--brand-primary)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.4rem',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{group.name}</span>
                                    <span className={`badge ${group.is_required ? 'badge-danger' : 'badge-brand'}`} style={{ fontSize: '0.7rem' }}>
                                      {group.is_required ? 'Obrigatório' : 'Opcional'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      (Mín {group.min_options} / Máx {group.max_options})
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleGroup(gid)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ color: 'var(--danger)', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                    title="Remover este grupo deste produto (não apaga do sistema)"
                                  >
                                    <X size={13} />
                                    <span>Desvincular</span>
                                  </button>
                                </div>
                                {group.options && group.options.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                                    {group.options.map((opt) => (
                                      <span
                                        key={opt.id}
                                        style={{
                                          fontSize: '0.75rem',
                                          padding: '0.2rem 0.5rem',
                                          backgroundColor: 'var(--bg-primary)',
                                          borderRadius: 'var(--radius-sm)',
                                          border: '1px solid var(--border-color)',
                                          color: 'var(--text-primary)',
                                        }}
                                      >
                                        {opt.name} {opt.price > 0 ? `(+R$ ${Number(opt.price).toFixed(2)})` : '(Grátis)'}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Nenhum complemento adicionado a este grupo ainda.
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Copiar de outro produto */}
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        📋 Copiar complementos de outro produto
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <select
                          className="form-select"
                          value={copyFromProductId}
                          onChange={(e) => setCopyFromProductId(e.target.value)}
                          style={{ flex: 1, minWidth: '160px', fontSize: '0.875rem' }}
                        >
                          <option value="">Selecionar produto de origem...</option>
                          {products
                            .filter((p) => p.id !== editingProduct.id && (p.option_groups?.length || 0) > 0)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.option_groups?.length} grupo{(p.option_groups?.length || 0) > 1 ? 's' : ''})
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleCopyGroups}
                          disabled={!copyFromProductId}
                          className="btn btn-secondary btn-sm"
                        >
                          <Copy size={16} />
                          <span>Copiar</span>
                        </button>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        Adiciona os grupos do produto de origem sem remover os já selecionados e sem alterar o produto de origem.
                      </p>
                    </div>

                    {/* Lista de todos os grupos disponíveis para marcar/desmarcar */}
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-secondary)' }}>
                        Todos os grupos disponíveis ({allGroups.length})
                      </p>
                      {allGroups.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                          Nenhum grupo cadastrado. Use o botão "Criar Novo Grupo" acima para começar.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {allGroups.map((g) => {
                            const isSelected = selectedGroupIds.includes(g.id);
                            return (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => toggleGroup(g.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textAlign: 'left',
                                  backgroundColor: isSelected ? 'var(--bg-accent-subtle)' : 'var(--bg-tertiary)',
                                  border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                  cursor: 'pointer', transition: 'all 0.15s',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div style={{
                                    width: '20px', height: '20px', borderRadius: 'var(--radius-sm)',
                                    border: isSelected ? '2px solid var(--brand-primary)' : '2px solid var(--border-subtle)',
                                    backgroundColor: isSelected ? 'var(--brand-primary)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                  }}>
                                    {isSelected && <Check size={13} strokeWidth={3} color="#fff" />}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{g.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      {g.is_required ? '⚠️ Obrigatório' : 'Opcional'} · Mín {g.min_options} / Máx {g.max_options}
                                      {g.options ? ` · ${g.options.length} opção${g.options.length !== 1 ? 'ões' : ''}` : ''}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <span className="badge badge-brand" style={{ fontSize: '0.7rem' }}>Vinculado</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {selectedGroupIds.length > 0 && (
                      <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--success-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                        ✅ {selectedGroupIds.length} grupo{selectedGroupIds.length > 1 ? 's' : ''} vinculado{selectedGroupIds.length > 1 ? 's' : ''} a este produto.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rodapé do modal */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['info', 'image', 'groups'] as const).map((sec, i, arr) => (
                    <React.Fragment key={sec}>
                      {i > 0 && <span style={{ color: 'var(--text-muted)' }}>›</span>}
                      <button
                        type="button"
                        onClick={() => setActiveSection(sec)}
                        style={{ fontSize: '0.78rem', fontWeight: activeSection === sec ? 700 : 400, color: activeSection === sec ? 'var(--brand-primary)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {sec === 'info' ? 'Info' : sec === 'image' ? 'Imagem' : 'Complementos'}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={closeModal} className="btn btn-secondary">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || imageUploading}>
                    {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : 'Salvar Produto'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
