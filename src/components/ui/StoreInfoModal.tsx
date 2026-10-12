'use client';

import React, { useEffect, useState } from 'react';
import { X, MapPin, Clock, Phone, CreditCard, ShieldCheck, Bike, Store, MessageCircle } from 'lucide-react';
import { BusinessHour, StoreCurrentStatus, StoreSettings } from '@/lib/types';

type StoreInfoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings | null;
  storeStatus: StoreCurrentStatus | null;
};

const dayNames: { [key: number]: string } = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

export function StoreInfoModal({ isOpen, onClose, settings, storeStatus }: StoreInfoModalProps) {
  const [hours, setHours] = useState<BusinessHour[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/store-status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.hours)) {
          setHours(data.hours);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDay = new Date().getDay();

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
          maxWidth: '480px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-accent-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Store size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {settings?.store_name || 'Açaí da Daiane'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Informações do estabelecimento
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

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Status Atual */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: storeStatus?.isOpen ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${storeStatus?.isOpen ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: storeStatus?.isOpen ? 'var(--success)' : 'var(--danger)',
                }}
              />
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  color: storeStatus?.isOpen ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {storeStatus?.isOpen ? 'Estabelecimento Aberto' : 'Estabelecimento Fechado'}
              </span>
            </div>
            {storeStatus && !storeStatus.isOpen && storeStatus.nextOpenTime && (
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                Abre às {storeStatus.nextOpenTime}
              </span>
            )}
          </div>

          {/* Endereço */}
          <div>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <MapPin size={15} style={{ color: 'var(--brand-primary)' }} />
              Endereço
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              {settings?.address_text || 'Recife - PE'}
            </p>
          </div>

          {/* Horários de Funcionamento */}
          <div>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Clock size={15} style={{ color: 'var(--brand-primary)' }} />
              Horário de Funcionamento
            </h4>
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const h = hours.find((item) => item.day_of_week === d);
                const isToday = currentDay === d;
                const isOpenDay = h ? !h.is_closed : true;
                const openTime = h?.open_time ? h.open_time.slice(0, 5) : '12:30';
                const closeTime = h?.close_time ? h.close_time.slice(0, 5) : '23:00';

                return (
                  <div
                    key={d}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.8rem',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: isToday ? 'var(--bg-accent-subtle)' : 'transparent',
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    <span style={{ color: isToday ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                      {dayNames[d]} {isToday && '(Hoje)'}
                    </span>
                    <span style={{ color: isOpenDay ? 'var(--text-muted)' : 'var(--danger)' }}>
                      {isOpenDay ? `${openTime} às ${closeTime}` : 'Fechado'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formas de Pagamento */}
          <div>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <CreditCard size={15} style={{ color: 'var(--brand-primary)' }} />
              Formas de Pagamento
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {settings?.accept_pix !== false && (
                <span
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  ⚡ Pix
                </span>
              )}
              {settings?.accept_card_delivery !== false && (
                <span
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  💳 Cartão na Entrega (Débito/Crédito)
                </span>
              )}
              {settings?.accept_cash !== false && (
                <span
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  💵 Dinheiro
                </span>
              )}
            </div>
          </div>

          {/* Opções de Entrega */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
              }}
            >
              <Bike size={18} style={{ color: 'var(--brand-primary)', margin: '0 auto 0.25rem' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Delivery</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>30 a 50 min</div>
            </div>
            <div
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
              }}
            >
              <Store size={18} style={{ color: 'var(--brand-primary)', margin: '0 auto 0.25rem' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Retirada no Local</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pronto em 15-25 min</div>
            </div>
          </div>
        </div>

        {/* Footer com WhatsApp */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
            display: 'flex',
            gap: '0.75rem',
          }}
        >
          {settings?.whatsapp_number && (
            <a
              href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}
            >
              <MessageCircle size={16} />
              <span>Falar no WhatsApp</span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
