// Theme & Visual Style store: lets the visitor switch between 3 Yae Miko Electro
// surface themes and 2 visual/motion modes. Saved in localStorage (not a secret).

export type SurfaceTheme = 'dark-electro' | 'shrine-tech' | 'eclipse';
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
  'dark-electro': {
    id: 'dark-electro',
    label: 'Dark Electro Obsidian',
    shortLabel: 'Dark Electro',
    description: 'Deep Inazuma midnight obsidian with neon electro-violet telemetry, sakura accents, and shrine gold borders.',
    preview: ['#090612', '#a855f7', '#e5b84b'],
  },
  'shrine-tech': {
    id: 'shrine-tech',
    label: 'Luminous Shrine Tech',
    shortLabel: 'Shrine Tech',
    description: 'Crisp silver-white and shrine plum high-contrast surfaces with geometric gold frames and electro-magenta energy.',
    preview: ['#f7f5fc', '#6d28d9', '#b8860b'],
  },
  eclipse: {
    id: 'eclipse',
    label: 'Eclipse Hybrid',
    shortLabel: 'Eclipse',
    description: 'Obsidian command shell and dark electro hero paired with luminous high-contrast data inspection decks.',
    preview: ['#120b24', '#f4f0fb', '#c026d3'],
  },
};

export const VISUAL_STYLES: Record<VisualStyle, VisualStyleInfo> = {
  totem: {
    id: 'totem',
    label: 'Cyber-Kitsune & Sesshou Sakura Totem',
    shortLabel: 'Cyber-Kitsune',
    description: 'Angular holographic Kitsune spirit with crackling electro lightning arcs, pulsing energy rings, and floating electro motes.',
  },
  sigil: {
    id: 'sigil',
    label: 'Minimalist Electro Sigils & Sacred Geometry',
    shortLabel: 'Electro Sigil',
    description: 'Clean rotating Inazuma Electro crest, geometric ofuda telemetry frames, and subtle circuit pulse traces.',
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
    : 'dark-electro';
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
