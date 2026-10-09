'use client';

import React, { useEffect, useState } from 'react';
import { Clock, ShieldAlert, CheckCircle, Save, AlertCircle, Loader2, Power } from 'lucide-react';
import { BusinessHour, StoreSettings } from '@/lib/types';
import { initialBusinessHours, initialSettings } from '@/lib/data/mockData';

const weekdays = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export default function AdminHoursPage() {
  const [hours, setHours] = useState<BusinessHour[]>(initialBusinessHours);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/store-status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.hours && data.hours.length > 0) {
            setHours(data.hours);
          }
          if (data.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }));
          }
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar dados de funcionamento:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleUpdateHour = (index: number, field: keyof BusinessHour, value: any) => {
    setHours((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveStatusAndHours = async (newSettings?: Partial<StoreSettings>) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSavedFeedback(false);
    try {
      const payloadSettings = newSettings ? { ...settings, ...newSettings } : settings;
      const res = await fetch('/api/store-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: payloadSettings,
          hours,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.settings) setSettings(data.settings);
        if (data.hours) setHours(data.hours);
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 4000);
      } else {
        setErrorMessage(data.message || 'Erro ao salvar alterações.');
      }
    } catch (err) {
      console.error('Erro ao salvar horários:', err);
      setErrorMessage('Erro de conexão ao salvar horários.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStatusAndHours();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Horários e Funcionamento da Loja</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Gerencie os horários por dia da semana no fuso de Recife e ative aberturas ou fechamentos manuais de emergência.
        </p>
      </div>

      {savedFeedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--success-bg)',
            color: 'var(--success)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontWeight: 600,
            border: '1px solid var(--success)',
          }}
        >
          <CheckCircle size={18} />
          <span>Configurações salvas e aplicadas com sucesso no cardápio!</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontWeight: 600,
            border: '1px solid var(--danger)',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Controle Manual de Emergência */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Controle de Emergência da Loja
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Sobrescreva temporariamente a programação automática de horários se precisar fechar antes ou abrir fora de hora.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: settings.is_manually_closed ? '2px solid var(--danger)' : '1px solid var(--border-color)',
                backgroundColor: settings.is_manually_closed ? 'var(--danger-bg)' : 'var(--bg-tertiary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="store_mode"
                checked={settings.is_manually_closed}
                onChange={() =>
                  setSettings({
                    ...settings,
                    is_manually_closed: true,
                    is_manually_opened: false,
                  })
                }
              />
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', color: 'var(--danger)' }}>
                  Forçar Fechamento Imediato
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Bloqueia novos pedidos imediatamente, mesmo se estiver no horário normal de funcionamento.
                </span>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: settings.is_manually_opened ? '2px solid var(--success)' : '1px solid var(--border-color)',
                backgroundColor: settings.is_manually_opened ? 'var(--success-bg)' : 'var(--bg-tertiary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="store_mode"
                checked={settings.is_manually_opened}
                onChange={() =>
                  setSettings({
                    ...settings,
                    is_manually_opened: true,
                    is_manually_closed: false,
                  })
                }
              />
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', color: 'var(--success)' }}>
                  Forçar Abertura Excepcional
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Permite pedidos mesmo fora do horário padrão programado.
                </span>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border:
                  !settings.is_manually_closed && !settings.is_manually_opened
                    ? '2px solid var(--brand-primary)'
                    : '1px solid var(--border-color)',
                backgroundColor:
                  !settings.is_manually_closed && !settings.is_manually_opened
                    ? 'var(--bg-accent-subtle)'
                    : 'var(--bg-tertiary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="store_mode"
                checked={!settings.is_manually_closed && !settings.is_manually_opened}
                onChange={() =>
                  setSettings({
                    ...settings,
                    is_manually_closed: false,
                    is_manually_opened: false,
                  })
                }
              />
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', color: 'var(--brand-primary)' }}>
                  Modo Automático por Horário (Padrão)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Abre e fecha nos horários programados abaixo com fuso America/Recife.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Mensagens Personalizadas */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>
            Mensagens de Aviso aos Clientes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mensagem quando Aberto</label>
              <textarea
                rows={2}
                value={settings.open_message}
                onChange={(e) => setSettings({ ...settings, open_message: e.target.value })}
                className="form-textarea"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mensagem quando Fechado</label>
              <textarea
                rows={2}
                value={settings.closed_message}
                onChange={(e) => setSettings({ ...settings, closed_message: e.target.value })}
                className="form-textarea"
              />
            </div>
          </div>
        </div>

        {/* Grade de Dias da Semana */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Programação Semanal de Funcionamento
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Fuso horário oficial: America/Recife (UTC-3)
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {hours.map((h, index) => (
              <div
                key={h.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  opacity: h.is_closed ? 0.6 : 1,
                }}
              >
                <div style={{ minWidth: '140px', fontWeight: 700, fontSize: '0.95rem' }}>
                  {weekdays[h.day_of_week]}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={h.is_closed}
                      onChange={(e) => handleUpdateHour(index, 'is_closed', e.target.checked)}
                    />
                    <span>Fechado o dia todo</span>
                  </label>

                  {!h.is_closed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="time"
                        value={h.open_time}
                        onChange={(e) => handleUpdateHour(index, 'open_time', e.target.value)}
                        className="form-input"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                      />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>até</span>
                      <input
                        type="time"
                        value={h.close_time}
                        onChange={(e) => handleUpdateHour(index, 'close_time', e.target.value)}
                        className="form-input"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
          <button type="submit" disabled={isSaving || isLoading} className="btn btn-primary btn-lg">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações de Horário'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
