'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Mail, Lock, CheckCircle, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AdminContaPage() {
  const [currentEmail, setCurrentEmail] = useState('');
  const [supabaseAvailable, setSupabaseAvailable] = useState(false);

  // Estado: trocar e-mail
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado: trocar senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('acai_admin_email') || '';
    setCurrentEmail(storedEmail);

    const supabase = createSupabaseBrowserClient();
    setSupabaseAvailable(Boolean(supabase));

    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setCurrentEmail(data.user.email);
          localStorage.setItem('acai_admin_email', data.user.email);
        }
      });
    }
  }, []);

  /* ─── Alterar E-mail ─── */
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);

    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setEmailMsg({ type: 'error', text: 'Digite um e-mail válido.' });
      return;
    }

    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setEmailMsg({ type: 'error', text: 'O novo e-mail deve ser diferente do atual.' });
      return;
    }

    if (!supabaseAvailable) {
      setEmailMsg({
        type: 'error',
        text: 'Supabase não está configurado. Conecte ao Supabase para alterar credenciais de forma permanente.',
      });
      return;
    }

    setEmailLoading(true);
    try {
      const supabase = createSupabaseBrowserClient()!;
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

      if (error) {
        setEmailMsg({ type: 'error', text: `Erro: ${error.message}` });
      } else {
        localStorage.setItem('acai_admin_email', newEmail.trim());
        setCurrentEmail(newEmail.trim());
        setNewEmail('');
        setEmailMsg({
          type: 'success',
          text: 'Confirmação enviada para o novo e-mail. Verifique sua caixa de entrada para confirmar a mudança.',
        });
      }
    } catch {
      setEmailMsg({ type: 'error', text: 'Erro inesperado. Tente novamente.' });
    } finally {
      setEmailLoading(false);
    }
  };

  /* ─── Alterar Senha ─── */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'A nova senha deve ter no mínimo 8 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'A confirmação de senha não confere.' });
      return;
    }

    if (!supabaseAvailable) {
      setPasswordMsg({
        type: 'error',
        text: 'Supabase não está configurado. Conecte ao Supabase para alterar a senha de forma permanente.',
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const supabase = createSupabaseBrowserClient()!;

      // Re-autenticar primeiro para validar a senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordMsg({ type: 'error', text: 'Senha atual incorreta. Verifique e tente novamente.' });
        setPasswordLoading(false);
        return;
      }

      // Atualizar para a nova senha
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        setPasswordMsg({ type: 'error', text: `Erro ao atualizar senha: ${updateError.message}` });
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordMsg({
          type: 'success',
          text: 'Senha alterada com sucesso! Use a nova senha no próximo login.',
        });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Erro inesperado. Tente novamente.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const strengthLevel = (() => {
    if (newPassword.length === 0) return null;
    const has8 = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNum = /\d/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
    const score = [has8, hasUpper, hasNum, hasSpecial].filter(Boolean).length;
    if (score <= 1) return { label: 'Fraca', color: 'var(--danger)', width: '25%' };
    if (score === 2) return { label: 'Média', color: 'var(--warning)', width: '50%' };
    if (score === 3) return { label: 'Boa', color: 'var(--info)', width: '75%' };
    return { label: 'Forte', color: 'var(--success)', width: '100%' };
  })();

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', width: '100%' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--brand-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={20} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Minha Conta</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Gerencie suas credenciais de acesso ao painel administrativo.
        </p>
      </div>

      {/* Info da conta atual */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderLeft: '4px solid var(--brand-primary)',
        }}
      >
        <Mail size={18} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            E-mail atual da conta admin
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{currentEmail || 'Não identificado'}</div>
        </div>
        {!supabaseAvailable && (
          <span
            className="badge badge-warning"
            style={{ marginLeft: 'auto', fontSize: '0.72rem' }}
          >
            Supabase offline
          </span>
        )}
      </div>

      {/* ── Card: Alterar E-mail ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Mail size={18} />
          Alterar E-mail de Acesso
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Um e-mail de confirmação será enviado para o novo endereço antes da mudança ser aplicada.
        </p>

        {emailMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              backgroundColor: emailMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: emailMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {emailMsg.type === 'success' ? <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />}
            <span>{emailMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangeEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Novo E-mail *</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                id="new-email-input"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="novo@email.com.br"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={emailLoading || !newEmail.trim()}
              className="btn btn-primary"
            >
              {emailLoading ? 'Enviando confirmação...' : 'Alterar E-mail'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Card: Alterar Senha ── */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <KeyRound size={18} />
          Alterar Senha
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Use no mínimo 8 caracteres. Combine letras maiúsculas, números e símbolos para uma senha mais forte.
        </p>

        {passwordMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              backgroundColor: passwordMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: passwordMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {passwordMsg.type === 'success' ? <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Senha atual */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Senha Atual *</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                id="current-password-input"
                type={showCurrentPwd ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Sua senha atual"
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  display: 'flex',
                }}
                aria-label={showCurrentPwd ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Nova senha */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nova Senha *</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                id="new-password-input"
                type={showNewPwd ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPwd(!showNewPwd)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  display: 'flex',
                }}
                aria-label={showNewPwd ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Barra de força da senha */}
            {strengthLevel && (
              <div style={{ marginTop: '0.5rem' }}>
                <div
                  style={{
                    height: '4px',
                    backgroundColor: 'var(--border-color)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginBottom: '0.25rem',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: strengthLevel.width,
                      backgroundColor: strengthLevel.color,
                      borderRadius: '2px',
                      transition: 'width 0.3s ease, background-color 0.3s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: strengthLevel.color, fontWeight: 600 }}>
                  Força da senha: {strengthLevel.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirmar nova senha */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirmar Nova Senha *</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                id="confirm-password-input"
                type={showConfirmPwd ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="form-input"
                style={{
                  paddingLeft: '2.5rem',
                  paddingRight: '2.75rem',
                  borderColor:
                    confirmPassword && confirmPassword !== newPassword
                      ? 'var(--danger)'
                      : confirmPassword && confirmPassword === newPassword
                      ? 'var(--success)'
                      : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  display: 'flex',
                }}
                aria-label={showConfirmPwd ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '0.35rem', fontWeight: 600 }}>
                As senhas não conferem.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={
                passwordLoading ||
                !currentPassword ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
              className="btn btn-primary"
            >
              {passwordLoading ? 'Alterando senha...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
