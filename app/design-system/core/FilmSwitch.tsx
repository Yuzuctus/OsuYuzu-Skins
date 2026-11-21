import React, { useEffect } from 'react';
import { flushSync } from 'react-dom';
import type { FilmMode } from '../tokens';

interface FilmSwitchProps {
  film: FilmMode;
  onChange: (next: FilmMode) => void;
  labels?: {
    positive: string;
    negative: string;
    toNegativeAria: string;
    toPositiveAria: string;
    title: string;
  };
}

type DocWithViewTransition = Document & {
  startViewTransition?: (cb: () => void) => {
    ready: Promise<void>;
  };
};

export function triggerFilmTransition(
  next: FilmMode,
  onChange: (next: FilmMode) => void,
  origin?: { x: number; y: number },
): void {
  const doc = document as DocWithViewTransition;

  const apply = () => {
    document.documentElement.setAttribute('data-film', next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', next === 'negative' ? '#0b0f0e' : '#f5eee0');
    }
    flushSync(() => onChange(next));
  };

  if (!doc.startViewTransition) {
    apply();
    return;
  }

  const x = origin?.x ?? window.innerWidth * 0.5;
  const y = origin?.y ?? window.innerHeight * 0.1;
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = doc.startViewTransition(apply);
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 560,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    .catch(() => {
      /* Fallback silencieux si transition annulée */
    });
}

export const FilmSwitch: React.FC<FilmSwitchProps> = ({ film, onChange, labels }) => {
  const next: FilmMode = film === 'positive' ? 'negative' : 'positive';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        triggerFilmTransition(next, onChange, {
          x: window.innerWidth - 96,
          y: 36,
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [next, onChange]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerFilmTransition(next, onChange, {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
    });
  };

  const posLabel = labels?.positive ?? 'Positif';
  const negLabel = labels?.negative ?? 'Négatif';
  const ariaLabel =
    film === 'positive'
      ? (labels?.toNegativeAria ?? 'Basculer en chambre noire Négatif (touche N)')
      : (labels?.toPositiveAria ?? 'Basculer en tirage Positif Solaire (touche N)');
  const titleText = labels?.title ?? 'Basculer Positif ↔ Négatif (raccourci N)';

  return (
    <button
      type="button"
      className="yz-film-switch"
      onClick={handleClick}
      aria-label={ariaLabel}
      title={titleText}
    >
      <span className="yz-film-switch__aperture" aria-hidden="true" />
      <span>{film === 'positive' ? posLabel : negLabel}</span>
    </button>
  );
};
