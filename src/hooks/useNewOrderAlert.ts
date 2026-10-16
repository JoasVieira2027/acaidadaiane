'use client';

import { useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useNewOrderAlert
// Hook que monitora novos pedidos via polling (fallback quando Supabase
// Realtime nao esta disponivel no cliente) e dispara callback com som + popup.
// ─────────────────────────────────────────────────────────────────────────────

export interface NewOrderAlertOptions {
  /** Intervalo em ms entre polls (default: 15000) */
  pollingIntervalMs?: number;
  /** Callback chamado quando chegam novos pedidos */
  onNewOrders: (count: number, latestCode: string) => void;
  /** Se false, nao faz polling (usado para desabilitar na pagina errada) */
  enabled?: boolean;
}

// Toca um beep sintetico via Web Audio API
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.24);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Silencioso em contextos sem AudioContext
  }
}

export function useNewOrderAlert({
  pollingIntervalMs = 15000,
  onNewOrders,
  enabled = true,
}: NewOrderAlertOptions) {
  const lastOrderCountRef = useRef<number | null>(null);
  const lastLatestIdRef = useRef<string | null>(null);
  const onNewOrdersRef = useRef(onNewOrders);
  onNewOrdersRef.current = onNewOrders;

  const checkOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.orders)) return;

      const orders: any[] = data.orders;
      const count = orders.length;
      const latestId = orders[0]?.id || null;
      const latestCode = orders[0]?.order_code || '';

      // Inicializacao: apenas salva baseline sem alertar
      if (lastOrderCountRef.current === null) {
        lastOrderCountRef.current = count;
        lastLatestIdRef.current = latestId;
        return;
      }

      const newCount = count - lastOrderCountRef.current;
      const latestChanged = latestId !== lastLatestIdRef.current;

      if (newCount > 0 && latestChanged) {
        playAlertSound();
        onNewOrdersRef.current(newCount, latestCode);
        lastOrderCountRef.current = count;
        lastLatestIdRef.current = latestId;
      }
    } catch {
      // Silencioso em falhas de rede
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Inicializa
    checkOrders();

    const interval = setInterval(checkOrders, pollingIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, checkOrders, pollingIntervalMs]);
}
