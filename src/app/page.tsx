'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Search,
  ChevronDown,
  MapPin,
  ChevronRight,
  X,
} from 'lucide-react';
import { Category, Product, StoreCurrentStatus, StoreSettings } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductModal } from '@/components/ui/ProductModal';
import { CartDrawer } from '@/components/ui/CartDrawer';
import { CheckoutModal } from '@/components/ui/CheckoutModal';
import { SeasonEffectLayer } from '@/components/ui/SeasonEffect';
import { SeasonEffect } from '@/lib/types';
import { PromoPopup } from '@/components/ui/PromoPopup';
import { DeliveryFeeModal } from '@/components/ui/DeliveryFeeModal';
import { StoreInfoModal } from '@/components/ui/StoreInfoModal';
import { CouponModal } from '@/components/ui/CouponModal';
import { MobileBottomNav } from '@/components/ui/MobileBottomNav';
import { DesktopSidebarCart } from '@/components/ui/DesktopSidebarCart';

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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<'all' | 'promo' | 'bestseller' | 'new'>('all');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Modais
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isStoreInfoModalOpen, setIsStoreInfoModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [mobileNavTab, setMobileNavTab] = useState<'home' | 'promo' | 'orders' | 'profile'>('home');

  // Busca de dados
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
    fetchData(true);
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
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) {
        return false;
      }
      if (activeHighlight === 'promo' && (!p.is_promo_active || !p.promotional_price)) {
        return false;
      }
      if (activeHighlight === 'bestseller' && !p.is_bestseller) {
        return false;
      }
      if (activeHighlight === 'new' && !p.is_new) {
        return false;
      }
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
  const storeName = settings?.store_name || "D'PALETEIROS";
  const bannerImage = settings?.banner_url || '/banner.jpg';
  const logoImage = settings?.logo_url || '/logo.png';
  const isOpen = storeStatus ? storeStatus.isOpen : true;

  // Localização / Cidade (extraída de address_text ou padrão Recife - PE)
  const locationText = useMemo(() => {
    if (!settings?.address_text) return 'Recife - PE';
    const parts = settings.address_text.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    return settings.address_text;
  }, [settings?.address_text]);

  const statusText = useMemo(() => {
    if (!isOpen) {
      return storeStatus?.nextOpenTime
        ? `Fechado • Abrimos às ${storeStatus.nextOpenTime}`
        : 'Fechado';
    }
    return storeStatus?.nextCloseTime
      ? `Aberto • Fechamos às ${storeStatus.nextCloseTime}`
      : 'Aberto';
  }, [isOpen, storeStatus?.nextOpenTime, storeStatus?.nextCloseTime]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {seasonEffect !== 'none' && <SeasonEffectLayer effect={seasonEffect} />}

      {/* Header Superior Limpo */}
      <Header />

      {/* ── BANNER DE COBERTURA (AÇAÍ BOWL) ── */}
      <div className="store-cover-banner">
        <Image
          src={bannerImage}
          alt={storeName}
          fill
          priority
          className="store-cover-img"
          sizes="100vw"
        />
      </div>

      <main className="main-content" style={{ flex: 1, paddingBottom: '3rem' }}>
        <div className="container" style={{ maxWidth: '1160px' }}>

          {/* ── 1. HEADER DO PERFIL NO MOBILE (IPHONE - IMAGEM 1) ── */}
          <div className="mobile-only" style={{ display: 'none' }}>
            {/* Controlado por CSS abaixo */}
          </div>
          <div className="store-profile-mobile">
            {/* Logo Circular sobrepondo o banner */}
            <div className="store-logo-circle">
              <img
                src={logoImage}
                alt={storeName}
                style={{ width: '85%', height: '85%', objectFit: 'contain' }}
              />
            </div>

            {/* Nome da Loja */}
            <h1 className="store-title-mobile">{storeName}</h1>

            {/* Localização e Mais Informações */}
            <div className="store-info-line-mobile">
              <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
              <span>{locationText}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <button
                type="button"
                onClick={() => setIsStoreInfoModalOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Mais informações
              </button>
            </div>

            {/* Status (Aberto/Fechado) */}
            <div
              className="store-status-line-mobile"
              style={{ color: isOpen ? 'var(--success)' : 'var(--danger)' }}
            >
              {statusText}
            </div>

            {/* Card: Calcular taxa e tempo de entrega (Mobile) */}
            <div
              onClick={() => setIsDeliveryModalOpen(true)}
              className="delivery-calc-card"
              style={{ width: '100%' }}
              role="button"
              tabIndex={0}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <MapPin size={18} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Calcular taxa e tempo de entrega
                </span>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--brand-primary)' }} />
            </div>
          </div>

          {/* ── 2. HEADER DO PERFIL NO DESKTOP (IMAGEM 2) ── */}
          <div className="store-profile-desktop">
            {/* Logo Quadrado arredondado sobrepondo o banner */}
            <div className="store-logo-square">
              <img
                src={logoImage}
                alt={storeName}
                style={{ width: '85%', height: '85%', objectFit: 'contain' }}
              />
            </div>

            {/* Nome e Linha de Informações */}
            <div className="store-profile-text-desktop">
              <h1 className="store-title-desktop">{storeName}</h1>
              <div className="store-info-row-desktop">
                <span style={{ color: isOpen ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                  {statusText}
                </span>
                <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>•</span>
                <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={14} />
                  {locationText}
                </span>
                <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>•</span>
                <button
                  type="button"
                  onClick={() => setIsStoreInfoModalOpen(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Mais informações
                </button>
              </div>
            </div>
          </div>

          {/* ── 3. BARRA DE FILTRO DE CATEGORIAS E BUSCA ── */}
          <div className="filter-search-row">
            {/* Dropdown de Categorias */}
            <div ref={categoryDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                className="category-dropdown-btn"
                aria-label="Selecionar categoria"
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
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '220px',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    animation: 'dropdownFadeIn 0.15s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setCategoryDropdownOpen(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.65rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: selectedCategory === 'all' ? 700 : 400,
                      color: selectedCategory === 'all' ? 'var(--brand-primary)' : 'var(--text-primary)',
                      backgroundColor: selectedCategory === 'all' ? 'var(--bg-accent-subtle)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Todas as Categorias
                  </button>

                  {categories.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setCategoryDropdownOpen(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.65rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: selectedCategory === cat.id ? 700 : 400,
                        color: selectedCategory === cat.id ? 'var(--brand-primary)' : 'var(--text-primary)',
                        backgroundColor: selectedCategory === cat.id ? 'var(--bg-accent-subtle)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {localize(cat, 'name')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Busca: Campo no Desktop, Botão quadrado que expande no Mobile */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              {/* No Desktop: input visível sempre */}
              <div
                className="desktop-search-input-wrap"
                style={{ position: 'relative', width: '100%', maxWidth: '380px' }}
              >
                <Search
                  size={17}
                  style={{
                    position: 'absolute',
                    left: '0.9rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busque por um produto"
                  className="form-input search-input-pill"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* No Mobile: botão quadrado de lupa */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                className="search-square-btn mobile-search-btn"
                aria-label="Buscar produtos"
              >
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Campo de Busca Expandido no Mobile */}
          {mobileSearchOpen && (
            <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busque por um produto..."
                className="form-input"
                style={{
                  paddingLeft: '2.4rem',
                  height: '42px',
                  borderRadius: '10px',
                }}
                autoFocus
              />
            </div>
          )}

          {/* ── 4. LAYOUT PRINCIPAL: 2 COLUNAS NO DESKTOP (IMAGEM 2) ── */}
          <div className="desktop-main-layout">
            
            {/* Coluna Esquerda: Catálogo de Produtos */}
            <div className="desktop-catalog-col">
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
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    Nenhum produto encontrado
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Tente buscar por outro termo ou escolha outra categoria.
                  </p>
                </div>
              ) : selectedCategory === 'all' && !searchQuery.trim() && activeHighlight === 'all' ? (
                // Seções organizadas por Categoria (ex: ESPECIAL PARA CRIANÇAS :), AÇAÍ E CREMES)
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {categories.map((cat) => {
                    const catProducts = products
                      .filter((p) => p.category_id === cat.id && p.is_available !== false)
                      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

                    if (catProducts.length === 0) return null;

                    return (
                      <div key={cat.id} id={`cat-${cat.id}`}>
                        <h2 className="category-section-title">
                          {localize(cat, 'name')}
                        </h2>
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

            {/* Coluna Direita: Sidebar da Sacola (Desktop - Imagem 2) */}
            <div className="desktop-sidebar-col">
              <DesktopSidebarCart
                storeStatus={storeStatus}
                settings={settings}
                onOpenDeliveryFee={() => setIsDeliveryModalOpen(true)}
                onOpenCoupon={() => setIsCouponModalOpen(true)}
                onOpenStoreInfo={() => setIsStoreInfoModalOpen(true)}
              />
            </div>

          </div>

        </div>
      </main>

      {/* Modais do Sistema */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Modal de Taxa e Tempo de Entrega */}
      <DeliveryFeeModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />

      {/* Modal de Informações da Loja */}
      <StoreInfoModal
        isOpen={isStoreInfoModalOpen}
        onClose={() => setIsStoreInfoModalOpen(false)}
        settings={settings}
        storeStatus={storeStatus}
      />

      {/* Modal de Cupom de Desconto */}
      <CouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
      />

      {/* Gaveta do Carrinho (usada no mobile e para detalhes) */}
      <CartDrawer />
      <CheckoutModal />

      {/* Popup automático de Promoções */}
      <PromoPopup
        products={products}
        onSelectProduct={(p) => setSelectedProduct(p)}
      />

      {/* ── BARRA DE NAVEGAÇÃO INFERIOR MOBILE (IPHONE - IMAGEM 1) ── */}
      <MobileBottomNav
        activeTab={mobileNavTab}
        onGoHome={() => {
          setMobileNavTab('home');
          setSelectedCategory('all');
          setActiveHighlight('all');
          setSearchQuery('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenPromo={() => {
          setMobileNavTab('promo');
          setActiveHighlight('promo');
        }}
        onOpenProfile={() => {
          setMobileNavTab('profile');
          setIsStoreInfoModalOpen(true);
        }}
      />

      <Footer />
    </div>
  );
}
