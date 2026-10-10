'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { StoreSettings, BusinessHour } from '@/lib/types';
import { initialSettings, initialBusinessHours } from '@/lib/data/mockData';

function formatPhoneNumber(phone?: string) {
  if (!phone) return '(81) 99999-8888';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    return `(${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12 && clean.startsWith('55')) {
    return `(${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

function formatBusinessHoursList(hours: BusinessHour[]) {
  if (!hours || hours.length === 0) {
    return [
      'Segunda a Quinta: 13:00 às 22:30',
      'Sexta a Domingo: 13:00 às 23:30',
    ];
  }

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const weekOrder = [1, 2, 3, 4, 5, 6, 0]; // Começa na Segunda e termina no Domingo

  const sorted = weekOrder.map((dayIndex) => {
    const found = hours.find((h) => Number(h.day_of_week) === dayIndex);
    return {
      dayIndex,
      name: dayNames[dayIndex],
      is_closed: found ? Boolean(found.is_closed) : false,
      open_time: found?.open_time || '13:00',
      close_time: found?.close_time || '22:30',
    };
  });

  const groups: Array<{
    days: string[];
    is_closed: boolean;
    open_time: string;
    close_time: string;
  }> = [];

  for (const item of sorted) {
    const lastGroup = groups[groups.length - 1];
    const sameSchedule =
      lastGroup &&
      lastGroup.is_closed === item.is_closed &&
      lastGroup.open_time === item.open_time &&
      lastGroup.close_time === item.close_time;

    if (sameSchedule) {
      lastGroup.days.push(item.name);
    } else {
      groups.push({
        days: [item.name],
        is_closed: item.is_closed,
        open_time: item.open_time,
        close_time: item.close_time,
      });
    }
  }

  return groups.map((g) => {
    let dayLabel = '';
    if (g.days.length === 7) {
      dayLabel = 'Todos os dias';
    } else if (g.days.length === 1) {
      dayLabel = g.days[0];
    } else if (g.days.length === 2) {
      dayLabel = `${g.days[0]} e ${g.days[1]}`;
    } else {
      dayLabel = `${g.days[0]} a ${g.days[g.days.length - 1]}`;
    }

    if (g.is_closed) {
      return `${dayLabel}: Fechado`;
    }
    return `${dayLabel}: ${g.open_time} às ${g.close_time}`;
  });
}

export function Footer() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [hours, setHours] = useState<BusinessHour[]>(initialBusinessHours);

  const fetchStoreData = () => {
    fetch('/api/store-status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.settings) setSettings(data.settings);
          if (data.hours && data.hours.length > 0) setHours(data.hours);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar dados do rodapé:', err);
      });
  };

  useEffect(() => {
    fetchStoreData();

    // Sincronizar automaticamente quando usuário voltar para a aba ou atualizar configurações
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'store_settings_updated_at') {
        fetchStoreData();
      }
    };
    const handleCustomUpdate = () => fetchStoreData();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('store-settings-updated', handleCustomUpdate);
    window.addEventListener('focus', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('store-settings-updated', handleCustomUpdate);
      window.removeEventListener('focus', handleCustomUpdate);
    };
  }, []);

  const cleanWhatsapp = (settings.whatsapp_number || '5581999998888').replace(/\D/g, '');
  const waLink = `https://wa.me/${cleanWhatsapp.startsWith('55') ? cleanWhatsapp : `55${cleanWhatsapp}`}`;
  const hoursFormattedList = formatBusinessHoursList(hours);

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
              {settings.store_name || 'Açaí Daiane'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              {settings.open_message ||
                'O açaí artesanal mais cremoso da região, preparado com ingredientes selecionados e entrega rápida e segura.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <ShieldCheck size={16} style={{ color: 'var(--brand-primary)' }} />
              <span>Pedidos com confirmação segura e Pix online</span>
            </div>
          </div>

          {/* Atendimento & Localização */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Atendimento &amp; Endereço
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <MapPin size={16} style={{ marginTop: '0.2rem', flexShrink: 0, color: 'var(--brand-primary)' }} />
                <span>{settings.address_text || 'Av. Conselheiro Aguiar, 1450 - Boa Viagem, Recife - PE'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <Phone size={16} style={{ flexShrink: 0, color: 'var(--brand-primary)' }} />
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}
                  title="Conversar no WhatsApp"
                >
                  WhatsApp: {formatPhoneNumber(settings.whatsapp_number)}
                </a>
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
                {hoursFormattedList.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
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
          <p>© {new Date().getFullYear()} {settings.store_name || 'Açaí da Daiane'}. Todos os direitos reservados.</p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/" style={{ color: 'var(--text-muted)' }}>Cardápio</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
