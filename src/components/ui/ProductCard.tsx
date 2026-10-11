'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Flame, Sparkles, Tag, Ban } from 'lucide-react';
import { Product } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';

type ProductCardProps = {
  product: Product;
  onSelect: (product: Product) => void;
};

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const { t, localize } = useLanguage();

  const name = localize(product, 'name');
  const description = localize(product, 'description');

  const hasPromo = product.is_promo_active && product.promotional_price;
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;

  // Se tem tamanhos, o preço exibido é o menor tamanho com preço > 0 (ou o preço base do produto)
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
      {/* Container da Imagem com Badges */}
      <div className="product-card-img-wrap">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={name}
            fill
            sizes="(max-width: 768px) 110px, (max-width: 1200px) 33vw, 280px"
            className="product-card-img"
            priority={product.is_featured}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              textAlign: 'center',
              padding: '0.5rem',
            }}
          >
            Açaí Daiane
          </div>
        )}

        {/* Badges de Destaque */}
        <div
          style={{
            position: 'absolute',
            top: '0.45rem',
            left: '0.45rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            zIndex: 2,
          }}
        >
          {hasPromo && (
            <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
              <Tag size={11} />
              <span>Promoção</span>
            </span>
          )}
          {product.is_bestseller && (
            <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
              <Flame size={11} />
              <span>Mais Vendido</span>
            </span>
          )}
          {product.is_new && (
            <span className="badge badge-brand" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
              <Sparkles size={11} />
              <span>Novidade</span>
            </span>
          )}
        </div>

        {/* Overlay se indisponível */}
        {!product.is_available && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '0.3rem',
              color: '#ffffff',
              padding: '0.5rem',
              textAlign: 'center',
              zIndex: 3,
            }}
          >
            <Ban size={20} style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              {t.common.unavailable}
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo do Card */}
      <div className="product-card-body">
        <div>
          <h3 className="product-card-title">{name}</h3>
          {description && <p className="product-card-desc">{description}</p>}
        </div>

        {/* Badges de Tamanhos */}
        {hasSizes && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
            {product.sizes!.map((size, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.2rem 0.5rem',
                  backgroundColor: 'var(--bg-accent-subtle)',
                  border: '1px solid var(--brand-primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.7rem',
                  lineHeight: 1.3,
                }}
              >
                <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>{size.label}</span>
                {size.volume && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{size.volume}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Preço e Botão */}
        <div className="product-card-footer">
          <div>
            {hasPromo && formattedOldPrice && (
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  textDecoration: 'line-through',
                  display: 'block',
                  lineHeight: 1,
                  marginBottom: '2px',
                }}
              >
                {formattedOldPrice}
              </span>
            )}
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: hasPromo ? 'var(--danger)' : 'var(--brand-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {minSizePrice !== null && !hasPromo && <span style={{ fontSize: '0.7rem', fontWeight: 500, marginRight: '2px' }}>a partir de</span>}
              {formattedPrice}
            </span>
          </div>

          <button
            type="button"
            disabled={!product.is_available}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="btn btn-primary btn-sm product-card-btn"
            style={{
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
            aria-label={`Personalizar ${name}`}
          >
            <Plus size={15} />
            <span>{t.menu.selectOptions}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
