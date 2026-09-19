/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@shared': resolve(root, 'src/shared'),
      '@core': resolve(root, 'src/core'),
      '@ui': resolve(root, 'src/ui'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome116',
    rollupOptions: {
      input: {
        popup: resolve(root, 'popup.html'),
        dashboard: resolve(root, 'dashboard.html'),
        options: resolve(root, 'options.html'),
        devtools: resolve(root, 'devtools.html'),
        panel: resolve(root, 'panel.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Keep each page self-contained enough for extension contexts; shared chunks are fine.
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
});
