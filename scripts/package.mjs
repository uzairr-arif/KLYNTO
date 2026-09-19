#!/usr/bin/env node
/**
 * Package dist/ into a store-ready ZIP (manifest.json at the ZIP root, as the
 * Chrome Web Store and Edge Add-ons require).
 *
 * Usage: node scripts/package.mjs [--target chrome] [--out releases]
 */
import archiver from 'archiver';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const targetFlag = args.indexOf('--target');
const target = targetFlag >= 0 ? args[targetFlag + 1] : 'chrome';
const outDir = resolve(root, 'releases');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const dist = resolve(root, 'dist');

if (!existsSync(resolve(dist, 'manifest.json'))) {
  console.error('dist/manifest.json not found - run `npm run build` first.');
  process.exit(1);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const zipName = `klynto-${target}-v${pkg.version}.zip`;
const outPath = resolve(outDir, zipName);

await new Promise((done, fail) => {
  const output = createWriteStream(outPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', done);
  archive.on('error', fail);
  archive.pipe(output);
  // Contents of dist at the ZIP root - NOT the dist folder itself.
  archive.directory(dist, false);
  void archive.finalize();
});

console.log(`[klynto] packaged → releases/${zipName}`);
