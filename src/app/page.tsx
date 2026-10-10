'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Flame, Tag, Sparkles, AlertCircle, Clock, Bike, ShieldCheck, Zap, Store } from 'lucide-react';
import { Category, Product, StoreCurrentStatus, StoreSettings } from '@/lib/types';
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
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeHighlight, setActiveHighlight] = useState<'all' | 'promo' | 'bestseller' | 'new'>('all');

  // Modal de produto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Função de busca de dados reutilizável
  const fetchData = React.useCallback((isInitial = false) => {
    const productsReq = fetch('/api/products', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            setCategories(data.categories);
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
            {/* Badges Operacionais Funcionais */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <span
                className={`badge ${storeStatus?.isOpen ? 'badge-success' : 'badge-danger'}`}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}
              >
                {storeStatus?.isOpen ? '🟢 Aberto para Pedidos' : '🔴 Fechado no Momento'}
              </span>

              <span
                className="badge badge-brand"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Bike size={13} />
                <span>
                  {settings?.allow_delivery !== false && settings?.allow_pickup !== false
                    ? 'Delivery & Retirada'
                    : settings?.allow_delivery !== false
                    ? 'Apenas Delivery'
                    : 'Apenas Retirada'}
                </span>
              </span>

              <span
                className="badge badge-info"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Clock size={13} />
                <span>30 a 50 min</span>
              </span>

              <span
                className="badge"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Zap size={13} style={{ color: 'var(--brand-primary)' }} />
                <span>Pix Online &amp; Cartão</span>
              </span>
            </div>

            <h1
              className="hero-title"
              style={{
                fontSize: '2.1rem',
                fontWeight: 900,
                letterSpacing: '-0.8px',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
                lineHeight: 1.2,
              }}
            >
              {settings?.store_name || 'Açaí da Daiane'}
            </h1>

            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                marginBottom: '1.25rem',
                maxWidth: '600px',
                margin: '0 auto 1.25rem auto',
              }}
            >
              {storeStatus?.isOpen
                ? settings?.open_message || 'Faça seu pedido online de forma rápida com montagem personalizada do seu açaí e entrega garantida.'
                : settings?.closed_message || 'Estamos fora do horário de atendimento. Consulte nossos produtos e retorne em nossos horários de funcionamento!'}
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
