'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Layers,
  FolderTree,
  PlusCircle,
  MapPin,
  Tag,
  Clock,
  Settings,
  UserCircle,
  ArrowLeft,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/admin/produtos', label: 'Produtos', icon: Layers },
  { href: '/admin/categorias', label: 'Categorias', icon: FolderTree },
  { href: '/admin/complementos', label: 'Complementos', icon: PlusCircle },
  { href: '/admin/bairros', label: 'Bairros & Taxas', icon: MapPin },
  { href: '/admin/cupons', label: 'Cupons', icon: Tag },
  { href: '/admin/horarios', label: 'Horários & Loja', icon: Clock },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/admin/conta', label: 'Minha Conta', icon: UserCircle },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storeStatus, setStoreStatus] = useState<{ isOpen: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/store-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.status) {
          setStoreStatus(data.status);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('acai_admin_auth');
    localStorage.removeItem('acai_admin_email');
    document.cookie = 'acai_admin_session=; path=/; max-age=0';
    router.replace('/admin/login');
  };

  const activeItem = menuItems.find((item) => pathname === item.href);

  const SidebarContent = () => (
    <>
      <div>
        {/* Topo com Logo */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                flexShrink: 0,
              }}
            >
              <img
                src="/logo.png"
                alt="Açaí da Daiane"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                Açaí da Daiane
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Painel Administrativo</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ThemeToggle />
            {/* Botão fechar no mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="admin-sidebar-close btn btn-secondary btn-sm"
              style={{ borderRadius: '50%', padding: '0.4rem' }}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status rápido da Loja */}
        {storeStatus && (
          <div style={{ padding: '0.75rem 1rem 0.25rem 1rem' }}>
            <Link
              href="/admin/horarios"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: storeStatus.isOpen ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: storeStatus.isOpen ? 'var(--success)' : 'var(--danger)',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
                border: `1px solid ${storeStatus.isOpen ? 'var(--success)' : 'var(--danger)'}`,
              }}
              title="Clique para gerenciar horários e abertura"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: storeStatus.isOpen ? 'var(--success)' : 'var(--danger)',
                  }}
                />
                <span>{storeStatus.isOpen ? 'Loja Aberta' : 'Loja Fechada'}</span>
              </span>
              <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>Gerenciar →</span>
            </Link>
          </div>
        )}

        {/* Links de Navegação */}
        <nav style={{ padding: '0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? 'var(--bg-accent-subtle)' : 'transparent',
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Rodapé */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Idioma</span>
          <LanguageSelector />
        </div>

        <Link
          href="/"
          className="btn btn-outline btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => setMobileOpen(false)}
        >
          <ArrowLeft size={16} />
          <span>Ver Cardápio Público</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'center', color: 'var(--danger)' }}
        >
          <LogOut size={16} />
          <span>Encerrar Sessão</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Topbar mobile: hambúrguer + título da aba atual ── */}
      <header className="admin-topbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 'var(--radius-md)', padding: '0.45rem 0.6rem' }}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo.png" alt="logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {activeItem?.label ?? 'Admin'}
            </span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* ── Overlay do menu mobile ── */}
      {mobileOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar desktop (sempre visível ≥1024px) ── */}
      <aside
        className={`admin-sidebar-desktop no-print`}
      >
        <SidebarContent />
      </aside>

      {/* ── Drawer sidebar mobile (abre pelo hambúrguer) ── */}
      <aside
        className={`admin-sidebar-mobile no-print ${mobileOpen ? 'open' : ''}`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
