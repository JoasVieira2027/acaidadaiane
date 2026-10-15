'use client';

import React from 'react';
import Image from 'next/image';
import { Flame, Sparkles, Tag } from 'lucide-react';
import { Product } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';

type ProductCardProps = {
  product: Product;
  onSelect: (product: Product) => void;
};

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const { localize } = useLanguage();

  const name = localize(product, 'name');
  const description = localize(product, 'description');

  const hasSizePromo = Boolean(product.promo_applies_to_sizes && product.is_promo_active && product.promo_percent);
  const hasPromo = (product.is_promo_active && Boolean(product.promotional_price)) || hasSizePromo;
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;

  // Menor tamanho com preço > 0
  const sizesWithPrice = hasSizes ? product.sizes!.filter((s) => Number(s.price) > 0) : [];
  const minNormalSizePrice = sizesWithPrice.length > 0
    ? Math.min(...sizesWithPrice.map((s) => Number(s.price)))
    : null;

  const minEffectiveSizePrice = sizesWithPrice.length > 0
    ? Math.min(...sizesWithPrice.map((s) => {
        if (hasSizePromo && s.promo_price != null && s.promo_price > 0) return Number(s.promo_price);
        if (hasSizePromo && product.promo_percent) return Number((s.price * (1 - product.promo_percent / 100)).toFixed(2));
        return Number(s.price);
      }))
    : null;

  const currentPrice = hasSizePromo && minEffectiveSizePrice !== null
    ? minEffectiveSizePrice
    : hasPromo && product.promotional_price
    ? product.promotional_price
    : minNormalSizePrice !== null
    ? minNormalSizePrice
    : product.price;

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(currentPrice);

  const rawOldPrice = hasSizePromo && minNormalSizePrice !== null && minEffectiveSizePrice !== null && minNormalSizePrice > minEffectiveSizePrice
    ? minNormalSizePrice
    : hasPromo && product.promotional_price && product.price
    ? product.price
    : null;

  const formattedOldPrice = rawOldPrice
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(rawOldPrice)
    : null;


  const handleClick = () => {
    if (product.is_available) {
      onSelect(product);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`product-card ${!product.is_available ? 'unavailable' : ''}`}
      role="button"
      tabIndex={product.is_available ? 0 : -1}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Selecionar ${name}`}
    >
      {/* Corpo do card (Lado Esquerdo: Badges, Título, Descrição, Preço) */}
      <div className="product-card-body">
        <div style={{ minWidth: 0 }}>
          
          {/* Badge de Esgotado ou Destaques */}
          {!product.is_available ? (
            <div style={{ marginBottom: '0.4rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #f87171',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                Esgotado
              </span>
            </div>
          ) : (hasPromo || product.is_bestseller || product.is_new) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.4rem' }}>
              {hasSizePromo ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#dc2626',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}
                >
                  <Tag size={11} />
                  <span>-{product.promo_percent}% OFF</span>
                </span>
              ) : hasPromo ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#dc2626',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}
                >
                  <Tag size={11} />
                  <span>Promoção</span>
                </span>
              ) : null}
              {product.is_bestseller && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    color: '#d97706',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                  }}
                >
                  <Flame size={11} />
                  <span>Mais Vendido</span>
                </span>
              )}
              {product.is_new && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    backgroundColor: 'rgba(124, 58, 237, 0.12)',
                    color: '#7c3aed',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: '1px solid rgba(124, 58, 237, 0.25)',
                  }}
                >
                  <Sparkles size={11} />
                  <span>Novidade</span>
                </span>
              )}
            </div>
          )}

          <h3 className="product-card-title" title={name}>{name}</h3>
          {description && (
            <p className="product-card-desc" title={description}>
              {description}
            </p>
          )}
        </div>

        {/* Preço no canto inferior esquerdo */}
        <div className="product-card-price-wrap">
          {formattedOldPrice && (
            <span className="product-card-old-price">
              {formattedOldPrice}
            </span>
          )}
          <span className={`product-card-price ${hasPromo ? 'promo-price' : ''}`}>
            {hasSizes && (
              <span className="product-card-from-text">a partir de </span>
            )}
            {formattedPrice}
          </span>
        </div>
      </div>

      {/* Imagem do Produto (Lado Direito: Foto limpa com cantos arredondados) */}
      <div className="product-card-img-wrap">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={name}
            fill
            sizes="(max-width: 768px) 90px, 100px"
            className="product-card-img"
            priority={product.is_featured}
            style={!product.is_available ? { filter: 'grayscale(60%) brightness(0.85)' } : undefined}
          />
        ) : (
          <div className="product-card-img-placeholder">
            <span>Açaí</span>
          </div>
        )}

        {/* Faixa de Esgotado quando indisponível */}
        {!product.is_available && (
          <div className="product-card-esgotado-ribbon">
            <span>Esgotado</span>
          </div>
        )}
      </div>
    </div>
  );
}
