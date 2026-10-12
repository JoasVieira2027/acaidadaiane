'use client';

import React from 'react';
import { MapPin, ShoppingBag, Percent, ChevronRight, Plus, Minus, Trash2, Clock, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { StoreCurrentStatus, StoreSettings } from '@/lib/types';

type DesktopSidebarCartProps = {
  storeStatus: StoreCurrentStatus | null;
  settings: StoreSettings | null;
  onOpenDeliveryFee: () => void;
  onOpenCoupon: () => void;
  onOpenStoreInfo: () => void;
};

export function DesktopSidebarCart({
  storeStatus,
  settings,
  onOpenDeliveryFee,
  onOpenCoupon,
  onOpenStoreInfo,
}: DesktopSidebarCartProps) {
  const {
    items,
    updateQuantity,
    removeItem,
    neighborhood,
    coupon,
    subtotal,
    deliveryFee,
    discountAmount,
    totalAmount,
    setIsCheckoutModalOpen,
  } = useCart();

  const isStoreOpen = storeStatus ? storeStatus.isOpen : true;

  const formattedSubtotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(subtotal);

  const formattedDelivery = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(deliveryFee);

  const formattedDiscount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(discountAmount);

  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(totalAmount);

  return (
    <aside className="desktop-sidebar-cart" aria-label="Sacola de compras">
      <div className="desktop-sidebar-card">
        
        {/* 1. Linha de Calcular Taxa de Entrega */}
        <button
          type="button"
          onClick={onOpenDeliveryFee}
          className="desktop-sidebar-row"
          style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <MapPin size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {neighborhood ? `Entrega em: ${neighborhood.name}` : 'Calcular taxa e tempo de entrega'}
              </span>
              {neighborhood && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Taxa: {Number(neighborhood.delivery_fee) === 0 ? 'Grátis' : formattedDelivery}
                </div>
              )}
            </div>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
        </button>

        <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />

        {/* 2. Área Central da Sacola */}
        {items.length === 0 ? (
          <div className="desktop-sidebar-empty">
            <ShoppingBag size={54} strokeWidth={1.2} style={{ color: '#94a3b8' }} />
            <span style={{ marginTop: '0.75rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Sacola vazia
            </span>
          </div>
        ) : (
          <div style={{ padding: '0.75rem 1rem', maxHeight: '340px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((item) => {
                const itemTotal = typeof item.total_price === 'number'
                  ? item.total_price
                  : (item.unit_price + (item.selected_options?.reduce((acc, o) => acc + (o.price || 0), 0) || 0)) * item.quantity;
                return (
                  <div
                    key={item.cart_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      paddingBottom: '0.65rem',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.product.name}
                      </div>
                      {item.selected_options && item.selected_options.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.selected_options.map((o) => o.option_name).join(', ')}
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: '3px' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemTotal)}
                      </div>
                    </div>

                    {/* Controles de Quantidade */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cart_id, item.quantity - 1)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-primary)',
                        }}
                        aria-label="Diminuir"
                      >
                        {item.quantity === 1 ? <Trash2 size={12} style={{ color: 'var(--danger)' }} /> : <Minus size={12} />}
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cart_id, item.quantity + 1)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-primary)',
                        }}
                        aria-label="Aumentar"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totais */}
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal</span>
                <span>{formattedSubtotal}</span>
              </div>
              {deliveryFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Taxa de entrega</span>
                  <span>{formattedDelivery}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Desconto {coupon ? `(${coupon.code})` : ''}</span>
                  <span>-{formattedDiscount}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  paddingTop: '0.4rem',
                  borderTop: '1px dashed var(--border-color)',
                }}
              >
                <span>Total</span>
                <span>{formattedTotal}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />

        {/* 3. Linha de Cupom */}
        <button
          type="button"
          onClick={onOpenCoupon}
          className="desktop-sidebar-row"
          style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Percent size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {coupon ? `Cupom aplicado: ${coupon.code}` : 'Tem um cupom?'}
              </span>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {coupon ? 'Clique para alterar ou remover' : 'Clique e insira o código'}
              </div>
            </div>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
        </button>

        {/* 4. Botão de Ação Inferior */}
        <div style={{ padding: '0.75rem 1rem 1rem' }}>
          {!isStoreOpen ? (
            <button
              type="button"
              onClick={onOpenStoreInfo}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'opacity 0.15s ease',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
              }}
            >
              Estabelecimento fechado
            </button>
          ) : items.length === 0 ? (
            <button
              type="button"
              disabled
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'not-allowed',
                textAlign: 'center',
              }}
            >
              Adicione itens para pedir
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCheckoutModalOpen(true)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'filter 0.15s ease',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              Finalizar Pedido • {formattedTotal}
            </button>
          )}
        </div>

      </div>
    </aside>
  );
}
