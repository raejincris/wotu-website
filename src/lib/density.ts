// Density system — same scale as homepage-a.html: compact / comfy / spacious.
// Persists via localStorage so the choice survives page navigation.

export type Density = 'compact' | 'comfy' | 'spacious';

const SCALE: Record<Density, number> = {
  compact: 0.65,
  comfy: 1.0,
  spacious: 1.35,
};

const KEY = 'wotu-density';

export function getDensity(): Density {
  if (typeof window === 'undefined') return 'comfy';
  const v = window.localStorage.getItem(KEY) as Density | null;
  return v && v in SCALE ? v : 'comfy';
}

export function setDensity(d: Density): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, d);
  document.documentElement.style.setProperty('--d', String(SCALE[d]));
  window.dispatchEvent(new CustomEvent('wotu-density-change', { detail: d }));
}

export function applyStoredDensity(): void {
  if (typeof window === 'undefined') return;
  const d = getDensity();
  document.documentElement.style.setProperty('--d', String(SCALE[d]));
}
