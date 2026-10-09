'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { Locale, useLanguage } from '@/context/LanguageContext';

export function LanguageSelector() {
  const { locale, setLocale } = useLanguage();

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
      <Globe size={16} style={{ color: 'var(--text-muted)' }} />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Selecionar idioma"
        style={{
          background: 'transparent',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontSize: '0.8rem',
          fontWeight: 600,
          padding: '0.25rem 0.4rem',
          cursor: 'pointer',
        }}
      >
        <option value="pt">PT</option>
        <option value="en">EN</option>
        <option value="es">ES</option>
      </select>
    </div>
  );
}
