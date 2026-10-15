// Theme & Visual Style store: lets the visitor switch between 3 Apple-inspired
// minimalist finishes (Daylight Silver default, Space Black, and Sakura Glass)
// and 2 Kitsune emblem styles. Saved in localStorage (not a secret).

export type SurfaceTheme = 'shrine-tech' | 'dark-electro' | 'eclipse';
export type VisualStyle = 'totem' | 'sigil';

export interface SurfaceThemeInfo {
  id: SurfaceTheme;
  label: string;
  shortLabel: string;
  description: string;
  preview: [string, string, string];
}

export interface VisualStyleInfo {
  id: VisualStyle;
  label: string;
  shortLabel: string;
  description: string;
}

export const SURFACE_THEMES: Record<SurfaceTheme, SurfaceThemeInfo> = {
  'shrine-tech': {
    id: 'shrine-tech',
    label: 'Daylight Silver (Default)',
    shortLabel: 'Daylight Silver',
    description: 'Clean Apple #f5f5f7 silver canvas, crisp white focus sheet, neutral secondary pills, and solid Sakura-Rose primary actions.',
    preview: ['#f5f5f7', '#ffffff', '#be185d'],
  },
  'dark-electro': {
    id: 'dark-electro',
    label: 'Space Black (Dark)',
    shortLabel: 'Space Black',
    description: 'True MacBook Pro #000000 & #1c1c1e dark graphite surfaces, #3a3a3c neutral pills, and solid Sakura-Rose primary actions.',
    preview: ['#000000', '#1c1c1e', '#be185d'],
  },
  eclipse: {
    id: 'eclipse',
    label: 'Sakura Glass',
    shortLabel: 'Sakura Glass',
    description: 'Whisper-soft sakura-quartz ambient canvas with frosted white sheets and deep berry-rose accents.',
    preview: ['#faf5f8', '#fce7f3', '#be185d'],
  },
};

export const VISUAL_STYLES: Record<VisualStyle, VisualStyleInfo> = {
  totem: {
    id: 'totem',
    label: 'Sleek Curved Kitsune Line-Art',
    shortLabel: 'Kitsune Line',
    description: 'Smooth, organic monoline Kitsune silhouette with inner ear curves and gentle sakura drift.',
  },
  sigil: {
    id: 'sigil',
    label: 'Minimalist Crest Ring',
    shortLabel: 'Minimal Ring',
    description: 'Ultra-minimal concentric ring and subtle geometric accent lines.',
  },
};

export const SURFACE_THEME_IDS = Object.keys(SURFACE_THEMES) as SurfaceTheme[];
export const VISUAL_STYLE_IDS = Object.keys(VISUAL_STYLES) as VisualStyle[];
export const THEME_CHANGE_EVENT = 'kitsune:theme-change';

const THEME_KEY = 'kitsune.ui.theme';
const VISUAL_KEY = 'kitsune.ui.visual';

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the page still updates in memory for this view.
  }
}

export function getSurfaceTheme(): SurfaceTheme {
  const saved = readLocal(THEME_KEY);
  return saved === 'dark-electro' || saved === 'shrine-tech' || saved === 'eclipse'
    ? saved
    : 'shrine-tech';
}

export function getVisualStyle(): VisualStyle {
  const saved = readLocal(VISUAL_KEY);
  return saved === 'totem' || saved === 'sigil' ? saved : 'totem';
}

export function applyThemeAttributes(
  theme: SurfaceTheme = getSurfaceTheme(),
  visual: VisualStyle = getVisualStyle(),
): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.visual = visual;
}

export function setSurfaceTheme(theme: SurfaceTheme): void {
  writeLocal(THEME_KEY, theme);
  applyThemeAttributes(theme, getVisualStyle());
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
}

export function setVisualStyle(visual: VisualStyle): void {
  writeLocal(VISUAL_KEY, visual);
  applyThemeAttributes(getSurfaceTheme(), visual);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
}

export function cycleSurfaceTheme(): SurfaceTheme {
  const current = getSurfaceTheme();
  const next = SURFACE_THEME_IDS[(SURFACE_THEME_IDS.indexOf(current) + 1) % SURFACE_THEME_IDS.length];
  setSurfaceTheme(next);
  return next;
}
