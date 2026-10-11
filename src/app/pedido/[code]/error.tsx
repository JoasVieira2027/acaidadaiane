'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, MessageSquare, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';

export default function OrderErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [storePhone, setStorePhone] = useState('5581999998888');

  useEffect(() => {
    console.error('Erro na visualização do pedido:', error);
    fetch('/api/store-status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.whatsapp_number) {
          setStorePhone(d.settings.whatsapp_number);
        }
      })
      .catch(() => {});
  }, [error]);

  const cleanPhone = (storePhone || '').replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Olá! Tive um problema ao carregar o acompanhamento do meu pedido na tela.'
  )}`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main className="container" style={{ flex: 1, padding: '3rem 1rem', maxWidth: '600px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '2rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <AlertTriangle size={32} />
          </div>

          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Não foi possível carregar o pedido
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Houve uma oscilação na conexão com o servidor. Seu pedido foi registrado no sistema, então não se preocupe!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                } else {
                  reset();
                }
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              <RefreshCw size={16} />
              <span>Recarregar Página</span>
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.85rem', backgroundColor: '#dcfce7', color: '#16a34a', border: 'none' }}
            >
              <MessageSquare size={16} />
              <span>Falar no WhatsApp da Loja</span>
            </a>

            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                marginTop: '0.75rem',
              }}
            >
              <ArrowLeft size={16} />
              <span>Voltar ao Cardápio</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
