'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';
import { StoreStatusBadge } from './StoreStatusBadge';
import { SeasonTopBanner } from './SeasonEffect';
import { SeasonEffect } from '@/lib/types';

export function Header() {
  const { totalItemCount, subtotal, setIsCartDrawerOpen } = useCart();
  const { t } = useLanguage();
  const [storeName, setStoreName] = useState('Açaí da Daiane');
  const [seasonEffect, setSeasonEffect] = useState<SeasonEffect>('none');
  const [seasonBannerText, setSeasonBannerText] = useState<string>('');

  const fetchStoreInfo = () => {
    fetch('/api/store-status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          if (data.settings.store_name) setStoreName(data.settings.store_name);
          setSeasonEffect((data.settings.season_effect || 'none') as SeasonEffect);
          setSeasonBannerText(data.settings.season_banner_text || '');
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStoreInfo();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'store_settings_updated_at') fetchStoreInfo();
    };
    const handleUpdate = () => fetchStoreInfo();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('store-settings-updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('store-settings-updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  const safeSubtotal = typeof subtotal === 'number' && !isNaN(subtotal) ? subtotal : 0;
  const formattedSubtotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safeSubtotal);

  return (
    <header className="site-header">
      {seasonEffect !== 'none' && (
        <SeasonTopBanner effect={seasonEffect} customText={seasonBannerText} />
      )}
      <div className="container header-inner">

        {/* Marca & Status */}
        <div className="header-brand">
          <Link href="/" className="header-logo-link">
            <div className="header-logo-img">
              <img
                src="/logo.png"
                alt={storeName}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div className="header-brand-text">
              <span className="header-store-name">{storeName}</span>
              <span className="header-store-sub">Cardápio Digital &amp; Pedidos</span>
            </div>
          </Link>
          {/* Badge de status: some em telas muito pequenas, aparece no centro */}
          <div className="header-status-desktop">
            <StoreStatusBadge />
          </div>
        </div>

        {/* Controles: Status (mobile), Idioma, Tema, Carrinho */}
        <div className="header-controls">
          {/* Status badge aparece aqui só no mobile, junto dos controles */}
          <div className="header-status-mobile">
            <StoreStatusBadge />
          </div>

          {/* Seletor de idioma: visível apenas em telas maiores */}
          <div className="header-lang">
            <LanguageSelector />
          </div>

          <ThemeToggle />

          {/* Link Meus Pedidos — visível em telas médias+ */}
          <Link
            href="/meus-pedidos"
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 'var(--radius-full)', display: 'none' }}
            id="header-meus-pedidos"
          >
            <span>Meus Pedidos</span>
          </Link>
          <style>{`
            @media (min-width: 600px) { #header-meus-pedidos { display: inline-flex !important; } }
          `}</style>

          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            className="btn btn-primary btn-sm header-cart-btn"
            aria-label="Abrir carrinho"
          >
            <ShoppingBag size={18} />
            <span className="header-cart-label">
              {totalItemCount > 0 ? formattedSubtotal : t.common.cart}
            </span>
            {totalItemCount > 0 && (
              <span className="header-cart-badge">
                {totalItemCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
}
