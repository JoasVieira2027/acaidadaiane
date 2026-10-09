'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ArrowLeft,
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
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="no-print"
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
      }}
    >
      <div>
        {/* Topo do Menu */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
              Painel Daiane
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gestão do Cardápio</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Links de Navegação */}
        <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
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

      {/* Rodapé da Sidebar */}
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
        >
          <ArrowLeft size={16} />
          <span>Ver Cardápio Público</span>
        </Link>
      </div>
    </aside>
  );
}
