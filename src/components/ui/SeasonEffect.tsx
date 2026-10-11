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
  kids_day: {
    size: [10, 24],
    speedMs: [3500, 7500],
    className: 'se-particle se-bubble',
    getShape: (seed) => {
      const hues = [190, 320, 45, 150, 270]; // cyan, pink, yellow, mint, purple
      const hue = hues[seed % hues.length];
      return {
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 20%, hsla(${hue},85%,65%,0.35) 60%, hsla(${(hue + 60) % 360},90%,70%,0.6) 100%)`,
        border: '1.5px solid rgba(255,255,255,0.7)',
        boxShadow: `0 0 8px hsla(${hue},85%,65%,0.4), inset 0 0 6px rgba(255,255,255,0.6)`,
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

// ── Theme metadata and default announcement texts ────────────────────────────
export interface SeasonThemeInfo {
  title: string;
  badge: string;
  defaultBanner: string;
  gradientBg: string;
  borderColor: string;
  textColor: string;
}

export const SEASON_THEMES_INFO: Record<Exclude<SeasonEffect, 'none'>, SeasonThemeInfo> = {
  christmas: {
    title: 'Natal',
    badge: '🎄 Especial de Natal',
    defaultBanner: '🎄 Boas Festas! Aproveite nosso cardápio especial de Natal com muito sabor e alegria.',
    gradientBg: 'linear-gradient(90deg, #991b1b, #065f46, #991b1b)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    textColor: '#ffffff',
  },
  new_year: {
    title: 'Ano Novo',
    badge: '✨ Feliz Ano Novo',
    defaultBanner: '✨ Feliz Ano Novo! Celebre a virada com as melhores combinações e o açaí mais saboroso.',
    gradientBg: 'linear-gradient(90deg, #78350f, #b45309, #d97706, #78350f)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    textColor: '#ffffff',
  },
  carnival: {
    title: 'Carnaval',
    badge: '🎭 Folia de Carnaval',
    defaultBanner: '🎭 Folia de Sabores! Caia na folia com energia e o cardápio mais refrescante da cidade.',
    gradientBg: 'linear-gradient(90deg, #6b21a8, #be185d, #ea580c, #6b21a8)',
    borderColor: 'rgba(192, 132, 252, 0.4)',
    textColor: '#ffffff',
  },
  easter: {
    title: 'Páscoa',
    badge: '🐰 Especial de Páscoa',
    defaultBanner: '🐰 Feliz Páscoa! Deliciosas camadas e cremes especiais para adoçar e celebrar o seu dia.',
    gradientBg: 'linear-gradient(90deg, #831843, #be185d, #047857, #831843)',
    borderColor: 'rgba(244, 114, 182, 0.4)',
    textColor: '#ffffff',
  },
  kids_day: {
    title: 'Dia das Crianças',
    badge: '🎈 Dia das Crianças',
    defaultBanner: '🎈 Especial Dia das Crianças! Monte o copo da diversão com confeitos e seus toppings favoritos.',
    gradientBg: 'linear-gradient(90deg, #0284c7, #db2777, #7c3aed, #0284c7)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    textColor: '#ffffff',
  },
};

export function getSeasonInfo(effect?: SeasonEffect | null): SeasonThemeInfo | null {
  if (!effect || effect === 'none') return null;
  return (SEASON_THEMES_INFO as any)[effect] || null;
}

// ── Top Festive Banner ────────────────────────────────────────────────────────
export function SeasonTopBanner({
  effect,
  customText,
}: {
  effect: SeasonEffect;
  customText?: string;
}) {
  const [dismissed, setDismissed] = React.useState(false);
  const info = getSeasonInfo(effect);

  if (!info || dismissed) return null;

  const message = customText?.trim() || info.defaultBanner;

  return (
    <div
      className="season-top-banner"
      style={{
        background: info.gradientBg,
        color: info.textColor,
        borderBottom: `1px solid ${info.borderColor}`,
      }}
    >
      <div className="season-top-banner-inner">
        <span className="season-top-banner-tag">{info.title.toUpperCase()}</span>
        <span className="season-top-banner-text">{message}</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="season-top-banner-close"
        aria-label="Fechar faixa comemorativa"
      >
        ×
      </button>
    </div>
  );
}

// ── Hero Season Badge (Pill right above Store Name) ──────────────────────────
export function SeasonHeroBadge({ effect }: { effect: SeasonEffect }) {
  const info = getSeasonInfo(effect);
  if (!info) return null;

  return (
    <div className="hero-season-badge-wrap">
      <span className={`hero-season-badge se-badge-${effect}`}>
        {info.badge}
      </span>
    </div>
  );
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

