#!/usr/bin/env node
/**
 * Klynto build orchestrator.
 *
 * Pass 1 builds all extension pages (popup, dashboard, options, devtools,
 * panel). Pass 2 builds the MV3 background worker as a single self-contained
 * file. Finally the per-target manifest is written into the target's output
 * directory: dist/chrome or dist/firefox (each target gets its own folder, so
 * the right build is always loaded into the right browser).
 *
 * Usage: node scripts/build.mjs [--target chrome|firefox] [--watch]
 */
import { spawnSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const targetFlag = args.indexOf('--target');
const target = targetFlag >= 0 ? args[targetFlag + 1] : 'chrome';
const watch = args.includes('--watch');

if (target !== 'chrome' && target !== 'firefox') {
  console.error(`Unknown target: ${target} (expected chrome or firefox)`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const dist = resolve(root, 'dist', target);

/**
 * One-time migration: the pre-split layout wrote both targets into dist/
 * directly, which made it easy to load the wrong target into the wrong
 * browser. Remove legacy root files (everything except the per-target dirs).
 */
function cleanLegacyDist() {
  const distRoot = resolve(root, 'dist');
  if (!existsSync(resolve(distRoot, 'manifest.json'))) return;
  for (const entry of readdirSync(distRoot)) {
    if (entry === 'chrome' || entry === 'firefox') continue;
    try {
      rmSync(resolve(distRoot, entry), { recursive: true, force: true });
    } catch {
      // transient Windows file lock - the next build can clean it up
    }
  }
  console.log('[klynto] removed legacy dist/ root layout (targets now live in dist/chrome and dist/firefox)');
}

function buildManifest(targetName) {
  const icons = {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  };
  const shared = {
    manifest_version: 3,
    name: 'Klynto - Web Security Inspector',
    short_name: 'Klynto',
    description:
      'Local-first web security inspector for developers - headers, CSP, cookies, CORS, transport and more. No servers, no telemetry.',
    version: pkg.version,
    icons,
    action: {
      default_title: 'Open Klynto',
      default_popup: 'popup.html',
      default_icon: icons,
    },
    options_page: 'options.html',
    devtools_page: 'devtools.html',
    permissions: ['storage', 'webRequest', 'activeTab', 'contextMenus'],
    // Chromium-only key; the firefox branch swaps it for optional_permissions.
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+K',
          mac: 'Command+Shift+K',
        },
        description: 'Open Klynto',
      },
    },
  };

  if (targetName === 'firefox') {
    // Firefox target (MV3 event page instead of service worker).
    // - background.scripts without `type: 'module'`: the Firefox build bundles
    //   the worker as an IIFE classic script (see vite.sw.config.ts).
    // - options_ui: Firefox's supported options-page key.
    // - optional_permissions (NOT optional_host_permissions): Firefox manages
    //   host grants per-extension in about:addons and does not support the
    //   Chromium optional_host_permissions key.
    // - gecko.id: stable GUID (AMO requires an id or AMO-generated identity;
    //   a GUID avoids exposing a domain or personal address).
    // - data_collection_permissions: Klynto collects nothing; declaring it
    //   explicitly is what AMO's newest review flow expects.
    // - strict_min_version 128: storage.session + MV3 event-page era.
    const { optional_host_permissions: _ohp, options_page: _op, ...firefoxShared } = shared;
    void _ohp;
    void _op;
    return {
      ...firefoxShared,
      browser_specific_settings: {
        gecko: {
          id: '{b7c83b64-f682-4767-9b16-0ad4aa899164}',
          strict_min_version: '128.0',
          data_collection_permissions: {
            required: ['none'],
          },
        },
      },
      background: {
        scripts: ['background/service-worker.js'],
      },
      options_ui: {
        page: 'options.html',
        open_in_tab: true,
      },
      optional_permissions: ['http://*/*', 'https://*/*'],
    };
  }

  return {
    ...shared,
    minimum_chrome_version: '116',
    background: {
      service_worker: 'background/service-worker.js',
      type: 'module',
    },
  };
}

function runVite(configArgs, extraArgs = []) {
  const result = spawnSync(
    process.execPath,
    [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', ...configArgs, ...extraArgs],
    { stdio: 'inherit', cwd: root },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

cleanLegacyDist();
if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

// Always have a manifest in the target dir (watch mode rebuilds overwrite
// pages/SW but never clean the folder again after pass 1).
writeFileSync(resolve(dist, 'manifest.json'), JSON.stringify(buildManifest(target), null, 2));

if (watch) {
  // Watch mode: do one full clean build first (which writes a valid manifest),
  // then start the watchers with emptyOutDir disabled so rebuilds never wipe
  // the target dir — Chrome would disable the unpacked extension if the
  // manifest vanished between rebuilds.
  console.log('[klynto] watch: initial clean build…');
  runVite(['--config', 'vite.config.ts', '--outDir', `dist/${target}`]);
  runVite([
    '--config',
    'vite.sw.config.ts',
    '--mode',
    target === 'firefox' ? 'firefox' : 'production',
    '--outDir',
    `dist/${target}/background`,
  ]);
  writeFileSync(resolve(dist, 'manifest.json'), JSON.stringify(buildManifest(target), null, 2));
  console.log('[klynto] watch mode: rebuilding on change (dist is not wiped between rebuilds)');
  spawn(
    process.execPath,
    [
      resolve(root, 'node_modules/vite/bin/vite.js'),
      'build',
      '--watch',
      '--mode',
      'watch',
      '--outDir',
      `dist/${target}`,
      '--config',
      'vite.config.ts',
    ],
    { stdio: 'inherit', cwd: root },
  );
  spawn(
    process.execPath,
    [
      resolve(root, 'node_modules/vite/bin/vite.js'),
      'build',
      '--watch',
      '--mode',
      target === 'firefox' ? 'firefox' : 'watch',
      '--outDir',
      `dist/${target}/background`,
      '--config',
      'vite.sw.config.ts',
    ],
    { stdio: 'inherit', cwd: root },
  );
} else {
  console.log('[klynto] building pages…');
  runVite(['--config', 'vite.config.ts', '--outDir', `dist/${target}`]);
  console.log('[klynto] building service worker…');
  runVite([
    '--config',
    'vite.sw.config.ts',
    '--mode',
    target === 'firefox' ? 'firefox' : 'production',
    '--outDir',
    `dist/${target}/background`,
  ]);
  writeFileSync(resolve(dist, 'manifest.json'), JSON.stringify(buildManifest(target), null, 2));
  console.log(`[klynto] done → dist/${target} (target: ${target}, v${pkg.version})`);
}
