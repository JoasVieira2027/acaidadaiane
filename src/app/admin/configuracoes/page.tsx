'use client';

import React, { useEffect, useState } from 'react';
import { Save, CheckCircle, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { StoreSettings } from '@/lib/types';
import { initialSettings } from '@/lib/data/mockData';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/store-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar configurações:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSavedFeedback(false);

    try {
      const res = await fetch('/api/store-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.settings) setSettings(data.settings);
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 4000);
      } else {
        setErrorMessage(data.message || 'Erro ao salvar configurações.');
      }
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setErrorMessage('Erro de conexão ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Configurações da Loja</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Personalize dados da marca, WhatsApp comercial, cores do tema e formas de pagamento aceitas.
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
          <span>Configurações salvas com sucesso!</span>
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
        {/* Identidade e Contato */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>
            Identidade do Estabelecimento
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nome da Loja *</label>
              <input
                type="text"
                required
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">WhatsApp Comercial (com DDD) *</label>
              <input
                type="tel"
                required
                value={settings.whatsapp_number}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                className="form-input"
                placeholder="5581999998888"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <label className="form-label">Endereço Completo</label>
            <input
              type="text"
              value={settings.address_text}
              onChange={(e) => setSettings({ ...settings, address_text: e.target.value })}
              className="form-input"
            />
          </div>
        </div>

        {/* Formas de Pagamento Habilitadas */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Formas de Pagamento Habilitadas
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Escolha quais opções estarão disponíveis para os clientes no checkout.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={settings.accept_pix}
                onChange={(e) => setSettings({ ...settings, accept_pix: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Pix Online (Mercado Pago)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={settings.accept_cash}
                onChange={(e) => setSettings({ ...settings, accept_cash: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Dinheiro na Entrega / Retirada</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={settings.accept_card_delivery}
                onChange={(e) => setSettings({ ...settings, accept_card_delivery: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Cartão Maquininha (Presencial)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={settings.accept_card_link}
                onChange={(e) => setSettings({ ...settings, accept_card_link: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Cartão Online por Link WhatsApp</span>
            </label>
          </div>
        </div>

        {/* Modalidades de Pedido */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Modalidades de Atendimento
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Ative ou desative temporariamente a entrega em domicílio ou a retirada presencial.
          </p>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={settings.allow_delivery}
                onChange={(e) => setSettings({ ...settings, allow_delivery: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Aceitar Entrega em Domicílio</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={settings.allow_pickup}
                onChange={(e) => setSettings({ ...settings, allow_pickup: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Aceitar Retirada no Balcão</span>
            </label>
          </div>
        </div>

        {/* Cores da Identidade Visual */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>
            Personalização de Cores
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Cor Primária (Hexadecimal)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  style={{ width: '40px', height: '38px', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Cor Secundária (Hexadecimal)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  style={{ width: '40px', height: '38px', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                />
                <input
                  type="text"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
          <button type="submit" disabled={isSaving || isLoading} className="btn btn-primary btn-lg">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{isSaving ? 'Salvando...' : 'Salvar Configurações Gerais'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
