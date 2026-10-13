'use client';

import React from 'react';
import { Home, Percent, ShoppingBag, User, MapPin } from 'lucide-react';
import { useCart } from '@/context/CartContext';

type MobileBottomNavProps = {
  activeTab?: 'home' | 'frete' | 'promo' | 'orders' | 'profile';
  onOpenPromo: () => void;
  onOpenProfile: () => void;
  onGoHome: () => void;
  onOpenDeliveryFee: () => void;
};

export function MobileBottomNav({
  activeTab = 'home',
  onOpenPromo,
  onOpenProfile,
  onGoHome,
  onOpenDeliveryFee,
}: MobileBottomNavProps) {
  const { totalItemCount, setIsCartDrawerOpen } = useCart();

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Navegação inferior mobile"
    >
      {/* 1. Início */}
      <button
        type="button"
        onClick={onGoHome}
        className={`mobile-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
        aria-label="Início"
      >
        <Home size={20} strokeWidth={activeTab === 'home' ? 2.4 : 1.8} />
        <span className="mobile-nav-label">Início</span>
      </button>

      {/* 2. Taxa e Frete */}
      <button
        type="button"
        onClick={onOpenDeliveryFee}
        className={`mobile-nav-btn ${activeTab === 'frete' ? 'active' : ''}`}
        aria-label="Taxa e Frete de Entrega"
      >
        <MapPin size={20} strokeWidth={activeTab === 'frete' ? 2.4 : 1.8} />
        <span className="mobile-nav-label">Frete</span>
      </button>

      {/* 3. Promoções */}
      <button
        type="button"
        onClick={onOpenPromo}
        className={`mobile-nav-btn ${activeTab === 'promo' ? 'active' : ''}`}
        aria-label="Promoções"
      >
        <div style={{ position: 'relative' }}>
          <Percent size={20} strokeWidth={activeTab === 'promo' ? 2.4 : 1.8} />
        </div>
        <span className="mobile-nav-label">Promoções</span>
      </button>

      {/* 4. Pedidos / Carrinho */}
      <button
        type="button"
        onClick={() => setIsCartDrawerOpen(true)}
        className={`mobile-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
        aria-label="Pedidos e Carrinho"
      >
        <div style={{ position: 'relative' }}>
          <ShoppingBag size={20} strokeWidth={activeTab === 'orders' ? 2.4 : 1.8} />
          {totalItemCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-8px',
                backgroundColor: 'var(--brand-primary)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 800,
                borderRadius: '999px',
                minWidth: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {totalItemCount}
            </span>
          )}
        </div>
        <span className="mobile-nav-label">Pedidos</span>
      </button>

      {/* 5. Perfil / Informações da loja */}
      <button
        type="button"
        onClick={onOpenProfile}
        className={`mobile-nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
        aria-label="Perfil e Informações"
      >
        <User size={20} strokeWidth={activeTab === 'profile' ? 2.4 : 1.8} />
        <span className="mobile-nav-label">Perfil</span>
      </button>
    </nav>
  );
}
