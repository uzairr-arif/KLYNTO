import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Separate build pass for the MV3 background worker: single self-contained
// file with dynamic imports inlined, so the worker never loads extra chunks.
//
// The outDir is a DEDICATED subdirectory (dist/background) on purpose: in watch
// mode Vite re-empties the outDir on every rebuild, and if that outDir were the
// dist root the manifest would vanish and Chrome would disable the unpacked
// extension. With a dedicated dir, rebuilds can only touch their own files.
//
// Chromium gets an ES module worker (manifest background.type = 'module').
// Firefox gets an IIFE classic script (manifest background.scripts) — Firefox
// MV3 event pages have no module type. `--mode firefox` selects that format.
export default defineConfig(({ mode }) => ({
  publicDir: false,
  build: {
    outDir: 'dist/background',
    emptyOutDir: true,
    target: 'chrome116',
    minify: 'esbuild',
    lib: {
      entry: resolve(root, 'src/background/service-worker.ts'),
      // `name` is only required for the iife format (Firefox); it is unused
      // at runtime because the worker has no exports.
      name: 'klynto_sw',
      formats: [mode === 'firefox' ? 'iife' : 'es'],
      fileName: () => 'service-worker.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
}));
