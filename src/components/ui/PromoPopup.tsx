'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Tag } from 'lucide-react';
import { Product } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';

type PromoPopupProps = {
  products: Product[];
  onSelectProduct: (product: Product) => void;
};

export function PromoPopup({ products, onSelectProduct }: PromoPopupProps) {
  const { localize } = useLanguage();
  const [visible, setVisible] = useState(false);

  const promoProducts = products.filter(
    (p) => p.is_available && p.is_promo_active && (
      Boolean(p.promotional_price) || Boolean(p.promo_applies_to_sizes && p.promo_percent)
    )
  );

  useEffect(() => {
    if (promoProducts.length === 0) return;
    // Mostra o popup após 800ms do carregamento
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoProducts.length]);

  if (!visible || promoProducts.length === 0) return null;

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const discount = (original: number, promo: number) =>
    Math.round(((original - promo) / original) * 100);

  return (
    <div
      className="modal-overlay"
      onClick={() => setVisible(false)}
      style={{ zIndex: 1100, alignItems: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUpIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Tag size={16} style={{ color: 'var(--danger)' }} />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Promoções</h2>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
            aria-label="Fechar promoções"
          >
            <X size={16} />
          </button>
        </div>

        {/* Lista de produtos em promoção */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {promoProducts.map((product) => {
            const name = localize(product, 'name');
            const hasSizePromo = Boolean(product.promo_applies_to_sizes && product.promo_percent);
            let promoPrice = product.promotional_price || 0;
            let originalPrice = product.price;
            let pct = 0;

            if (hasSizePromo && product.sizes && product.sizes.length > 0) {
              const minSize = product.sizes.reduce((min, s) => s.price < min.price ? s : min, product.sizes[0]);
              originalPrice = minSize.price;
              promoPrice = minSize.promo_price ?? Number((minSize.price * (1 - (product.promo_percent || 0) / 100)).toFixed(2));
              pct = product.promo_percent || discount(originalPrice, promoPrice);
            } else {
              pct = discount(originalPrice, promoPrice);
            }

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  setVisible(false);
                  onSelectProduct(product);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  width: '100%',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                  borderBottomWidth: '1px',
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'var(--border-color)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                {/* Corpo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                      marginBottom: '0.5rem',
                      textAlign: 'left',
                    }}
                  >
                    {name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a' }}>
                      {hasSizePromo ? `A partir de ${fmt(promoPrice)}` : fmt(promoPrice)}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                      {fmt(originalPrice)}
                    </span>
                    {pct > 0 && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#16a34a',
                          backgroundColor: '#dcfce7',
                          padding: '0.1rem 0.4rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        -{pct}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Imagem */}
                {product.image_url ? (
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      position: 'relative',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <Image
                      src={product.image_url}
                      alt={name}
                      fill
                      sizes="80px"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-tertiary)',
                      flexShrink: 0,
                      border: '1px solid var(--border-color)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Rodapé */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setVisible(false)}
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Ver cardápio completo
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
