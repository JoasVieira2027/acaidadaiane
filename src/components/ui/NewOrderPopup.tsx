'use client';

import React, { useEffect, useRef } from 'react';
import { ShoppingBag, X, Bell } from 'lucide-react';

interface NewOrderPopupProps {
  count: number;
  latestCode: string;
  onClose: () => void;
  onView: () => void;
}

export function NewOrderPopup({ count, latestCode, onClose, onView }: NewOrderPopupProps) {
  const originalTitle = useRef<string>('');

  // Pisca o título da aba do navegador para chamar atenção mesmo fora da janela
  useEffect(() => {
    originalTitle.current = document.title;
    let blink = false;
    const interval = setInterval(() => {
      document.title = blink ? `🔔 NOVO PEDIDO #${latestCode}!` : originalTitle.current;
      blink = !blink;
    }, 800);
    return () => {
      clearInterval(interval);
      document.title = originalTitle.current;
    };
  }, [latestCode]);

  // Auto-fecha após 12 segundos
  useEffect(() => {
    const t = setTimeout(onClose, 12000);
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
        maxWidth: '360px',
        width: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 0 0 3px #ef4444, 0 12px 40px rgba(239,68,68,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        animation: 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes progressShrink {
          from { width: 100%; }
          to   { width: 0%;   }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70%  { box-shadow: 0 0 0 14px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes bellShake {
          0%,100% { transform: rotate(0deg); }
          15%      { transform: rotate(18deg); }
          30%      { transform: rotate(-16deg); }
          45%      { transform: rotate(14deg); }
          60%      { transform: rotate(-10deg); }
          75%      { transform: rotate(6deg); }
        }
      `}</style>

      {/* Header vermelho urgente */}
      <div
        style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          padding: '1.1rem 1rem 0.9rem',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Ícone pulsante */}
          <div
            style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              animation: 'pulseRing 1.2s infinite',
            }}
          >
            <Bell
              size={22}
              color="#fff"
              style={{ animation: 'bellShake 0.6s ease-in-out infinite' }}
            />
          </div>
          <div>
            <p style={{
              color: '#fecaca',
              fontSize: '0.7rem',
              margin: 0,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              ⚡ Pedido novo chegou!
            </p>
            <p style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 900, margin: '0.1rem 0 0' }}>
              #{latestCode}
              {count > 1 && (
                <span style={{ fontSize: '0.82rem', fontWeight: 600, marginLeft: '0.4rem', opacity: 0.85 }}>
                  (+{count - 1} mais)
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
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
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary, #a1a1b5)', lineHeight: 1.45 }}>
          Um cliente acabou de realizar um pedido. Confirme e inicie a preparacao o quanto antes!
        </p>
        <button
          onClick={onView}
          style={{
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            border: 'none',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            letterSpacing: '0.02em',
          }}
        >
          <ShoppingBag size={17} />
          Ver Pedido Agora
        </button>
      </div>

      {/* Barra de progresso */}
      <div style={{ height: '5px', background: 'var(--bg-tertiary, #2a2a3e)' }}>
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #dc2626, #f87171)',
            animation: 'progressShrink 12s linear forwards',
          }}
        />
      </div>
    </div>
  );
}
