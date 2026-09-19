import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Separate build pass for the MV3 service worker: single self-contained ESM file
// with dynamic imports inlined, so the worker never loads at runtime.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome116',
    minify: 'esbuild',
    lib: {
      entry: resolve(root, 'src/background/service-worker.ts'),
      formats: ['es'],
      fileName: () => 'background/service-worker.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
