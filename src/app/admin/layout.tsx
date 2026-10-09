'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/ui/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setIsAuthenticated(true);
      return;
    }
    const authFlag = localStorage.getItem('acai_admin_auth');
    if (authFlag === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      router.replace('/admin/login');
    }
  }, [pathname, router]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

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
        Verificando credenciais...
      </div>
    );
  }

  return (
    // wrapper com classe para CSS responsivo do admin
    <div className="admin-layout">
      <AdminSidebar />
      {/* Conteúdo principal: em desktop fica ao lado da sidebar */}
      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
