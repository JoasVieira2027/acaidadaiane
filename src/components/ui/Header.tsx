'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';
import { StoreStatusBadge } from './StoreStatusBadge';

export function Header() {
  const { totalItemCount, subtotal, setIsCartDrawerOpen } = useCart();
  const { t } = useLanguage();

  const formattedSubtotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(subtotal);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        transition: 'background-color 0.2s ease',
      }}
    >
      <div
        className="container"
        style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Marca & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                flexShrink: 0,
              }}
            >
              {/* Logo Oficial Açaí da Daiane */}
              <img
                src="/logo.png"
                alt="Açaí da Daiane"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.3px',
                  display: 'block',
                  lineHeight: 1.1,
                }}
              >
                Açaí da Daiane
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                Cardápio Digital & Pedidos
              </span>
            </div>
          </Link>
          <StoreStatusBadge />
        </div>

        {/* Controles: Idioma, Tema e Carrinho (Painel admin NÃO visível ao cliente) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <LanguageSelector />
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            className="btn btn-primary btn-sm"
            style={{
              padding: '0.5rem 0.95rem',
              borderRadius: 'var(--radius-full)',
              position: 'relative',
            }}
            aria-label="Abrir carrinho"
          >
            <ShoppingBag size={18} />
            <span style={{ fontWeight: 700, display: 'inline-block' }}>
              {totalItemCount > 0 ? formattedSubtotal : t.common.cart}
            </span>
            {totalItemCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--bg-primary)',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {totalItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
