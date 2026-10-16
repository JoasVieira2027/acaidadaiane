'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/ui/AdminSidebar';
import { NewOrderPopup } from '@/components/ui/NewOrderPopup';
import { useNewOrderAlert } from '@/hooks/useNewOrderAlert';

interface PopupData {
  count: number;
  latestCode: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [popup, setPopup] = useState<PopupData | null>(null);

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

  const handleNewOrders = useCallback((count: number, latestCode: string) => {
    setPopup({ count, latestCode });
  }, []);

  // Monitora novos pedidos (ativo apenas quando autenticado e fora da tela de login)
  useNewOrderAlert({
    enabled: isAuthenticated === true && pathname !== '/admin/login',
    onNewOrders: handleNewOrders,
    pollingIntervalMs: 15000,
  });

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
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        {children}
      </div>

      {popup && (
        <NewOrderPopup
          count={popup.count}
          latestCode={popup.latestCode}
          onClose={() => setPopup(null)}
          onView={() => {
            setPopup(null);
            router.push('/admin/pedidos');
          }}
        />
      )}
    </div>
  );
}
