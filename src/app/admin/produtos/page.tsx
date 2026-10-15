'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Copy, Tag, Flame, Sparkles, X,
  ImageIcon, Upload, Link2, Link2Off, ChevronDown, ChevronUp,
  AlertCircle, Check, Loader2, ArrowUp, ArrowDown, ShoppingBag,
} from 'lucide-react';
import { Product, Category, OptionGroup, CostConfig } from '@/lib/types';

type ProductWithMeta = Product & { category_name?: string; option_group_ids?: string[] };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithMeta[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allGroups, setAllGroups] = useState<OptionGroup[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductWithMeta> | null>(null);
  const [activeSection, setActiveSection] = useState<'info' | 'image' | 'groups' | 'sizes' | 'custos' | 'promo'>('info');

  // Tamanhos do produto (inclui promo_price para exibir preview)
  const [editingSizes, setEditingSizes] = useState<Array<{ label: string; volume: string; price: string; promo_price?: string }>>([]);

  // Helper para verificar se um produto está com promoção ativa (por tamanho ou preço fixo)
  const isProductInPromo = (p: Partial<ProductWithMeta>) => {
    if (!p.is_promo_active) return false;
    if (p.promotional_price !== null && p.promotional_price !== undefined && Number(p.promotional_price) > 0) return true;
    if (p.promo_applies_to_sizes && p.promo_percent && Number(p.promo_percent) > 0) return true;
    if (Array.isArray(p.sizes) && p.sizes.some((s: any) => s.promo_price != null && Number(s.promo_price) > 0)) return true;
    return false;
  };

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

  // Edição direta de opções por grupo dentro do produto
  const [newOptionInputs, setNewOptionInputs] = useState<{ [groupId: string]: { name: string; price: string } }>({});
  const [cloningGroupId, setCloningGroupId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        const cats: Category[] = (data.categories || []).sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
        const prods: ProductWithMeta[] = (data.products || []).sort((a: any, b: any) => {
          const catA = cats.find((c) => c.id === a.category_id);
          const catB = cats.find((c) => c.id === b.category_id);
          const catDiff = (catA?.display_order ?? 0) - (catB?.display_order ?? 0);
          if (catDiff !== 0) return catDiff;
          return (a.display_order ?? 0) - (b.display_order ?? 0);
        });
        setProducts(prods);
        setCategories(cats);
        setAllGroups(data.optionGroups || []);
      }
    } catch {
      setError('Erro ao carregar produtos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Reordenação de produtos dentro da mesma categoria
  const handleMoveProduct = async (p: ProductWithMeta, direction: 'up' | 'down') => {
    const targetCatId = p.category_id;
    const sameCatProducts = products
      .filter((item) => item.category_id === targetCatId)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const currentIndex = sameCatProducts.findIndex((item) => item.id === p.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sameCatProducts.length) return;

    const updated = [...sameCatProducts];
    const temp = updated[currentIndex];
    updated[currentIndex] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reorderedList = updated.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }));

    // Atualiza estado local imediatamente
    setProducts((prev) =>
      prev
        .map((item) => {
          const found = reorderedList.find((r) => r.id === item.id);
          return found ? { ...item, display_order: found.display_order } : item;
        })
        .sort((a, b) => {
          const catA = categories.find((c) => c.id === a.category_id);
          const catB = categories.find((c) => c.id === b.category_id);
          const catDiff = (catA?.display_order ?? 0) - (catB?.display_order ?? 0);
          if (catDiff !== 0) return catDiff;
          return (a.display_order ?? 0) - (b.display_order ?? 0);
        })
    );

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', products: reorderedList }),
      });
    } catch (err) {
      console.error('Erro ao salvar nova ordem do produto:', err);
      loadData();
    }
  };

  // Abre modal para novo produto
  const openCreate = () => {
    const defaultCatId = selectedCategoryFilter !== 'all' ? selectedCategoryFilter : (categories[0]?.id || '');
    const currentCatCount = products.filter((p) => p.category_id === defaultCatId).length;
    setEditingProduct({
      name: '',
      category_id: defaultCatId,
      price: 15,
      is_available: true,
      allow_notes: true,
      display_order: currentCatCount + 1,
      is_promo_active: false,
      is_bestseller: false,
      is_new: false,
      is_featured: false,
    });
    setSelectedGroupIds([]);
    setEditingSizes([]);
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
    // Carregar tamanhos existentes (mantendo promo_price se existir)
    const existingSizes = Array.isArray(p.sizes) ? p.sizes.map((s: any) => ({
      label: s.label || '',
      volume: s.volume || '',
      price: String(s.price ?? ''),
      promo_price: s.promo_price != null ? String(s.promo_price) : '',
    })) : [];
    setEditingSizes(existingSizes);
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
          const optPrice = parseFloat(String(quickOptionPrice).replace(',', '.').trim()) || 0;
          await fetch('/api/option-groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save-option',
              groupId: newGroupId,
              option: {
                name: quickOptionName.trim(),
                price: optPrice,
                is_available: true,
              },
            }),
          });
        }
        await loadData();
        setSelectedGroupIds((prev) => [...prev, newGroupId]);
        setQuickGroupName('');
        setQuickOptionName('');
        setQuickOptionPrice('0,00');
        setShowQuickGroupForm(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Alterna status ativo/inativo de uma opção
  const handleToggleOptionAvailable = async (groupId: string, optionId: string, currentAvailable: boolean) => {
    const group = allGroups.find((g) => g.id === groupId);
    const opt = group?.options?.find((o) => o.id === optionId);
    if (!opt) return;

    const updatedOpt = { ...opt, is_available: !currentAvailable };

    // Atualização otimista local
    setAllGroups((prev) =>
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

  // Remove opção de um grupo
  const handleDeleteOption = async (groupId: string, optionId: string) => {
    if (!confirm('Deseja realmente remover esta opção deste grupo?')) return;

    // Atualização otimista
    setAllGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options?.filter((o) => o.id !== optionId),
        };
      })
    );

    try {
      await fetch('/api/option-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-option', groupId, optionId }),
      });
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  // Adiciona nova opção diretamente no grupo
  const handleAddOptionToGroup = async (groupId: string) => {
    const input = newOptionInputs[groupId];
    if (!input?.name?.trim()) return;

    const priceNum = parseFloat(String(input.price || '0').replace(',', '.').trim()) || 0;

    try {
      const res = await fetch('/api/option-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-option',
          groupId,
          option: {
            name: input.name.trim(),
            price: priceNum,
            is_available: true,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.option) {
        setAllGroups((prev) =>
          prev.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              options: [...(g.options || []), data.option],
            };
          })
        );
        setNewOptionInputs((prev) => ({
          ...prev,
          [groupId]: { name: '', price: '0,00' },
        }));
      }
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  // Clona o grupo exclusivamente para este produto (para que alterações não afetem outros)
  const handleMakeGroupExclusive = async (groupId: string) => {
    if (!editingProduct?.id) {
      alert('Salve o produto primeiro antes de torná-lo exclusivo.');
      return;
    }
    setCloningGroupId(groupId);
    try {
      const res = await fetch('/api/option-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clone-group-for-product',
          groupId,
          productId: editingProduct.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.clonedGroup) {
        setSelectedGroupIds((prev) =>
          prev.map((id) => (id === groupId ? data.clonedGroup.id : id))
        );
        await loadData();
        alert('Grupo duplicado com sucesso! Agora as alterações feitas nele serão exclusivas deste produto.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao duplicar grupo.');
    } finally {
      setCloningGroupId(null);
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

      const parsePrice = (v: any): number => {
        if (typeof v === 'number') return v;
        if (!v && v !== 0) return 0;
        const clean = String(v).replace(',', '.').trim();
        const n = parseFloat(clean);
        return isNaN(n) ? 0 : n;
      };

      // Processar tamanhos — mantendo promo_price se houver promoção ativa por tamanho
      const promoPercent = Boolean(editingProduct.is_promo_active)
        ? (parsePrice(editingProduct.promo_percent) || 0)
        : 0;

      const sizesData = editingSizes
        .filter((s) => s.label.trim())
        .map((s) => {
          const normalPrice = parsePrice(s.price);
          // Calcula promo_price a partir do percentual sobre o preço do tamanho
          const promoPrice = promoPercent > 0
            ? Number((normalPrice * (1 - promoPercent / 100)).toFixed(2))
            : null;
          return {
            label: s.label.trim(),
            volume: s.volume.trim(),
            price: normalPrice,               // NUNCA sobrescreve o preço original
            promo_price: promoPrice,          // null quando sem promoção
          };
        });

      // Se tem tamanhos, o preço base é o menor preço normal dos tamanhos
      const autoPrice = sizesData.length > 0
        ? Math.min(...sizesData.map((s) => s.price))
        : parsePrice(editingProduct.price);

      // Promoção por tamanho: sizesData.length > 0 + is_promo_active=true + promoPercent > 0
      const hasSizePromo = sizesData.length > 0 && Boolean(editingProduct.is_promo_active) && promoPercent > 0;

      // Menor preço promocional para garantir compatibilidade com filtros e buscas por promoção
      const minPromoPrice = hasSizePromo
        ? Math.min(...sizesData.map((s) => s.promo_price || s.price))
        : sizesData.length === 0 && editingProduct.is_promo_active && editingProduct.promotional_price != null && (editingProduct.promotional_price as any) !== ''
        ? parsePrice(editingProduct.promotional_price)
        : null;

      const payload = {
        product: {
          ...editingProduct,
          image_url: imageUrl,
          price: autoPrice,
          promotional_price: minPromoPrice,
          is_promo_active: Boolean(editingProduct.is_promo_active),
          // Promoção por tamanho
          promo_applies_to_sizes: sizesData.length > 0 && hasSizePromo,
          promo_percent: hasSizePromo ? promoPercent : null,
          sizes: sizesData.length > 0 ? sizesData : null,
          // Custo/preço ideal
          cost_config: editingProduct.cost_config ?? null,
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

      {/* Filtro por Categoria */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>
          Filtrar Categoria:
        </span>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('all')}
          className={`btn btn-sm ${selectedCategoryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-full)' }}
        >
          Todas ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('promo')}
          className={`btn btn-sm ${selectedCategoryFilter === 'promo' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            borderRadius: 'var(--radius-full)',
            border: selectedCategoryFilter === 'promo' ? '1px solid var(--danger)' : '1px solid rgba(239, 68, 68, 0.4)',
            backgroundColor: selectedCategoryFilter === 'promo' ? 'var(--danger)' : 'rgba(239, 68, 68, 0.08)',
            color: selectedCategoryFilter === 'promo' ? '#ffffff' : 'var(--danger)',
            fontWeight: 700,
          }}
        >
          🏷️ Em Promoção ({products.filter(isProductInPromo).length})
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => p.category_id === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategoryFilter(c.id)}
              className={`btn btn-sm ${selectedCategoryFilter === c.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

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
                <th style={{ padding: '0.75rem 0.6rem', textAlign: 'center', width: '85px' }}>Ordem</th>
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
              {(() => {
                const filtered = selectedCategoryFilter === 'all'
                  ? products
                  : selectedCategoryFilter === 'promo'
                  ? products.filter(isProductInPromo)
                  : products.filter((p) => p.category_id === selectedCategoryFilter);

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {selectedCategoryFilter === 'promo'
                          ? 'Nenhum produto em promoção no momento.'
                          : 'Nenhum produto cadastrado nesta categoria. Clique em "Novo Produto" para começar.'}
                      </td>
                    </tr>
                  );
                }

                return filtered.map((p) => {
                  const sameCat = products
                    .filter((x) => x.category_id === p.category_id)
                    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
                  const catIndex = sameCat.findIndex((x) => x.id === p.id);
                  const isFirst = catIndex === 0;
                  const isLast = catIndex === sameCat.length - 1;

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.1s' }}>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--brand-primary)', minWidth: '22px' }}>
                            #{catIndex + 1}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMoveProduct(p, 'up')}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 4px', height: 'auto', minHeight: 'unset', opacity: isFirst ? 0.3 : 1 }}
                              title="Subir posição (fica antes no cardápio)"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMoveProduct(p, 'down')}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 4px', height: 'auto', minHeight: 'unset', opacity: isLast ? 0.3 : 1 }}
                              title="Descer posição (fica depois no cardápio)"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </div>
                      </td>
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
                        R$ {Number(p.price || 0).toFixed(2).replace('.', ',')}
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {p.is_promo_active && p.promo_applies_to_sizes && Number(p.promo_percent) > 0 ? (
                          <span className="badge badge-danger" title={`Promoção nos tamanhos com ${p.promo_percent}% de desconto`}>
                            -{p.promo_percent}% (Tamanhos)
                          </span>
                        ) : p.is_promo_active && p.promotional_price !== null && p.promotional_price !== undefined ? (
                          <span className="badge badge-danger">R$ {Number(p.promotional_price).toFixed(2).replace('.', ',')}</span>
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
                          title={p.is_available ? 'Clique para marcar como Esgotado' : 'Clique para marcar como Disponível'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.7rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: p.is_available ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: p.is_available ? 'var(--success)' : 'var(--danger)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <ShoppingBag size={13} />
                          {p.is_available ? 'Disponível' : 'Esgotado'}
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
                  );
                });
              })()}
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
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', overflowX: 'auto' }}>
              {(['info', 'sizes', 'promo', 'custos', 'image', 'groups'] as const).map((sec) => {
                const labels: Record<string, string> = {
                  info: '📋 Info',
                  sizes: '📏 Tamanhos',
                  promo: '🏷️ Promoção',
                  custos: '💰 Custos',
                  image: '🖼️ Imagem',
                  groups: '🔧 Adicionais',
                };
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setActiveSection(sec)}
                    style={{
                      flex: 1, padding: '0.75rem 0.5rem', fontWeight: activeSection === sec ? 700 : 500,
                      fontSize: '0.8rem',
                      color: activeSection === sec ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      backgroundColor: 'transparent', border: 'none',
                      borderBottom: activeSection === sec ? '2px solid var(--brand-primary)' : '2px solid transparent',
                      cursor: 'pointer', whiteSpace: 'nowrap', minWidth: '70px',
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
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

                      {/* Preço Normal — escondido quando há tamanhos configurados */}
                      {editingSizes.length === 0 ? (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Preço Normal (R$) *</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            required
                            className="form-input"
                            value={editingProduct.price ?? ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value as any })}
                            placeholder="Ex: 15,90 ou 0,10"
                          />
                        </div>
                      ) : (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Preço</label>
                          <div style={{
                            padding: '0.6rem 0.75rem',
                            backgroundColor: 'var(--bg-accent-subtle)',
                            border: '1px solid var(--brand-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.8rem',
                            color: 'var(--brand-primary)',
                            fontWeight: 600,
                          }}>
                            📏 Definido pelos tamanhos<br />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              a partir de R$ {Math.min(...editingSizes.filter(s => s.label && s.price).map(s => parseFloat(String(s.price).replace(',', '.')) || 0)).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Ordem / Posição *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          className="form-input"
                          value={editingProduct.display_order ?? 1}
                          onChange={(e) => setEditingProduct({ ...editingProduct, display_order: parseInt(e.target.value, 10) || 1 })}
                          placeholder="Ex: 1"
                          title="Posição de exibição deste produto na categoria (1 para primeiro, 2 para segundo, etc.)"
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

                    {/* Promoção — desabilitada quando há tamanhos */}
                    {editingSizes.length === 0 && (
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
                            type="text"
                            inputMode="decimal"
                            className="form-input"
                            value={editingProduct.promotional_price ?? ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, promotional_price: e.target.value as any })}
                            placeholder="Ex: 12,50 ou 0,10"
                          />
                        </div>
                      )}
                    </div>
                    )}

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

                {/* ── SEÇÃO: TAMANHOS ── */}
                {activeSection === 'sizes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                          Configure os tamanhos disponíveis (P, M, G, GG) com volume e preço normal.
                        </p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          💡 O menor preço dos tamanhos será exibido no card do produto.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingSizes((prev) => [...prev, { label: '', volume: '', price: '', promo_price: '' }])}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', whiteSpace: 'nowrap' }}
                      >
                        <Plus size={15} />
                        <span>Adicionar Tamanho</span>
                      </button>
                    </div>

                    {editingSizes.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Nenhum tamanho configurado</p>
                        <p style={{ fontSize: '0.8rem' }}>Clique em "Adicionar Tamanho" para começar.</p>
                      </div>
                    )}

                    {editingSizes.map((size, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '75px 1fr 100px auto', gap: '0.5rem', alignItems: 'end', backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Tamanho *</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="P, M, G..."
                            value={size.label}
                            onChange={(e) => setEditingSizes((prev) => prev.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Volume / Descrição</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="300ml, 500ml, 1L..."
                            value={size.volume}
                            onChange={(e) => setEditingSizes((prev) => prev.map((s, i) => i === idx ? { ...s, volume: e.target.value } : s))}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Preço Normal (R$) *</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="form-input"
                            placeholder="0,00"
                            value={size.price}
                            onChange={(e) => setEditingSizes((prev) => prev.map((s, i) => i === idx ? { ...s, price: e.target.value } : s))}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingSizes((prev) => prev.filter((_, i) => i !== idx))}
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', padding: '0.4rem', height: '38px', alignSelf: 'flex-end' }}
                          title="Remover tamanho"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}

                    {/* Promoção por Percentual sobre Tamanhos */}
                    {editingSizes.length > 0 && (
                      <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer', marginBottom: editingProduct?.is_promo_active ? '0.75rem' : 0 }}>
                          <input type="checkbox"
                            checked={editingProduct?.is_promo_active || false}
                            onChange={(e) => setEditingProduct({ ...editingProduct!, is_promo_active: e.target.checked, promo_applies_to_sizes: e.target.checked })}
                          />
                          <Tag size={16} style={{ color: 'var(--danger)' }} />
                          <span>Ativar Promoção por Percentual nos Tamanhos</span>
                        </label>
                        {editingProduct?.is_promo_active && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Desconto (%) aplicado sobre cada tamanho</label>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                step="0.5"
                                className="form-input"
                                value={editingProduct?.promo_percent ?? ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct!, promo_percent: parseFloat(e.target.value) || undefined })}
                                placeholder="Ex: 20 = 20% de desconto"
                                style={{ maxWidth: '200px' }}
                              />
                            </div>
                            {/* Preview dos preços promocionais por tamanho */}
                            {editingProduct?.promo_percent && Number(editingProduct.promo_percent) > 0 && (
                              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                  🔖 Preview dos preços com {editingProduct.promo_percent}% de desconto:
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  {editingSizes.filter(s => s.label && s.price).map((s, i) => {
                                    const normalPrice = parseFloat(String(s.price).replace(',', '.')) || 0;
                                    const promoPrice = Number((normalPrice * (1 - Number(editingProduct.promo_percent) / 100)).toFixed(2));
                                    return (
                                      <div key={i} style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                                        <span style={{ fontWeight: 700 }}>{s.label}</span>:{' '}
                                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>R$ {normalPrice.toFixed(2).replace('.', ',')}</span>{' '}
                                        <span style={{ fontWeight: 800, color: 'var(--danger)' }}>R$ {promoPrice.toFixed(2).replace('.', ',')}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                  ✅ Os preços originais são preservados. O desconto é calculado automaticamente ao salvar.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {editingSizes.length > 0 && (
                      <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Prévia no card: {editingSizes.filter(s => s.label).map((s) => `${s.label}${s.volume ? ` (${s.volume})` : ''}`).join(' • ')}
                      </div>
                    )}
                  </div>
                )}

                {/* ── SEÇÃO: PROMOÇÃO ── */}
                {activeSection === 'promo' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginBottom: editingProduct?.is_promo_active ? '1rem' : 0 }}>
                        <input
                          type="checkbox"
                          style={{ width: '18px', height: '18px' }}
                          checked={editingProduct?.is_promo_active || false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditingProduct({
                              ...editingProduct!,
                              is_promo_active: checked,
                              promo_applies_to_sizes: editingSizes.length > 0 ? checked : false,
                            });
                          }}
                        />
                        <Tag size={20} style={{ color: 'var(--danger)' }} />
                        <span>Ativar Promoção para este Produto</span>
                      </label>

                      {editingProduct?.is_promo_active ? (
                        editingSizes.length > 0 ? (
                          /* Promoção por tamanhos */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              💡 <strong>Produto com Tamanhos:</strong> A promoção aplica um percentual de desconto sobre cada tamanho cadastrado. O produto irá automaticamente para a aba <strong>🏷️ Promoções</strong> e terá destaque no cardápio.
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontWeight: 700 }}>
                                Percentual de Desconto (%) *
                              </label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '240px' }}>
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  step="0.5"
                                  className="form-input"
                                  value={editingProduct?.promo_percent ?? ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || undefined;
                                    setEditingProduct({
                                      ...editingProduct!,
                                      promo_percent: val,
                                      promo_applies_to_sizes: true,
                                    });
                                  }}
                                  placeholder="Ex: 15"
                                  style={{ fontWeight: 700, fontSize: '1rem' }}
                                />
                                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--danger)' }}>% OFF</span>
                              </div>
                            </div>

                            {/* Prévia dos preços por tamanho */}
                            {editingProduct?.promo_percent && Number(editingProduct.promo_percent) > 0 && (
                              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span>🏷️</span>
                                  <span>Tabela com {editingProduct.promo_percent}% de Desconto Calculado:</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem' }}>
                                  {editingSizes.filter(s => s.label && s.price).map((s, i) => {
                                    const normalPrice = parseFloat(String(s.price).replace(',', '.')) || 0;
                                    const promoPrice = Number((normalPrice * (1 - Number(editingProduct.promo_percent) / 100)).toFixed(2));
                                    return (
                                      <div
                                        key={i}
                                        style={{
                                          backgroundColor: 'var(--bg-tertiary)',
                                          padding: '0.65rem 0.85rem',
                                          borderRadius: 'var(--radius-sm)',
                                          border: '1px solid var(--border-color)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '0.2rem',
                                        }}
                                      >
                                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                          {s.label} {s.volume ? `(${s.volume})` : ''}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                                            R$ {normalPrice.toFixed(2).replace('.', ',')}
                                          </span>
                                          <span style={{ fontWeight: 900, color: 'var(--danger)', fontSize: '0.95rem' }}>
                                            R$ {promoPrice.toFixed(2).replace('.', ',')}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Check size={15} />
                                  <span>Os preços normais são preservados. O desconto é calculado em tempo real para o cliente.</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Promoção de produto sem tamanhos (preço fixo) */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Preço Normal Atual</label>
                                <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.95rem' }}>
                                  R$ {Number(String(editingProduct?.price || 0).replace(',', '.')).toFixed(2).replace('.', ',')}
                                </div>
                              </div>

                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontWeight: 700, color: 'var(--danger)' }}>
                                  Preço Promocional (R$) *
                                </label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  required={Boolean(editingProduct?.is_promo_active)}
                                  className="form-input"
                                  value={editingProduct?.promotional_price ?? ''}
                                  onChange={(e) => setEditingProduct({ ...editingProduct!, promotional_price: e.target.value as any })}
                                  placeholder="Ex: 12,50 ou 0,10"
                                  style={{ fontWeight: 700, color: 'var(--danger)' }}
                                />
                              </div>
                            </div>

                            {(() => {
                              const normal = parseFloat(String(editingProduct?.price || 0).replace(',', '.')) || 0;
                              const promo = parseFloat(String(editingProduct?.promotional_price || 0).replace(',', '.')) || 0;
                              if (normal > 0 && promo > 0 && promo < normal) {
                                const diff = normal - promo;
                                const pct = Math.round((diff / normal) * 100);
                                return (
                                  <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 700 }}>
                                    Economia de R$ {diff.toFixed(2).replace('.', ',')} ({pct}% de desconto) para o cliente!
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )
                      ) : (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.25rem' }}>
                          Marque a caixa acima para ativar uma oferta especial com desconto para este produto no cardápio.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── SEÇÃO: CUSTOS / PREÇO IDEAL ── */}
                {activeSection === 'custos' && (() => {
                  const cc = (editingProduct?.cost_config || {}) as any;
                  const ingredientCost = parseFloat(String(cc.ingredient_cost || '0').replace(',', '.')) || 0;
                  const packagingCost = parseFloat(String(cc.packaging_cost || '0').replace(',', '.')) || 0;
                  const otherCost = parseFloat(String(cc.other_cost || '0').replace(',', '.')) || 0;
                  const complementCost = parseFloat(String(cc.complement_cost || '0').replace(',', '.')) || 0;
                  const desiredMargin = parseFloat(String(cc.desired_margin || '30').replace(',', '.')) || 30;
                  const totalCost = ingredientCost + packagingCost + otherCost + complementCost;
                  const minPrice = totalCost;
                  const recommendedPrice = desiredMargin > 0 && desiredMargin < 100
                    ? Number((totalCost / (1 - desiredMargin / 100)).toFixed(2))
                    : totalCost;
                  const currentPrice = editingSizes.length > 0
                    ? Math.min(...editingSizes.filter(s => s.price).map(s => parseFloat(String(s.price).replace(',', '.')) || 0))
                    : (parseFloat(String((editingProduct?.price || '0')).replace(',', '.')) || 0);
                  const currentMargin = currentPrice > 0 && totalCost > 0
                    ? Number(((currentPrice - totalCost) / currentPrice * 100).toFixed(1))
                    : 0;

                  const updateCC = (field: string, value: string) => {
                    setEditingProduct(prev => prev ? {
                      ...prev,
                      cost_config: { ...(prev.cost_config || {}), [field]: parseFloat(value.replace(',', '.')) || 0 }
                    } : prev);
                  };

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-accent-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.83rem', color: 'var(--brand-primary)', border: '1px solid var(--brand-primary)', fontWeight: 600 }}>
                        💡 Esta seção é apenas para controle interno. O preço de venda não é alterado automaticamente — você decide se quer aplicar o preço sugerido.
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">🧃 Custo Ingredientes (R$)</label>
                          <input type="text" inputMode="decimal" className="form-input"
                            value={cc.ingredient_cost ?? ''}
                            onChange={(e) => updateCC('ingredient_cost', e.target.value)}
                            placeholder="Ex: 4,50" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">📦 Custo Embalagem (R$)</label>
                          <input type="text" inputMode="decimal" className="form-input"
                            value={cc.packaging_cost ?? ''}
                            onChange={(e) => updateCC('packaging_cost', e.target.value)}
                            placeholder="Ex: 0,80" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">🔧 Outros Custos (R$)</label>
                          <input type="text" inputMode="decimal" className="form-input"
                            value={cc.other_cost ?? ''}
                            onChange={(e) => updateCC('other_cost', e.target.value)}
                            placeholder="Ex: 0,30" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">🍓 Custo Complementos (R$)</label>
                          <input type="text" inputMode="decimal" className="form-input"
                            value={cc.complement_cost ?? ''}
                            onChange={(e) => updateCC('complement_cost', e.target.value)}
                            placeholder="Ex: 1,20 (média)" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">📈 Margem Desejada (%)</label>
                          <input type="number" min="1" max="99" className="form-input"
                            value={cc.desired_margin ?? 30}
                            onChange={(e) => updateCC('desired_margin', e.target.value)}
                            placeholder="Ex: 30" />
                        </div>
                      </div>

                      {/* Painel de resultados */}
                      {totalCost > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>Custo Total</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>R$ {totalCost.toFixed(2).replace('.', ',')}</div>
                          </div>
                          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>Preço Mínimo</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>R$ {minPrice.toFixed(2).replace('.', ',')}</div>
                          </div>
                          <div style={{ padding: '1rem', backgroundColor: 'var(--success-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginBottom: '0.3rem' }}>Preço Recomendado</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>R$ {recommendedPrice.toFixed(2).replace('.', ',')}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{desiredMargin}% de margem</div>
                          </div>
                          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-accent-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-primary)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 600, marginBottom: '0.3rem' }}>Margem Atual</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: currentMargin >= desiredMargin ? 'var(--success)' : currentMargin > 0 ? 'var(--warning)' : 'var(--danger)' }}>
                              {currentMargin > 0 ? `${currentMargin}%` : '—'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              Preço atual: R$ {currentPrice.toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                        </div>
                      )}
                      {totalCost === 0 && (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                          Preencha os custos acima para ver o cálculo do preço ideal.
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                              type="text"
                              inputMode="decimal"
                              className="form-input"
                              placeholder="0,00"
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
                            const isCloning = cloningGroupId === gid;
                            const linkedCount = products.filter((prod) =>
                              prod.option_groups?.some((og) => og.id === gid)
                            ).length;
                            const optionInput = newOptionInputs[gid] || { name: '', price: '' };

                            return (
                              <div
                                key={gid}
                                style={{
                                  padding: '1rem',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'var(--bg-secondary)',
                                  border: '1.5px solid var(--border-color)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.75rem',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                                }}
                              >
                                {/* Topo do Grupo */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{group.name}</span>
                                      <span className={`badge ${group.is_required ? 'badge-danger' : 'badge-brand'}`} style={{ fontSize: '0.7rem' }}>
                                        {group.is_required ? 'Obrigatório' : 'Opcional'}
                                      </span>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        (Mín {group.min_options} / Máx {group.max_options})
                                      </span>
                                    </div>
                                    {/* Indicador de Compartilhamento / Exclusividade */}
                                    <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      {linkedCount > 1 ? (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#b45309', backgroundColor: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                          <span>🔗 Compartilhado em {linkedCount} produtos</span>
                                          {editingProduct?.id && (
                                            <button
                                              type="button"
                                              disabled={isCloning}
                                              onClick={() => handleMakeGroupExclusive(gid)}
                                              style={{
                                                background: '#d97706',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '3px',
                                                padding: '0.1rem 0.4rem',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                              }}
                                              title="Duplica este grupo e opções exclusivamente para este produto, permitindo alterar sem mexer nos outros produtos"
                                            >
                                              {isCloning ? 'Duplicando...' : '✂️ Tornar Exclusivo deste Produto'}
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <span style={{ fontSize: '0.72rem', color: '#16a34a', backgroundColor: '#dcfce7', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                                          ⭐ Exclusivo deste produto
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => toggleGroup(gid)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ color: 'var(--danger)', padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                    title="Remover este grupo deste produto"
                                  >
                                    <X size={13} />
                                    <span>Desvincular Grupo</span>
                                  </button>
                                </div>

                                {/* Lista de Opções / Acompanhamentos editáveis */}
                                <div>
                                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                    Opções deste Grupo ({group.options?.length || 0}):
                                  </p>

                                  {group.options && group.options.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                      {group.options.map((opt) => (
                                        <div
                                          key={opt.id}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.45rem 0.75rem',
                                            backgroundColor: opt.is_available ? 'var(--bg-tertiary)' : '#fef2f2',
                                            borderRadius: 'var(--radius-sm)',
                                            border: `1px solid ${opt.is_available ? 'var(--border-color)' : '#fecaca'}`,
                                            fontSize: '0.825rem',
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: opt.is_available ? 'var(--text-primary)' : '#991b1b' }}>
                                              {opt.name}
                                            </span>
                                            <span style={{ color: opt.price > 0 ? 'var(--brand-primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>
                                              {opt.price > 0 ? `+R$ ${Number(opt.price).toFixed(2)}` : '(Grátis)'}
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {/* Alternar Ativo / Inativo */}
                                            <button
                                              type="button"
                                              onClick={() => handleToggleOptionAvailable(gid, opt.id, opt.is_available)}
                                              style={{
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                border: 'none',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                backgroundColor: opt.is_available ? '#dcfce7' : '#fee2e2',
                                                color: opt.is_available ? '#16a34a' : '#dc2626',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                              }}
                                              title={opt.is_available ? 'Clique para inativar esta opção' : 'Clique para ativar esta opção'}
                                            >
                                              {opt.is_available ? '✓ Ativo' : '✕ Inativo'}
                                            </button>

                                            {/* Remover Opção */}
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteOption(gid, opt.id)}
                                              style={{
                                                padding: '0.2rem 0.35rem',
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--danger)',
                                                cursor: 'pointer',
                                                opacity: 0.8,
                                              }}
                                              title="Excluir esta opção"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      Nenhum complemento adicionado neste grupo ainda. Adicione abaixo:
                                    </span>
                                  )}
                                </div>

                                {/* Formulário Rápido para Adicionar Opção neste Grupo */}
                                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
                                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Nome da nova opção (ex: Morango)..."
                                      value={optionInput.name}
                                      onChange={(e) =>
                                        setNewOptionInputs((prev) => ({
                                          ...prev,
                                          [gid]: { ...optionInput, name: e.target.value },
                                        }))
                                      }
                                      style={{ flex: 2, minWidth: '140px', fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                                    />
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Preço (ex: 0,00 ou 2,50)"
                                      value={optionInput.price}
                                      onChange={(e) =>
                                        setNewOptionInputs((prev) => ({
                                          ...prev,
                                          [gid]: { ...optionInput, price: e.target.value },
                                        }))
                                      }
                                      style={{ width: '90px', fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                                    />
                                    <button
                                      type="button"
                                      disabled={!optionInput.name.trim()}
                                      onClick={() => handleAddOptionToGroup(gid)}
                                      className="btn btn-primary btn-sm"
                                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                                    >
                                      <Plus size={13} />
                                      <span>+ Adicionar</span>
                                    </button>
                                  </div>
                                </div>
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
