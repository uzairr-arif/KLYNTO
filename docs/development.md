# Development guide

## Requirements

- Node.js ≥ 20.19
- Any Chromium browser for testing (Chrome, Edge, Brave)

## Commands

| Command                           | What it does                                              |
| --------------------------------- | --------------------------------------------------------- |
| `npm install`                     | Install dependencies                                      |
| `npm run watch`                   | Build once, then rebuild pages + service worker on change |
| `npm run build`                   | Production build into `dist/` (Chrome target)             |
| `npm run build:firefox`           | Build the experimental Firefox target                     |
| `npm run typecheck`               | Strict TypeScript check (`tsc --noEmit`)                  |
| `npm run lint`                    | ESLint                                                    |
| `npm test` / `npm run test:watch` | Vitest suite                                              |
| `npm run icons`                   | Regenerate PNG icons from the SVG mark (needs `sharp`)    |
| `npm run package`                 | ZIP `dist/` into `releases/` (store-ready)                |
| `npm run release`                 | Build + package                                           |

## Load the extension

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select the `dist/` folder
3. After rebuilding, click the reload icon on the Klynto card

To test the background service worker logs: click **service worker** on the extension
card to open its DevTools.

## Where things live

```
src/
├── core/            # Framework-free engine: models, parsers, rules, scoring, storage
│   ├── models/      # ScanEvidence, ScanResult, Finding, Rule, Settings types
│   ├── parser/      # HttpHeaders, Set-Cookie, CSP tokenizer, URL helpers
│   ├── rules/       # 60 rules in 8 modules + registry + shared helpers
│   ├── fixes/       # Fix Center snippet library (control × platform)
│   ├── scoring/     # Transparent score engine
│   ├── scanner/     # analyze(evidence) → ScanResult
│   ├── compare/     # Scan diffs + regression detection
│   └── storage/     # KVStore abstraction + history/latest/batch logic
├── background/      # MV3 service worker (network monitor, scanner, batch, messages)
├── platform/        # The ONLY place that touches chrome.* directly
├── shared/          # Message protocol, constants, formatting utils
├── reports/         # JSON / Markdown / HTML export generators
├── ui/              # Design tokens, styles, shared React components + hooks
├── popup/           # Toolbar popup
├── dashboard/       # Full-page app (history, compare, batch, reports, rules, settings)
├── options/         # Options page (reuses SettingsView)
└── devtools/        # DevTools entry + panel (HAR-driven, zero permissions)
tests/
├── fixtures/        # Realistic response fixtures (secure/insecure/partial/…)
├── parser/          # Parser unit tests
├── rules/           # One suite per rule module
└── ui/              # Component tests (jsdom)
```

## Adding a rule

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the checklist. In short: add the rule
object in `src/core/rules/<module>.ts`, register nothing (modules are aggregated), add
tests + a fixture, optionally add Fix Center snippets in `src/core/fixes/library.ts`,
and update [docs/rules.md](rules.md).

## Testing a rule quickly

```ts
import { makeEvidence, runRules, findingOf } from '../tests/helpers';

const result = runRules(
  makeEvidence({
    url: 'https://example.com/',
    headers: [['Strict-Transport-Security', 'max-age=86400']],
  }),
);
findingOf(result, 'KLYNTO-HDR-002'); // → { status: 'fail', severity: 'warning', … }
```

## Debugging tips

- **No observations on a site?** Check that the origin was granted
  (`chrome://extensions` → Klynto → Details → Site access) and that
  Settings → Automatic inspection is on.
- **Set-Cookie missing from observations?** MV3 requires `extraHeaders`; the monitor
  already requests it. Verify in the service worker console.
- **Batch scan permission errors:** batch requests access for the listed origins first;
  decline = those targets are skipped with an error entry.
