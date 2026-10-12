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

  const hasPromo = product.is_promo_active && product.promotional_price;
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;

  // Menor tamanho com preço > 0
  const sizesWithPrice = hasSizes ? product.sizes!.filter((s) => Number(s.price) > 0) : [];
  const minSizePrice = sizesWithPrice.length > 0
    ? Math.min(...sizesWithPrice.map((s) => Number(s.price)))
    : null;
  const currentPrice = hasPromo
    ? product.promotional_price!
    : minSizePrice !== null
    ? minSizePrice
    : product.price;

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(currentPrice);

  const formattedOldPrice = hasPromo && product.price
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(product.price)
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
          
          {/* Badges de Destaque Limpos e Organizados */}
          {(hasPromo || product.is_bestseller || product.is_new) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.4rem' }}>
              {hasPromo && (
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
              )}
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

          <h3 className="product-card-title">{name}</h3>
          {description && <p className="product-card-desc">{description}</p>}
        </div>

        {/* Preço no canto inferior esquerdo */}
        <div className="product-card-price-wrap">
          {hasPromo && formattedOldPrice && (
            <span className="product-card-old-price">
              {formattedOldPrice}
            </span>
          )}
          <span className={`product-card-price ${hasPromo ? 'promo-price' : ''}`}>
            {minSizePrice !== null && !hasPromo && (
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
