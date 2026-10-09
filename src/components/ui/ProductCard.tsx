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
  const currentPrice = hasPromo ? product.promotional_price! : product.price;

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(currentPrice);

  const formattedOldPrice = product.price
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(product.price)
    : null;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        opacity: product.is_available ? 1 : 0.75,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Imagem do Produto com Badges */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '190px',
          backgroundColor: 'var(--bg-tertiary)',
        }}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
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
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            Açaí Daiane
          </div>
        )}

        {/* Badges de destaque superiores */}
        <div
          style={{
            position: 'absolute',
            top: '0.65rem',
            left: '0.65rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            zIndex: 2,
          }}
        >
          {hasPromo && (
            <span className="badge badge-danger">
              <Tag size={12} />
              <span>Promoção</span>
            </span>
          )}
          {product.is_bestseller && (
            <span className="badge badge-warning">
              <Flame size={12} />
              <span>Mais Vendido</span>
            </span>
          )}
          {product.is_new && (
            <span className="badge badge-brand">
              <Sparkles size={12} />
              <span>Novidade</span>
            </span>
          )}
        </div>

        {/* Overlay caso esteja indisponível */}
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
              gap: '0.4rem',
              color: '#ffffff',
              padding: '1rem',
              textAlign: 'center',
              zIndex: 3,
            }}
          >
            <Ban size={24} style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              {t.common.unavailable}
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo textual */}
      <div
        style={{
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '0.35rem',
              lineHeight: 1.3,
            }}
          >
            {name}
          </h3>
          {description && (
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                lineHeight: 1.45,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: '1rem',
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Preço e Botão de Ação */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            marginTop: 'auto',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div>
            {hasPromo && formattedOldPrice && (
              <span
                style={{
                  fontSize: '0.75rem',
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
                fontSize: '1.15rem',
                fontWeight: 800,
                color: hasPromo ? 'var(--danger)' : 'var(--text-primary)',
              }}
            >
              {formattedPrice}
            </span>
          </div>

          <button
            type="button"
            disabled={!product.is_available}
            onClick={() => onSelect(product)}
            className="btn btn-primary btn-sm"
            aria-label={`Personalizar ${name}`}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.45rem 0.85rem' }}
          >
            <Plus size={16} />
            <span>{t.menu.selectOptions}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
