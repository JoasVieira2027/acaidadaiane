'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface NewOrderAlertOptions {
  pollingIntervalMs?: number;
  onNewOrders: (count: number, latestCode: string) => void;
  enabled?: boolean;
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

async function ensureAudioReady(): Promise<AudioContext | null> {
  const ctx = getAudioCtx();
  if (!ctx) return null;
  // Tenta desbloquear o contexto independente do estado da aba
  if (ctx.state === 'suspended' || ctx.state === 'interrupted' as any) {
    try { await ctx.resume(); } catch { return null; }
  }
  return ctx.state === 'running' ? ctx : null;
}

function playNote(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  vol: number,
) {
  // Oscilador principal
  const osc = ctx.createOscillator();
  // Segundo oscilador uma oitava abaixo para dar corpo/grave
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();

  compressor.threshold.value = -6;
  compressor.knee.value = 3;
  compressor.ratio.value = 2;
  compressor.attack.value = 0.001;
  compressor.release.value = 0.1;

  osc.type = 'sine';
  osc.frequency.value = freq;
  osc2.type = 'triangle';
  osc2.frequency.value = freq / 2;

  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.02);
  gain.gain.setValueAtTime(vol, t + dur * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(compressor);
  compressor.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + dur + 0.01);
  osc2.start(t);
  osc2.stop(t + dur + 0.01);
}

// Toca sequência de 4 notas, repete `times` vezes
async function playAlertSequence(times = 2) {
  const ctx = await ensureAudioReady();
  if (!ctx) return;

  const notes = [
    { freq: 523, dur: 0.25, vol: 1.0 }, // Dó 5
    { freq: 659, dur: 0.22, vol: 1.0 }, // Mi 5
    { freq: 784, dur: 0.22, vol: 1.0 }, // Sol 5
    { freq: 1046, dur: 0.45, vol: 0.95 }, // Dó 6 — nota final longa
  ];

  for (let rep = 0; rep < times; rep++) {
    let offset = rep * 1.5; // 1.5s entre cada repetição
    notes.forEach((n) => {
      playNote(ctx, n.freq, offset, n.dur, n.vol);
      offset += n.dur - 0.02; // leve sobreposição para fluidez
    });
  }
}

export function playAlertSound() {
  playAlertSequence(2).catch(() => {});
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

  // Desbloqueia o AudioContext no primeiro gesto do usuário
  useEffect(() => {
    const unlock = () => {
      getAudioCtx(); // cria o contexto
      ensureAudioReady().catch(() => {}); // tenta resumir
    };
    ['click', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) =>
      window.addEventListener(evt, unlock, { passive: true, once: false })
    );
    return () => {
      ['click', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) =>
        window.removeEventListener(evt, unlock)
      );
    };
  }, []);

  // Retoma o AudioContext sempre que a aba volta ao foco
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        ensureAudioReady().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
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

      if (lastOrderCountRef.current === null) {
        lastOrderCountRef.current = count;
        lastLatestIdRef.current = latestId;
        return;
      }

      const countDiff = count - lastOrderCountRef.current;
      const latestChanged = latestId && latestId !== lastLatestIdRef.current;

      if (countDiff > 0 || (latestChanged && count >= lastOrderCountRef.current)) {
        await playAlertSequence(2);
        onNewOrdersRef.current(Math.max(1, countDiff), latestCode);
        lastOrderCountRef.current = count;
        lastLatestIdRef.current = latestId;
      }
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    checkOrders();
    const interval = setInterval(checkOrders, pollingIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, checkOrders, pollingIntervalMs]);
}
