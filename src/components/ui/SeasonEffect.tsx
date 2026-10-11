'use client';

import React, { useMemo } from 'react';
import { SeasonEffect } from '@/lib/types';

// ── Particle configs per theme ──────────────────────────────────────────────
// All animations use ONLY transform + opacity → pure GPU compositor thread
// Zero JS timers, zero canvas, zero external libs

const PARTICLE_COUNT = 14;

interface ParticleConfig {
  size: [number, number];       // [min, max] px
  speedMs: [number, number];    // [min, max] animation duration ms
  className: string;
  getShape: (seed: number) => React.CSSProperties;
}

const THEMES: Record<string, ParticleConfig> = {
  christmas: {
    size: [4, 10],
    speedMs: [4000, 10000],
    className: 'se-particle se-snow',
    getShape: () => ({
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.85)',
      boxShadow: '0 0 4px rgba(255,255,255,0.6)',
    }),
  },
  new_year: {
    size: [5, 12],
    speedMs: [2500, 6000],
    className: 'se-particle se-spark',
    getShape: (seed) => {
      const hue = (seed * 53) % 60 + 35; // golden range 35–95
      return {
        clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',
        background: `hsl(${hue},95%,60%)`,
        boxShadow: `0 0 6px hsl(${hue},95%,70%)`,
      };
    },
  },
  carnival: {
    size: [6, 14],
    speedMs: [3000, 7000],
    className: 'se-particle se-confetti',
    getShape: (seed) => {
      const hues = [0, 30, 60, 120, 200, 270, 320];
      const hue = hues[seed % hues.length];
      const isRect = seed % 3 !== 0;
      return {
        borderRadius: isRect ? '2px' : '50%',
        background: `hsl(${hue},90%,55%)`,
        transform: `rotate(${seed * 37}deg)`,
        width: isRect ? `${6 + (seed % 5)}px` : `${8 + (seed % 4)}px`,
        height: isRect ? `${10 + (seed % 4)}px` : `${8 + (seed % 4)}px`,
      };
    },
  },
  easter: {
    size: [5, 9],
    speedMs: [5000, 9000],
    className: 'se-particle se-petal',
    getShape: (seed) => {
      const hues = [310, 140, 55, 200, 280]; // pink, green, yellow, cyan, violet
      const hue = hues[seed % hues.length];
      return {
        borderRadius: '50% 50% 50% 0 / 60% 60% 40% 40%',
        background: `hsl(${hue},75%,70%)`,
        transform: `rotate(${seed * 45}deg)`,
        opacity: 0.85,
      };
    },
  },
};

// ── deterministic pseudo-random (no Math.random so SSR-safe) ────────────────
function pseudoRand(seed: number, max: number, min = 0) {
  const val = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  return min + val * (max - min);
}

// ── Text gradient class per theme ────────────────────────────────────────────
export function getSeasonTitleClass(effect: SeasonEffect): string {
  if (effect === 'none' || !effect) return '';
  return `se-title-${effect}`;
}

// ── Main component ───────────────────────────────────────────────────────────
export function SeasonEffectLayer({ effect }: { effect: SeasonEffect }) {
  const cfg = THEMES[effect];

  const particles = useMemo(() => {
    if (!cfg) return [];
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const seed = i + 1;
      const left = pseudoRand(seed * 7, 98, 1);
      const size = pseudoRand(seed * 3, cfg.size[1], cfg.size[0]);
      const duration = pseudoRand(seed * 11, cfg.speedMs[1], cfg.speedMs[0]);
      const delay = pseudoRand(seed * 17, 6000, 0);
      const shape = cfg.getShape(seed);

      return { i, left, size, duration, delay, shape, className: cfg.className };
    });
  }, [cfg]);

  if (!cfg) return null;

  return (
    <div className="se-layer" aria-hidden="true">
      {particles.map(({ i, left, size, duration, delay, shape, className }) => (
        <span
          key={i}
          className={className}
          style={{
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDuration: `${duration}ms`,
            animationDelay: `${delay}ms`,
            ...shape,
          }}
        />
      ))}
    </div>
  );
}
