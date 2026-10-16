'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/ui/AdminSidebar';
import { NewOrderPopup } from '@/components/ui/NewOrderPopup';
import { playAlertSound } from '@/hooks/useNewOrderAlert';

interface PopupData {
  count: number;
  latestCode: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminLayout — polling único de 4s para detectar novos pedidos.
// Ao detectar, dispara o som E o popup ao mesmo tempo, sem delay entre eles.
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [popup, setPopup] = useState<PopupData | null>(null);

  // Refs para rastrear baseline sem re-render
  const lastCountRef = useRef<number | null>(null);
  const lastLatestIdRef = useRef<string | null>(null);
  const enabledRef = useRef(false);

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

  // Atualiza ref de habilitação sem precisar de re-render
  useEffect(() => {
    enabledRef.current = isAuthenticated === true && pathname !== '/admin/login';
  }, [isAuthenticated, pathname]);

  // Polling único e rápido — 4s
  const checkOrders = useCallback(async () => {
    if (!enabledRef.current) return;
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.orders)) return;

      const orders: any[] = data.orders;
      const count = orders.length;
      const latestOrder = orders[0];
      const latestId = latestOrder?.id ?? null;
      const latestCode = latestOrder?.order_code ?? '';

      // Primeira execução: apenas salva baseline
      if (lastCountRef.current === null) {
        lastCountRef.current = count;
        lastLatestIdRef.current = latestId;
        return;
      }

      const countDiff = count - lastCountRef.current;
      const latestChanged = latestId && latestId !== lastLatestIdRef.current;

      if (countDiff > 0 || (latestChanged && count >= lastCountRef.current)) {
        // Dispara som e popup simultaneamente — sem delay
        playAlertSound();
        setPopup({ count: Math.max(1, countDiff), latestCode });
        lastCountRef.current = count;
        lastLatestIdRef.current = latestId;
      }
    } catch {
      // silencioso em falhas de rede
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated !== true || pathname === '/admin/login') return;
    checkOrders(); // roda imediatamente
    const interval = setInterval(checkOrders, 4000); // a cada 4s
    return () => clearInterval(interval);
  }, [isAuthenticated, pathname, checkOrders]);

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
