# Architecture

> The popup is only the UI. The intelligence lives in the core.

## Big picture

```text
                    KLYNTO
                       │
          ┌────────────┴────────────┐
          │                         │
      Browser                  Local Engine
   (webRequest, tabs,        (parsers, rule engine,
    DevTools HAR, storage)    scoring, storage model)
          │                         │
          └────────────┬────────────┘
                       │
                 ScanEvidence  (pure data)
                       │
                  analyze(evidence)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Findings       Scores        Transport summary
        │              │              │
        └──────────────┼──────────────┘
                       │
                  ScanResult
                       │
          ┌────────────┼────────────┐
          │            │            │
        Popup      Dashboard     DevTools panel
   (per-tab live)  (history,      (HAR-driven,
                    compare,      no permissions)
                    batch, reports)
                       │
            Explain · Fix · Report · Regress
```

## Layers

| Layer      | Location                                                                   | Rules                                                                                          |
| ---------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Models     | `src/core/models/`                                                         | Pure types: `ScanEvidence`, `ScanResult`, `Finding`, `Rule`, `Settings`                        |
| Parsers    | `src/core/parser/`                                                         | `HttpHeaders` (multi-value, case-insensitive), Set-Cookie, CSP tokenizer, URL/Target helpers   |
| Rules      | `src/core/rules/`                                                          | One module per domain; a single `registry.ts` aggregates them                                  |
| Engine     | `src/core/scanner/analyze.ts`                                              | `analyze(evidence, options) → ScanResult`. Never throws on a buggy rule                        |
| Scoring    | `src/core/scoring/`                                                        | Transparent severity deductions, weighted module mean, non-applicable modules excluded         |
| Storage    | `src/core/storage/`                                                        | Pure async KV abstraction (`KVStore`) + history/latest/batch logic, testable without a browser |
| Platform   | `src/platform/browser.ts`                                                  | The only place that touches `chrome.*` (Firefox port lives here later)                         |
| Background | `src/background/`                                                          | MV3 service worker: network monitor, active scanner, tab manager, batch runner, message router |
| Reports    | `src/reports/`                                                             | JSON / Markdown / HTML generators + download helpers                                           |
| UI         | `src/ui/`, `src/popup/`, `src/dashboard/`, `src/options/`, `src/devtools/` | React surfaces over the same core; shared design tokens and components                         |

## Data acquisition (two paths, one engine)

1. **Passive monitor** (`background/network-monitor.ts`): `chrome.webRequest`
   `onBeforeRedirect`/`onCompleted`/`onErrorOccurred` with `extraHeaders` (needed to see
   `Set-Cookie` in MV3) observes main frames, subresources and redirects for **granted
   origins only**. Per-tab state is mirrored to `chrome.storage.session` so the service
   worker can die and resume without losing evidence.

2. **Active scanner** (`background/active-scanner.ts`): on-demand scans open a hidden,
   inactive tab and observe its real load (full redirect chain), falling back to a
   service-worker `fetch()` (headers via `Headers.getSetCookie()`). Used by the popup
   rescan, deep links and batch scanning.

3. **DevTools panel**: `chrome.devtools.network` HAR data → `ScanEvidence`. This path
   needs **no host permissions at all**.

Both paths produce the same `ScanEvidence` shape, so the rule engine cannot tell the
difference - which is what makes batch scanning and the DevTools panel "just work".

## Rule engine

```ts
interface Rule {
  id: string;                 // KLYNTO-HDR-001
  moduleId: ModuleId;         // headers | csp | cookies | cors | transport | cross-origin | disclosure | redirects
  severity: Severity;         // high | warning | review | info (fail default)
  applicable(ctx): boolean;   // static applicability (e.g. https only)
  detect(ctx): DetectResult | null;   // null = skip at runtime
  explanation / impact / recommendation / references / passTitle / fixControls
}
```

`detect()` returns `'pass'` or a finding with optional severity override and evidence.
Adding a check = adding one object + tests. Rules can be disabled individually; disabled
rules are skipped and do not affect scores.

## Severity philosophy

`high` only when it genuinely justifies it (e.g. plain-HTTP production page, wildcard
CORS + credentials). `review` for important-but-contextual gaps (missing CSP/HSTS/COOP).
`info` for disclosure and legacy/obsolete headers. The score is secondary; findings are
the product.

## Permissions model

- Install: `storage`, `webRequest`, `activeTab`, `contextMenus` - no host access.
- Optional: `http://*/*`, `https://*/*` requested **per origin** from the popup
  (or grant-all from Settings).
- Cookie analysis works from observed `Set-Cookie` response headers - the `cookies`
  permission is never needed.
- No content scripts, no `scripting`, no `notifications` (regressions use the badge).

## Firefox readiness

All browser-API access is funneled through `src/platform/browser.ts` and the build
generates a Firefox manifest variant (`background.scripts` instead of a service worker).
The v0.4 port is expected to be mostly mechanical.
