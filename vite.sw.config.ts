import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Separate build pass for the MV3 service worker: single self-contained ESM file
// with dynamic imports inlined, so the worker never loads at runtime.
//
// The outDir is a DEDICATED subdirectory (dist/background) on purpose: in watch
// mode Vite re-empties the outDir on every rebuild, and if that outDir were the
// dist root the manifest would vanish and Chrome would disable the unpacked
// extension. With a dedicated dir, rebuilds can only touch their own files.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist/background',
    emptyOutDir: true,
    target: 'chrome116',
    minify: 'esbuild',
    lib: {
      entry: resolve(root, 'src/background/service-worker.ts'),
      formats: ['es'],
      fileName: () => 'service-worker.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
