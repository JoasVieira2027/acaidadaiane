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

  // Se tem tamanhos, o menor tamanho com preço > 0
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
      {/* Corpo do card (Lado Esquerdo: Título, Descrição, Preço) */}
      <div className="product-card-body">
        <div style={{ minWidth: 0 }}>
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

      {/* Imagem do Produto (Lado Direito: Thumbnail com cantos arredondados) */}
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

        {/* Badges de Destaque */}
        {(hasPromo || product.is_bestseller || product.is_new) && (
          <div className="product-card-badges">
            {hasPromo && (
              <span className="badge badge-danger" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                <Tag size={10} />
                <span>Promo</span>
              </span>
            )}
            {product.is_bestseller && (
              <span className="badge badge-warning" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                <Flame size={10} />
              </span>
            )}
            {product.is_new && (
              <span className="badge badge-brand" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                <Sparkles size={10} />
              </span>
            )}
          </div>
        )}

        {/* Faixa diagonal de Esgotado */}
        {!product.is_available && (
          <div className="product-card-esgotado-ribbon">
            <span>Esgotado</span>
          </div>
        )}
      </div>
    </div>
  );
}
