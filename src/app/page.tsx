'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Flame, Tag, Sparkles, Clock, Bike, Zap, ChevronDown, ClipboardList } from 'lucide-react';
import { Category, Product, StoreCurrentStatus, StoreSettings } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductModal } from '@/components/ui/ProductModal';
import { CartDrawer } from '@/components/ui/CartDrawer';
import { CheckoutModal } from '@/components/ui/CheckoutModal';
import { SeasonEffectLayer, getSeasonTitleClass, SeasonHeroBadge } from '@/components/ui/SeasonEffect';
import { SeasonEffect } from '@/lib/types';

export default function HomePage() {
  const { t, localize } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeStatus, setStoreStatus] = useState<StoreCurrentStatus | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeHighlight, setActiveHighlight] = useState<'all' | 'promo' | 'bestseller' | 'new'>('all');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Modal de produto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Função de busca de dados reutilizável
  const fetchData = React.useCallback((isInitial = false) => {
    const productsReq = fetch('/api/products', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.products)) {
          const sortedCats = [...(data.categories || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
          const sortedProds = [...(data.products || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
          setProducts(sortedProds);
          if (sortedCats.length > 0) {
            setCategories(sortedCats);
          }
        } else if (isInitial) {
          return import('@/lib/data/mockData').then((mod) => {
            setProducts(mod.initialProducts);
            setCategories(mod.initialCategories);
          });
        }
      })
      .catch(() => {
        if (isInitial) {
          return import('@/lib/data/mockData').then((mod) => {
            setProducts(mod.initialProducts);
            setCategories(mod.initialCategories);
          });
        }
      });

    const statusReq = fetch('/api/store-status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.status) setStoreStatus(data.status);
          if (data.settings) setSettings(data.settings);
        }
      })
      .catch(() => {});

    if (isInitial) {
      Promise.all([productsReq, statusReq]).finally(() => setLoading(false));
    } else {
      Promise.all([productsReq, statusReq]);
    }
  }, []);

  useEffect(() => {
    // Carga inicial
    fetchData(true);

    // Atualiza status da loja a cada 30 segundos (aberto/fechado)
    const statusInterval = setInterval(() => {
      fetch('/api/store-status', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            if (data.status) setStoreStatus(data.status);
            if (data.settings) setSettings(data.settings);
          }
        })
        .catch(() => {});
    }, 30_000);

    // Atualiza produtos/cardápio a cada 2 minutos
    const productsInterval = setInterval(() => fetchData(false), 120_000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(productsInterval);
    };
  }, [fetchData]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filtro de categoria
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) {
        return false;
      }

      // Filtro de destaque
      if (activeHighlight === 'promo' && (!p.is_promo_active || !p.promotional_price)) {
        return false;
      }
      if (activeHighlight === 'bestseller' && !p.is_bestseller) {
        return false;
      }
      if (activeHighlight === 'new' && !p.is_new) {
        return false;
      }

      // Filtro de busca textual
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(query) || desc.includes(query);
      }

      return true;
    }).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [products, selectedCategory, activeHighlight, searchQuery]);

  const seasonEffect = (settings?.season_effect || 'none') as SeasonEffect;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {seasonEffect !== 'none' && <SeasonEffectLayer effect={seasonEffect} />}
      <Header />

      <main className="main-content">

        {/* Hero Section compacto e profissional */}
        <section
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            padding: '1.75rem 0 1.5rem',
            textAlign: 'center',
          }}
        >
          <div className="container" style={{ maxWidth: '720px' }}>
            {seasonEffect !== 'none' && <SeasonHeroBadge effect={seasonEffect} />}
            <h1
              className={`hero-title ${getSeasonTitleClass(seasonEffect)}`}
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '-0.8px',
                color: 'var(--text-primary)',
                marginBottom: '0.35rem',
                lineHeight: 1.2,
              }}
            >
              {settings?.store_name || 'Açaí da Daiane'}
            </h1>

            {/* Linha de info discreta */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Bike size={13} />
                {settings?.allow_delivery !== false && settings?.allow_pickup !== false
                  ? 'Delivery & Retirada'
                  : settings?.allow_delivery !== false
                  ? 'Apenas Delivery'
                  : 'Apenas Retirada'}
              </span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={13} />
                30 a 50 min
              </span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Zap size={13} style={{ color: 'var(--brand-primary)' }} />
                Pix & Cartão
              </span>
              <span style={{ opacity: 0.4 }}>•</span>
              <Link
                href="/meus-pedidos"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: 'var(--brand-primary)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <ClipboardList size={13} />
                Meus Pedidos
              </Link>
              {storeStatus && !storeStatus.isOpen && storeStatus.nextOpenTime && (
                <>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                    Abre às {storeStatus.nextOpenTime}
                  </span>
                </>
              )}
            </div>

            {/* Barra de Busca */}
            <div style={{ position: 'relative', maxWidth: '480px', margin: '0 auto' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.common.search}
                className="form-input"
                style={{
                  paddingLeft: '2.75rem',
                  borderRadius: 'var(--radius-full)',
                  height: '46px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              />
            </div>
          </div>
        </section>

        {/* Filtros de Categorias e Destaques */}
        <section style={{ padding: '1.5rem 0', backgroundColor: 'var(--bg-primary)' }}>
          <div className="container">
            {/* Abas de Destaques Rápidos */}
            <div
              className="filters-scroll"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveHighlight('all')}
                className={`btn btn-sm ${activeHighlight === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                {t.common.allCategories}
              </button>

              <button
                type="button"
                onClick={() => setActiveHighlight('promo')}
                className={`btn btn-sm ${activeHighlight === 'promo' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                <Tag size={14} />
                <span>{t.menu.promotions}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHighlight('bestseller')}
                className={`btn btn-sm ${activeHighlight === 'bestseller' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                <Flame size={14} />
                <span>{t.menu.bestsellers}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHighlight('new')}
                className={`btn btn-sm ${activeHighlight === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                <Sparkles size={14} />
                <span>{t.menu.newItems}</span>
              </button>
            </div>

            {/* Dropdown de Categorias */}
            <div ref={categoryDropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'border-color 0.15s ease',
                  minWidth: '200px',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  {selectedCategory === 'all'
                    ? 'Lista de categorias'
                    : categories.find((c) => c.id === selectedCategory)
                      ? localize(categories.find((c) => c.id === selectedCategory)!, 'name')
                      : 'Lista de categorias'}
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: categoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}
                />
              </button>

              {categoryDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    zIndex: 200,
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '220px',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    animation: 'dropdownFadeIn 0.15s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setSelectedCategory('all'); setCategoryDropdownOpen(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.65rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: selectedCategory === 'all' ? 600 : 400,
                      color: selectedCategory === 'all' ? 'var(--brand-primary)' : 'var(--text-primary)',
                      backgroundColor: selectedCategory === 'all' ? 'var(--bg-accent-subtle)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => { if (selectedCategory !== 'all') (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)'; }}
                    onMouseLeave={(e) => { if (selectedCategory !== 'all') (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                  >
                    Todas as Categorias
                  </button>

                  {categories.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setCategoryDropdownOpen(false); }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.65rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: selectedCategory === cat.id ? 600 : 400,
                        color: selectedCategory === cat.id ? 'var(--brand-primary)' : 'var(--text-primary)',
                        backgroundColor: selectedCategory === cat.id ? 'var(--bg-accent-subtle)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => { if (selectedCategory !== cat.id) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)'; }}
                      onMouseLeave={(e) => { if (selectedCategory !== cat.id) (e.currentTarget as HTMLButtonElement).style.backgroundColor = selectedCategory === cat.id ? 'var(--bg-accent-subtle)' : 'transparent'; }}
                    >
                      {localize(cat, 'name')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Grade de Produtos */}
        <section style={{ padding: '1rem 0 3rem 0' }}>
          <div className="container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                {t.common.loading}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '4rem 1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Nenhum produto encontrado
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Tente alterar os filtros de busca ou escolher outra categoria.
                </p>
              </div>
            ) : selectedCategory === 'all' && !searchQuery.trim() && activeHighlight === 'all' ? (
              // Agrupamento por Categoria com Títulos Elegantes (ex: AÇAÍ E CREMES, SORVETES)
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {categories.map((cat) => {
                  const catProducts = products
                    .filter((p) => p.category_id === cat.id && p.is_available !== false)
                    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

                  if (catProducts.length === 0) return null;

                  return (
                    <div key={cat.id} id={`cat-${cat.id}`}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '1.25rem',
                        }}
                      >
                        <h2
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 900,
                            letterSpacing: '-0.3px',
                            color: 'var(--text-primary)',
                            textTransform: 'uppercase',
                            margin: 0,
                          }}
                        >
                          {localize(cat, 'name')}
                        </h2>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)', opacity: 0.6 }} />
                      </div>
                      <div className="products-grid">
                        {catProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onSelect={(p) => setSelectedProduct(p)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={(p) => setSelectedProduct(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modais e Gaveta do Carrinho */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <CartDrawer />
      <CheckoutModal />

      <Footer />
    </div>
  );
}
