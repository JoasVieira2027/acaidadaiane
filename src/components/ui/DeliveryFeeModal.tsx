'use client';

import React, { useEffect, useState } from 'react';
import { X, MapPin, Clock, Bike, Check, Search } from 'lucide-react';
import { Neighborhood } from '@/lib/types';
import { useCart } from '@/context/CartContext';

type DeliveryFeeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function DeliveryFeeModal({ isOpen, onClose }: DeliveryFeeModalProps) {
  const { neighborhood, setNeighborhood } = useCart();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/neighborhoods', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.neighborhoods)) {
          setNeighborhoods(data.neighborhoods.filter((n: Neighborhood) => n.is_active));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = neighborhoods.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase().trim())
  );

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
          maxWidth: '460px',
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
              <MapPin size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Taxa e tempo de entrega
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Consulte as taxas por bairro
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

        {/* Campo de Busca */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar seu bairro..."
              className="form-input"
              style={{
                paddingLeft: '2.25rem',
                fontSize: '0.85rem',
                height: '38px',
                borderRadius: 'var(--radius-md)',
              }}
            />
          </div>
        </div>

        {/* Lista de Bairros */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Carregando bairros...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhum bairro encontrado.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {filtered.map((nb) => {
                const isSelected = neighborhood?.id === nb.id;
                return (
                  <button
                    key={nb.id}
                    type="button"
                    onClick={() => {
                      setNeighborhood(nb);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--bg-accent-subtle)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {nb.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Clock size={12} />
                          30 a 50 min
                        </span>
                        {Number(nb.min_order_amount || 0) > 0 && (
                          <span>• Pedido mín: R$ {Number(nb.min_order_amount).toFixed(2).replace('.', ',')}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          color: Number(nb.delivery_fee) === 0 ? 'var(--success)' : 'var(--brand-primary)',
                        }}
                      >
                        {Number(nb.delivery_fee) === 0 ? 'Grátis' : `R$ ${Number(nb.delivery_fee).toFixed(2).replace('.', ',')}`}
                      </span>
                      {isSelected && <Check size={16} style={{ color: 'var(--brand-primary)' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Bike size={14} /> Entregas rápidas e seguras
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
