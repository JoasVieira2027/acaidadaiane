'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erro global na aplicação:', error);
  }, [error]);

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
            Ops! Algo deu errado
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Ocorreu uma instabilidade temporária. Clique abaixo para recarregar ou voltar ao cardápio principal.
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
              <span>Tentar Novamente</span>
            </button>

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
