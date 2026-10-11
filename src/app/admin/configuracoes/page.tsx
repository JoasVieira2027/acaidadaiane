'use client';

import React, { useEffect, useState } from 'react';
import { Save, CheckCircle, ShieldCheck, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { StoreSettings, SeasonEffect } from '@/lib/types';
import { initialSettings } from '@/lib/data/mockData';

export default function AdminSettingsPage() {
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
        try {
          localStorage.setItem('store_settings_updated_at', Date.now().toString());
          window.dispatchEvent(new Event('store-settings-updated'));
        } catch {}
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
              placeholder="Ex: Av. Conselheiro Aguiar, 1450 - Boa Viagem, Recife - PE"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Exibido no rodapé do site e nos comprovantes de impressão.
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <label className="form-label">Slogan / Descrição do Rodapé</label>
            <textarea
              rows={2}
              value={settings.open_message}
              onChange={(e) => setSettings({ ...settings, open_message: e.target.value })}
              className="form-textarea"
              placeholder="O açaí artesanal mais cremoso da região, preparado com ingredientes selecionados e entrega rápida e segura."
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Texto de apresentação exibido logo abaixo do nome da marca no rodapé do site.
            </span>
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

        {/* Efeitos Visuais Sazonais (Festas e Comemorações) */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Sparkles size={20} style={{ color: 'var(--brand-primary)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              Efeitos Visuais Comemorativos
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Ative animações visuais leves e elegantes no topo da loja e no nome da marca para datas comemorativas. 100% acelerado por hardware (GPU pura, sem emojis e sem travar a navegação do cliente).
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.85rem',
            }}
          >
            {[
              {
                id: 'none' as SeasonEffect,
                label: 'Desativado',
                sub: 'Tema limpo e padrão da loja',
                badgeBg: 'var(--bg-tertiary)',
                badgeColor: 'var(--text-muted)',
              },
              {
                id: 'christmas' as SeasonEffect,
                label: 'Natal',
                sub: 'Neve caindo + brilho temático rubro e verde',
                badgeBg: '#c8102e20',
                badgeColor: '#c8102e',
              },
              {
                id: 'new_year' as SeasonEffect,
                label: 'Ano Novo',
                sub: 'Faíscas estelares + brilho ouro metálico',
                badgeBg: '#ffd70025',
                badgeColor: '#b8860b',
              },
              {
                id: 'carnival' as SeasonEffect,
                label: 'Carnaval',
                sub: 'Chuva de confetes + arco-íris vibrante',
                badgeBg: '#8b5cf620',
                badgeColor: '#8b5cf6',
              },
              {
                id: 'easter' as SeasonEffect,
                label: 'Páscoa',
                sub: 'Pétalas suaves + gradiente pastel',
                badgeBg: '#ec489920',
                badgeColor: '#ec4899',
              },
              {
                id: 'kids_day' as SeasonEffect,
                label: 'Dia das Crianças',
                sub: 'Bolhas de sabão translúcidas + gradiente alegre candy-pop',
                badgeBg: '#00d2ff25',
                badgeColor: '#0099cc',
              },
            ].map((opt) => {
              const isSelected = (settings.season_effect || 'none') === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSettings({ ...settings, season_effect: opt.id })}
                  style={{
                    border: isSelected
                      ? '2px solid var(--brand-primary)'
                      : '1px solid var(--border-color)',
                    backgroundColor: isSelected
                      ? 'var(--brand-primary-light, rgba(88, 28, 135, 0.06))'
                      : 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {opt.label}
                      </span>
                      <input
                        type="radio"
                        name="season_effect"
                        checked={isSelected}
                        onChange={() => setSettings({ ...settings, season_effect: opt.id })}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                      {opt.sub}
                    </p>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm, 4px)',
                        backgroundColor: opt.badgeBg,
                        color: opt.badgeColor,
                      }}
                    >
                      {isSelected ? '✓ Ativo no Site' : 'Selecionar'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Campo de texto personalizado da faixa comemorativa */}
          {settings.season_effect && settings.season_effect !== 'none' && (
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Texto da Faixa Comemorativa no Topo (Opcional)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                    Deixe em branco para usar a mensagem padrão do tema
                  </span>
                </label>
                <input
                  type="text"
                  value={settings.season_banner_text || ''}
                  onChange={(e) => setSettings({ ...settings, season_banner_text: e.target.value })}
                  className="form-input"
                  placeholder="Ex: 🎄 Boas Festas! Aproveite nosso cardápio especial de Natal com descontos exclusivos."
                />
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                💡 A faixa aparece com destaque visual no topo de todas as páginas da loja, permitindo que os clientes identifiquem a comemoração instantaneamente.
              </div>
            </div>
          )}
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
