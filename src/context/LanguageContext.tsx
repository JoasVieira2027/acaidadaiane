'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { pt } from '../locales/pt';
import { en } from '../locales/en';
import { es } from '../locales/es';

export type Locale = 'pt' | 'en' | 'es';

type Translations = typeof pt;

type LanguageContextType = {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: Translations;
  localize: <T extends Record<string, any>>(item: T, field: string) => string;
};

const translationsMap: Record<Locale, Translations> = {
  pt,
  en,
  es,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt');

  useEffect(() => {
    const saved = localStorage.getItem('acai_locale') as Locale | null;
    if (saved && (saved === 'pt' || saved === 'en' || saved === 'es')) {
      setLocaleState(saved);
    } else {
      // Tenta detectar idioma do navegador
      const browserLang = navigator.language.slice(0, 2);
      if (browserLang === 'es') setLocaleState('es');
      else if (browserLang === 'en') setLocaleState('en');
      else setLocaleState('pt');
    }
  }, []);

  const setLocale = (newLoc: Locale) => {
    setLocaleState(newLoc);
    localStorage.setItem('acai_locale', newLoc);
  };

  /**
   * Helper para pegar campo traduzido de entidade do banco (ex: name_en, name_es)
   * Se não existir no idioma atual, usa o campo padrão original em português!
   */
  const localize = <T extends Record<string, any>>(item: T, field: string): string => {
    if (!item) return '';
    if (locale === 'en' && item[`${field}_en`]) {
      return item[`${field}_en`];
    }
    if (locale === 'es' && item[`${field}_es`]) {
      return item[`${field}_es`];
    }
    return item[field] || '';
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t: translationsMap[locale] || pt,
        localize,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage deve ser usado dentro de LanguageProvider');
  }
  return context;
}
