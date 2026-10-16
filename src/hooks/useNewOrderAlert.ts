'use client';

import { useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useNewOrderAlert
// Hook que monitora novos pedidos via polling (fallback quando Supabase
// Realtime nao esta disponivel no cliente) e dispara callback com som + popup.
// ─────────────────────────────────────────────────────────────────────────────

export interface NewOrderAlertOptions {
  /** Intervalo em ms entre polls (default: 8000) */
  pollingIntervalMs?: number;
  /** Callback chamado quando chegam novos pedidos */
  onNewOrders: (count: number, latestCode: string) => void;
  /** Se false, nao faz polling (usado para desabilitar na pagina errada) */
  enabled?: boolean;
}

let sharedAudioCtx: AudioContext | null = null;

function getUnlockedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Toca som de sino / campainha de pedido ("ding-dong!")
export function playAlertSound() {
  try {
    const ctx = getUnlockedAudioContext();
    if (!ctx) return;

    const playTone = (freq: number, startOffset: number, duration: number, vol = 0.6) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);

      gain.gain.setValueAtTime(vol, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    // Tríade brilhante e audível: 784Hz -> 1046Hz -> 1318Hz
    playTone(784, 0, 0.22, 0.7);
    playTone(1046, 0.18, 0.3, 0.75);
    playTone(1318, 0.4, 0.55, 0.8);
  } catch (err) {
    console.warn('Erro ao tocar som:', err);
  }
}

export function useNewOrderAlert({
  pollingIntervalMs = 8000,
  onNewOrders,
  enabled = true,
}: NewOrderAlertOptions) {
  const lastOrderCountRef = useRef<number | null>(null);
  const lastLatestIdRef = useRef<string | null>(null);
  const onNewOrdersRef = useRef(onNewOrders);
  onNewOrdersRef.current = onNewOrders;

  // Destrava o áudio no primeiro clique/toque do operador no painel admin
  useEffect(() => {
    const unlock = () => {
      getUnlockedAudioContext();
    };
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const checkOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.orders)) return;

      const orders: any[] = data.orders;
      const count = orders.length;
      const latestOrder = orders[0];
      const latestId = latestOrder?.id || null;
      const latestCode = latestOrder?.order_code || '';

      // Inicializacao: apenas salva baseline sem alertar
      if (lastOrderCountRef.current === null) {
        lastOrderCountRef.current = count;
        lastLatestIdRef.current = latestId;
        return;
      }

      const countDiff = count - lastOrderCountRef.current;
      const latestChanged = latestId && latestId !== lastLatestIdRef.current;

      if (countDiff > 0 || (latestChanged && count >= lastOrderCountRef.current)) {
        playAlertSound();
        onNewOrdersRef.current(Math.max(1, countDiff), latestCode);
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
