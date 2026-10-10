'use client';

import React, { useEffect, useState } from 'react';
import { X, Trash2, Plus, Minus, Tag, MapPin, AlertCircle, ShoppingBag, Pencil } from 'lucide-react';
import { CartItem, Neighborhood, StoreCurrentStatus } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { ProductModal } from './ProductModal';

export function CartDrawer() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    orderType,
    setOrderType,
    neighborhood,
    setNeighborhood,
    coupon,
    applyCoupon,
    removeCoupon,
    subtotal,
    deliveryFee,
    discountAmount,
    totalAmount,
    isFreeDeliveryEligible,
    minOrderDifference,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    setIsCheckoutModalOpen,
  } = useCart();

  const { t } = useLanguage();

  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreCurrentStatus | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  useEffect(() => {
    fetch('/api/store-status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStoreStatus(data.status);
        }
      })
      .catch(() => {});

    // Carregar bairros atualizados do Supabase/API
    fetch('/api/neighborhoods', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.neighborhoods)) {
          setNeighborhoods(data.neighborhoods.filter((n: Neighborhood) => n.is_active));
        } else {
          import('@/lib/data/mockData').then((mod) => {
            setNeighborhoods(mod.initialNeighborhoods.filter((n) => n.is_active));
          });
        }
      })
      .catch(() => {
        import('@/lib/data/mockData').then((mod) => {
          setNeighborhoods(mod.initialNeighborhoods.filter((n) => n.is_active));
        });
      });
  }, []);

  if (!isCartDrawerOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponFeedback(null);

    const res = await applyCoupon(couponInput.trim());
    setCouponLoading(false);
    if (res.success) {
      setCouponFeedback({ message: res.message, isError: false });
      setCouponInput('');
    } else {
      setCouponFeedback({ message: res.message, isError: true });
    }
  };

  const handleCheckoutClick = () => {
    if (minOrderDifference > 0) return;
    setIsCartDrawerOpen(false);
    setIsCheckoutModalOpen(true);
  };

  const isStoreClosed = storeStatus ? !storeStatus.isOpen : false;

  return (
    <div className="drawer-overlay" onClick={() => setIsCartDrawerOpen(false)}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        {/* Topo do Carrinho */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={20} style={{ color: 'var(--brand-primary)' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t.cart.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(false)}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', padding: '0.45rem' }}
            aria-label="Fechar carrinho"
          >
            <X size={18} />
          </button>
        </div>

        {/* Aviso se a loja estiver fechada */}
        {isStoreClosed && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{t.cart.storeClosedWarning}</span>
          </div>
        )}

        {/* Lista de Itens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {items.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                textAlign: 'center',
                padding: '2rem',
              }}
            >
              <ShoppingBag size={48} strokeWidth={1.5} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, fontSize: '1rem' }}>{t.common.emptyCart}</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Explore nossos copos e tigelas para adicionar opções deliciosas!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item) => (
                <div
                  key={item.cart_id}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.product.name}</h4>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        R$ {item.unit_price.toFixed(2)} cada
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="btn btn-sm"
                        style={{
                          color: 'var(--brand-primary)',
                          padding: '0.25rem 0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        title="Editar acompanhamentos e opções"
                      >
                        <Pencil size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.cart_id)}
                        className="btn btn-sm"
                        style={{ color: 'var(--danger)', padding: '0.25rem' }}
                        title="Remover item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Complementos Selecionados - agrupados por grupo */}
                  {item.selected_options && item.selected_options.length > 0 && (() => {
                    // Agrupar opções pelo nome do grupo
                    const grouped = item.selected_options.reduce<Record<string, { names: string[]; extraTotal: number }>>((acc, opt) => {
                      if (!acc[opt.group_name]) acc[opt.group_name] = { names: [], extraTotal: 0 };
                      const label = opt.quantity > 1 ? `${opt.option_name} ×${opt.quantity}` : opt.option_name;
                      acc[opt.group_name].names.push(label);
                      acc[opt.group_name].extraTotal += opt.price * opt.quantity;
                      return acc;
                    }, {});

                    return (
                      <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {Object.entries(grouped).map(([groupName, { names, extraTotal }]) => (
                          <div key={groupName} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.03em', flexShrink: 0 }}>
                              {groupName}:
                            </span>
                            <span>
                              {names.join(', ')}
                              {extraTotal > 0 && <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}> (+R$ {extraTotal.toFixed(2)})</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {item.notes && (
                    <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Obs: {item.notes}
                    </p>
                  )}

                  {/* Stepper de quantidade do item */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '0.75rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.2rem 0.5rem',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cart_id, item.quantity - 1)}
                        style={{ padding: '0.2rem', color: 'var(--text-primary)' }}
                      >
                        <Minus size={13} />
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, minWidth: '18px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cart_id, item.quantity + 1)}
                        style={{ padding: '0.2rem', color: 'var(--text-primary)' }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                      R$ {item.total_price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé e Fechamento de Pedido */}
        {items.length > 0 && (
          <div
            style={{
              padding: '1.25rem',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Modalidade de Entrega */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  className={`btn btn-sm ${orderType === 'delivery' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  {t.cart.delivery}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('pickup')}
                  className={`btn btn-sm ${orderType === 'pickup' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  {t.cart.pickup}
                </button>
              </div>

              {/* Seletor de Bairro se for entrega */}
              {orderType === 'delivery' && (
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <select
                    className="form-select"
                    value={neighborhood?.id || ''}
                    onChange={(e) => {
                      const found = neighborhoods.find((n) => n.id === e.target.value);
                      setNeighborhood(found || null);
                    }}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  >
                    <option value="">{t.cart.selectNeighborhood}</option>
                    {neighborhoods.map((nb) => (
                      <option key={nb.id} value={nb.id}>
                        {nb.name} (Taxa: R$ {nb.delivery_fee.toFixed(2)})
                      </option>
                    ))}
                  </select>

                  {neighborhood?.free_delivery_threshold && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem' }}>
                      {t.cart.freeDeliveryAbove} R$ {neighborhood.free_delivery_threshold.toFixed(2)}
                      {isFreeDeliveryEligible && ' (Qualificado!)'}
                    </p>
                  )}

                  {minOrderDifference > 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                      Faltam R$ {minOrderDifference.toFixed(2)} para o pedido mínimo deste bairro.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Cupom de Desconto */}
            <div>
              {coupon ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-accent-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-primary)' }}>
                    <Tag size={16} />
                    <span>Cupom: {coupon.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    {t.cart.removeCoupon}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={t.cart.couponCode}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !couponInput.trim()}
                    className="btn btn-secondary btn-sm"
                  >
                    {t.cart.applyCoupon}
                  </button>
                </form>
              )}

              {couponFeedback && (
                <p
                  style={{
                    fontSize: '0.75rem',
                    marginTop: '0.35rem',
                    color: couponFeedback.isError ? 'var(--danger)' : 'var(--success)',
                  }}
                >
                  {couponFeedback.message}
                </p>
              )}
            </div>

            {/* Resumo Financeiro */}
            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.common.subtotal}</span>
                <span style={{ fontWeight: 600 }}>R$ {subtotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>{t.common.discount}</span>
                  <span style={{ fontWeight: 600 }}>- R$ {discountAmount.toFixed(2)}</span>
                </div>
              )}

              {orderType === 'delivery' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t.common.deliveryFee}</span>
                  <span style={{ fontWeight: 600 }}>
                    {deliveryFee === 0 ? t.common.free : `R$ ${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  marginTop: '0.35rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <span>{t.common.total}</span>
                <span style={{ color: 'var(--brand-primary)' }}>R$ {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Botão de Finalização */}
            <button
              type="button"
              disabled={isStoreClosed || (orderType === 'delivery' && !neighborhood) || minOrderDifference > 0}
              onClick={handleCheckoutClick}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              {t.cart.checkoutButton}
            </button>
          </div>
        )}
      </div>

      {/* Modal de Edição de Acompanhamentos do Item */}
      {editingItem && (
        <ProductModal
          product={editingItem.product}
          editingCartItem={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
