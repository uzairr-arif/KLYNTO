#!/usr/bin/env node
/**
 * Klynto build orchestrator.
 *
 * Pass 1 builds all extension pages (popup, dashboard, options, devtools,
 * panel). Pass 2 builds the MV3 service worker as a single self-contained
 * ESM file. Finally the per-target manifest is written into dist/.
 *
 * Usage: node scripts/build.mjs [--target chrome|firefox] [--watch]
 */
import { spawnSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
    // Experimental Firefox target (MV3 event page instead of service worker).
    return {
      ...shared,
      browser_specific_settings: {
        gecko: {
          id: 'klynto@klynto.dev',
          strict_min_version: '115.0',
        },
      },
      background: {
        scripts: ['background/service-worker.js'],
        type: 'module',
      },
      optional_host_permissions: ['http://*/*', 'https://*/*'],
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

const dist = resolve(root, 'dist');
if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

// Always have a manifest in dist (watch mode rebuilds overwrite pages/SW but
// never clean the folder again after pass 1).
writeFileSync(resolve(dist, 'manifest.json'), JSON.stringify(buildManifest(target), null, 2));

if (watch) {
  // Watch mode: do one full clean build first (which writes a valid manifest),
  // then start the watchers with emptyOutDir disabled so rebuilds never wipe
  // dist/ — Chrome would disable the unpacked extension if the manifest
  // vanished between rebuilds.
  console.log('[klynto] watch: initial clean build…');
  runVite(['--config', 'vite.config.ts']);
  runVite(['--config', 'vite.sw.config.ts']);
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
      'watch',
      '--config',
      'vite.sw.config.ts',
    ],
    { stdio: 'inherit', cwd: root },
  );
} else {
  console.log('[klynto] building pages…');
  runVite(['--config', 'vite.config.ts']);
  console.log('[klynto] building service worker…');
  runVite(['--config', 'vite.sw.config.ts']);
  writeFileSync(resolve(dist, 'manifest.json'), JSON.stringify(buildManifest(target), null, 2));
  console.log(`[klynto] done → dist/ (target: ${target}, v${pkg.version})`);
}
