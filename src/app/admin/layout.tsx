'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/ui/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Se a rota for o login, permite acesso direto sem sidebar
    if (pathname === '/admin/login') {
      setIsAuthenticated(true);
      return;
    }

    // Verificar autenticação
    const authFlag = localStorage.getItem('acai_admin_auth');
    if (authFlag === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      router.replace('/admin/login');
    }
  }, [pathname, router]);

  // Durante a renderização da página de login
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Enquanto valida autenticação
  if (isAuthenticated === null || !isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-muted)',
          fontSize: '0.95rem',
          fontWeight: 600,
        }}
      >
        Verificando credenciais de acesso administrativo...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <AdminSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
