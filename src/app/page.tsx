'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Flame, Tag, Sparkles, AlertCircle } from 'lucide-react';
import { Category, Product, StoreCurrentStatus } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductModal } from '@/components/ui/ProductModal';
import { CartDrawer } from '@/components/ui/CartDrawer';
import { CheckoutModal } from '@/components/ui/CheckoutModal';

export default function HomePage() {
  const { t, localize } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeStatus, setStoreStatus] = useState<StoreCurrentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeHighlight, setActiveHighlight] = useState<'all' | 'promo' | 'bestseller' | 'new'>('all');

  // Modal de produto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    Promise.all([
      import('@/lib/data/mockData').then((mod) => {
        setProducts(mod.initialProducts);
        setCategories(mod.initialCategories);
      }),
      fetch('/api/store-status')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStoreStatus(data.status);
          }
        })
        .catch(() => {}),
    ]).finally(() => {
      setLoading(false);
    });
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
    });
  }, [products, selectedCategory, activeHighlight, searchQuery]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main className="main-content">
        {/* Aviso no topo se a loja estiver fechada */}
        {storeStatus && !storeStatus.isOpen && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              borderBottom: '1px solid var(--border-color)',
              padding: '0.85rem 1rem',
              textAlign: 'center',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{storeStatus.message}</span>
          </div>
        )}

        {/* Hero Section */}
        <section
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            padding: '2.5rem 0',
            textAlign: 'center',
          }}
        >
          <div className="container" style={{ maxWidth: '720px' }}>
            <span
              className="badge badge-brand"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', marginBottom: '0.75rem' }}
            >
              Recife • Delivery & Balcão
            </span>
            <h1
              className="hero-title"
              style={{
                fontSize: '2.25rem',
                fontWeight: 900,
                letterSpacing: '-0.8px',
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                lineHeight: 1.2,
              }}
            >
              {t.menu.heroTitle}
            </h1>
            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
              }}
            >
              {t.menu.heroSubtitle}
            </p>

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

            {/* Pílulas de Categorias do Catálogo */}
            <div
              className="filters-scroll"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 'var(--radius-full)', fontSize: '0.85rem' }}
              >
                Todas as Categorias
              </button>

              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`btn btn-sm ${selectedCategory === cat.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: 'var(--radius-full)', fontSize: '0.85rem' }}
                >
                  {localize(cat, 'name')}
                </button>
              ))}
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
            ) : (
              <div
                className="products-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1.5rem',
                }}
              >
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
