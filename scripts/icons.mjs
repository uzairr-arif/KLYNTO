#!/usr/bin/env node
/**
 * Generates Klynto raster assets from the vector mark:
 *   public/icons/icon-{16,32,48,128}.png      (shipped with the extension)
 *   stores/assets/                            (store-submission only, not shipped)
 *
 * Usage: node scripts/icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));

const MARK = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2dd4bf"/>
      <stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <path d="M64 6 L114 25 V62 C114 92 94 112 64 122 C34 112 14 92 14 62 V25 Z" fill="url(#g)"/>
  <rect x="42" y="38" width="13" height="52" rx="2.5" fill="#062b26"/>
  <path d="M60 64 L84 38 H99 L72 68 L99 90 H84 L60 66 Z" fill="#062b26"/>
</svg>`;

const PROMO = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 280">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0d12"/>
      <stop offset="1" stop-color="#101b2a"/>
    </linearGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2dd4bf"/>
      <stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="440" height="280" fill="url(#bg)"/>
  <g opacity="0.14" stroke="#2dd4bf" stroke-width="1">
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 44}" y1="0" x2="${i * 44}" y2="280"/>`).join('')}
    ${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="440" y2="${i * 40}"/>`).join('')}
  </g>
  <g transform="translate(48, 76) scale(1.0)">
    <path d="M64 6 L114 25 V62 C114 92 94 112 64 122 C34 112 14 92 14 62 V25 Z" fill="url(#g)"/>
    <rect x="42" y="38" width="13" height="52" rx="2.5" fill="#062b26"/>
    <path d="M60 64 L84 38 H99 L72 68 L99 90 H84 L60 66 Z" fill="#062b26"/>
  </g>
  <text x="176" y="150" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="700" letter-spacing="6" fill="#e7ecf3">KLYNTO</text>
  <text x="178" y="184" font-family="Segoe UI, Arial, sans-serif" font-size="17" fill="#9aa7ba">Web Security Inspector</text>
</svg>`;

const iconsDir = resolve(root, 'public/icons');
const storeAssetsDir = resolve(root, 'stores/assets');
mkdirSync(iconsDir, { recursive: true });
mkdirSync(storeAssetsDir, { recursive: true });

const mark = Buffer.from(MARK);
for (const size of [16, 32, 48, 128]) {
  await sharp(mark)
    .resize(size, size)
    .png()
    .toFile(resolve(iconsDir, `icon-${size}.png`));
  console.log(`icon-${size}.png`);
}

// Store-submission assets (kept out of the shipped extension package):
// listing icon required by the Chrome Web Store, plus the 440x280 promo tile
// and the SVG sources for future edits.
await sharp(mark).resize(128, 128).png().toFile(resolve(storeAssetsDir, 'store-icon-128.png'));
await sharp(Buffer.from(PROMO)).png().toFile(resolve(storeAssetsDir, 'promo-tile-440x280.png'));
console.log('store assets: store-icon-128.png, promo-tile-440x280.png');
writeFileSync(resolve(storeAssetsDir, 'mark.svg'), MARK);
writeFileSync(resolve(storeAssetsDir, 'promo.svg'), PROMO);
console.log('done');
