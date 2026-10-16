'use client';

import { useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useNewOrderAlert
// Hook que monitora novos pedidos via polling e dispara som + popup no admin.
// ─────────────────────────────────────────────────────────────────────────────

export interface NewOrderAlertOptions {
  /** Intervalo em ms entre polls (default: 8000) */
  pollingIntervalMs?: number;
  /** Callback chamado quando chegam novos pedidos */
  onNewOrders: (count: number, latestCode: string) => void;
  /** Se false, nao faz polling */
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

/**
 * Toca um tom via Web Audio API.
 * type: 'sine' | 'square' | 'sawtooth' | 'triangle'
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  vol = 0.8,
  type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);

  gain.gain.setValueAtTime(0.001, ctx.currentTime + startOffset);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startOffset + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + duration + 0.02);
}

/**
 * Toca uma sequência de alerta estilo "campainha de caixa" — grave, forte e
 * repete 2 vezes com 700ms de intervalo.
 */
export function playAlertSound() {
  try {
    const ctx = getUnlockedAudioContext();
    if (!ctx) return;

    const playSequence = (timeOffset: number) => {
      // Nota 1: DÓ grave — 261 Hz, sine, forte
      playTone(ctx, 261, timeOffset + 0.00, 0.30, 1.0, 'sine');
      // Nota 2: MI — 329 Hz, sine
      playTone(ctx, 329, timeOffset + 0.22, 0.28, 0.95, 'sine');
      // Nota 3: SOL — 392 Hz, sine, mais longa
      playTone(ctx, 392, timeOffset + 0.42, 0.45, 1.0, 'sine');
      // Nota 4: DÓ agudo — 523 Hz, resonância final
      playTone(ctx, 523, timeOffset + 0.75, 0.55, 0.90, 'sine');
    };

    // Toca 2 vezes — 1ª imediata, 2ª após 1.6s
    playSequence(0);
    playSequence(1.6);
  } catch (err) {
    console.warn('Erro ao tocar som de alerta:', err);
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

      // Inicialização: salva baseline sem alertar
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
    checkOrders();
    const interval = setInterval(checkOrders, pollingIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, checkOrders, pollingIntervalMs]);
}
