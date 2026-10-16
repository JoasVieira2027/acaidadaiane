'use client';

import React, { useEffect } from 'react';
import { ShoppingBag, X } from 'lucide-react';

interface NewOrderPopupProps {
  count: number;
  latestCode: string;
  onClose: () => void;
  onView: () => void;
}

export function NewOrderPopup({ count, latestCode, onClose, onView }: NewOrderPopupProps) {
  // Auto-fecha apos 8 segundos
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        maxWidth: '340px',
        width: '100%',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(124,58,237,0.15)',
        animation: 'slideInRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes progressShrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      {/* Header roxo */}
      <div
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          padding: '1rem 1rem 0.75rem',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShoppingBag size={20} color="#fff" />
          </div>
          <div>
            <p style={{ color: '#ede9fe', fontSize: '0.72rem', margin: 0, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Novo pedido recebido!
            </p>
            <p style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 800, margin: '0.1rem 0 0' }}>
              #{latestCode}
              {count > 1 && (
                <span style={{ fontSize: '0.8rem', fontWeight: 600, marginLeft: '0.4rem', opacity: 0.85 }}>
                  (+{count - 1} mais)
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
            transition: 'background 0.15s',
          }}
          aria-label="Fechar"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          background: 'var(--bg-secondary, #1e1e2e)',
          padding: '0.9rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #a1a1b5)', lineHeight: 1.4 }}>
          Um cliente acabou de realizar um pedido. Acesse o painel para confirmar e iniciar a preparacao!
        </p>
        <button
          onClick={onView}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.6rem 1rem',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'opacity 0.15s',
          }}
        >
          <ShoppingBag size={15} />
          Ver Pedidos Agora
        </button>
      </div>

      {/* Barra de progresso animada */}
      <div style={{ height: '4px', background: 'var(--bg-tertiary, #2a2a3e)' }}>
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
            animation: 'progressShrink 8s linear forwards',
          }}
        />
      </div>
    </div>
  );
}
