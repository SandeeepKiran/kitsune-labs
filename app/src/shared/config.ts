// BASE_URL is "/kitsune-labs/" (see vite.config.ts). Build every link from it so the
// site works both on the dev server and on GitHub Pages.
export const BASE = import.meta.env.BASE_URL;

export const urls = {
  home: BASE,
  sampleData: `${BASE}sample-data/`,
  settings: `${BASE}settings/`,
  sampleFile: (path: string) => `${BASE}sample-data/${path}`,
  tool: (slug: string, samplePath?: string) =>
    `${BASE}tools/${slug}/` + (samplePath ? `?sample=${encodeURIComponent(samplePath)}` : ''),
  github: 'https://github.com/SandeeepKiran',
};
