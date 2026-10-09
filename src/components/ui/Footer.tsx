'use client';

import React from 'react';
import Link from 'next/link';
import { Phone, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        padding: '3rem 0 2rem 0',
        marginTop: '4rem',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '2.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Identidade */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Açaí Daiane
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              O açaí artesanal mais cremoso da região, preparado com ingredientes selecionados e entrega rápida e segura.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <ShieldCheck size={16} style={{ color: 'var(--brand-primary)' }} />
              <span>Pedidos com confirmação segura e Pix online</span>
            </div>
          </div>

          {/* Atendimento & Localização */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Atendimento & Endereço
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <MapPin size={16} style={{ marginTop: '0.2rem', flexShrink: 0, color: 'var(--brand-primary)' }} />
                <span>Av. Conselheiro Aguiar, 1450 - Boa Viagem, Recife - PE</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <Phone size={16} style={{ flexShrink: 0, color: 'var(--brand-primary)' }} />
                <span>WhatsApp: (81) 99999-8888</span>
              </li>
            </ul>
          </div>

          {/* Horários */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Horários de Funcionamento
            </h4>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <Clock size={16} style={{ marginTop: '0.2rem', flexShrink: 0, color: 'var(--brand-primary)' }} />
              <div>
                <p>Segunda a Quinta: 13:00 às 22:30</p>
                <p>Sexta a Domingo: 13:00 às 23:30</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Fuso horário oficial: America/Recife
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <p>© {new Date().getFullYear()} Açaí da Daiane. Todos os direitos reservados.</p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/" style={{ color: 'var(--text-muted)' }}>Cardápio</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
