import { defineConfig } from 'vite';

// Relative base so the built game works at <name>.start.ng and from any folder.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    chunkSizeWarningLimit: 800, // three.js is one big chunk; ~140 kB gzipped
  },
});
