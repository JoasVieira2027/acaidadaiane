'use client';

import React, { useState } from 'react';
import { X, Tag, Check, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';

type CouponModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CouponModal({ isOpen, onClose }: CouponModalProps) {
  const { coupon, applyCoupon, removeCoupon } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setLoading(true);
    setFeedback(null);
    try {
      const result = await applyCoupon(couponCode);
      setFeedback({ message: result.message, isError: !result.success });
      if (result.success) {
        setCouponCode('');
        setTimeout(() => onClose(), 1200);
      }
    } catch {
      setFeedback({ message: 'Erro ao validar cupom.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-accent-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Tag size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Cupom de Desconto
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Insira seu código promocional
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {coupon ? (
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Cupom ativo</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--success)' }}>
                  {coupon.code}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {coupon.discount_type === 'percentage'
                    ? `${coupon.discount_value}% de desconto`
                    : `R$ ${coupon.discount_value.toFixed(2).replace('.', ',')} de desconto`}
                </div>
              </div>
              <button
                type="button"
                onClick={removeCoupon}
                className="btn btn-danger btn-sm"
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                <Trash2 size={14} />
                <span>Remover</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="DIGITE SEU CUPOM"
                  className="form-input"
                  style={{
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '16px',
                  }}
                  autoFocus
                />
              </div>

              {feedback && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    color: feedback.isError ? 'var(--danger)' : 'var(--success)',
                  }}
                >
                  {feedback.isError ? <AlertCircle size={15} /> : <Check size={15} />}
                  <span>{feedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !couponCode.trim()}
                className="btn btn-primary"
                style={{
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  justifyContent: 'center',
                  fontWeight: 800,
                }}
              >
                {loading ? 'Validando...' : 'Aplicar Cupom'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
