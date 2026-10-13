import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// One real HTML page per route (home, sample data, each tool). Every URL then exists as a
// file on GitHub Pages, so links and refreshes work without any single-page-app redirect.
const toolPages = Object.fromEntries(
  readdirSync(resolve(import.meta.dirname, 'tools')).map((slug) => [`tool-${slug}`, resolve(import.meta.dirname, 'tools', slug, 'index.html')]),
);

export default defineConfig({
  // GitHub Pages serves the site from https://<owner>.github.io/kitsune-labs/,
  // so every asset URL must start with the repo name.
  base: '/kitsune-labs/',
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        sampleData: resolve(import.meta.dirname, 'sample-data', 'index.html'),
        ...toolPages,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
