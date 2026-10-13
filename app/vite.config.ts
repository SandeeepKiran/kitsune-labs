import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site from https://<owner>.github.io/kitsune-labs/,
  // so every asset URL must start with the repo name.
  base: '/kitsune-labs/',
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
