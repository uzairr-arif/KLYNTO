# Changelog

All notable changes to Klynto are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Firefox is now a first-class target (milestone v0.4 polish):
  - A namespace compatibility shim (`platform/namespace.ts`) aliases the
    promise-based `browser.*` API onto `chrome.*` on Firefox, so every surface
    (popup, dashboard, options, DevTools, background) works unchanged on both
    engines; `browserApi.isChromium()` no longer misreports Firefox.
  - The Firefox manifest carries a stable `browser_specific_settings.gecko.id`
    (GUID), `data_collection_permissions: none`, and `optional_permissions` for
    host patterns (Chromium's `optional_host_permissions` key is not supported
    on Firefox).
  - `web-ext` linting (`npm run lint:firefox`) gates the Firefox build locally
    and in CI - the package must lint with zero errors before it ships.

### Fixed

- The passive network monitor no longer references the Chromium-only
  `webRequest.On*Options` enum constants; on Firefox that could leave the
  listener registered without response headers (losing cookie, CORS and CSP
  evidence). The extraInfoSpec is now built per engine: `extraHeaders` only on
  Chromium, raw strings everywhere.
- `contextMenus.removeAll()` is called in promise form (the callback signature
  is not honoured through the Firefox namespace shim).
- The DevTools panel registration handles both the Chromium callback form and
  the Firefox promise form of `devtools.panels.create`.
- `grantedHosts()` degrades to an empty grant list when
  `permissions.getAll()` is unavailable instead of rejecting.

## [1.0.0] - 2026-09-29

First public release. Inspect. Understand. Fix.

### Added

- **Analyzer modules** (60 rules, each unit-tested):
  - Transport: HTTPS, redirect downgrades, mixed content, HTTP→HTTPS redirect quality
  - HTTP Headers: HSTS (presence/max-age/subdomains/preload), X-Content-Type-Options,
    framing protection (X-Frame-Options + frame-ancestors), Referrer-Policy,
    Permissions-Policy, obsolete header context (X-XSS-Protection, Expect-CT, X-UA-Compatible)
  - CSP: full policy tokenizer with unsafe-inline/unsafe-eval, wildcard and `data:` sources,
    object-src, base-uri, form-action, frame-ancestors, reporting, `none` validity, typos
  - Cookies: Secure, HttpOnly, SameSite, broad Domain, `__Host-`/`__Secure-` prefixes,
    long-lived session cookies, cookies over plain HTTP
  - CORS: wildcard + credentials, credentialed origins, exposed sensitive headers,
    wildcard notes, origin reflection
  - Cross-origin: COOP/COEP presence and full isolation status
  - Disclosure: Server version, X-Powered-By, ASP.NET, Via, generator headers
  - Redirects: chain length, cross-origin hops
- **Security posture score** with transparent per-module breakdown
- **Findings with explanations** - every finding explains what it means, why it matters
  and recommends an action, with MDN/OWASP references
- **Fix Center** - per-rule snippets for Express, Next.js, NGINX, Apache, WordPress, PHP,
  Cloudflare and Django, labeled as starting points
- **Popup** - posture ring, module tiles, findings list, per-site permission prompt,
  regression banner
- **Dashboard** - scan detail, history, compare (side-by-side diff), batch scanning with
  live progress, reports, rule registry with toggles, settings
- **Regression detection** - toolbar badge + banner when a previously passing control fails
- **Scan history** - local-only, deduped within a window, size-configurable
- **Exports** - JSON, Markdown, self-contained HTML report (print to PDF); CSV for batches
- **DevTools panel** - full analysis surface from the network log, no extra permissions
- **Options page**, context menu ("Inspect security with Klynto"), `Ctrl+Shift+K` shortcut
- **Local-first privacy** - per-site optional permissions, no host access at install,
  no telemetry, no servers
- **CI** - GitHub Actions: typecheck, lint, tests, build, release packaging
- **Product website** - static landing page with privacy policy, deployable to
  GitHub Pages or Vercel; zero JavaScript, zero tracking

### Fixed

- Duplicate rows in the dashboard Site access list (each granted host appeared once
  per permission pattern instead of once per host)
- Compare view classified rules evaluated on only one side of a diff as
  improvements/regressions; such rows are now a neutral "changed"
- Watch mode no longer wipes `dist/` between rebuilds, which previously disabled
  the unpacked extension in Chrome
- CI verifies and packages each browser target immediately after its own build

### Security

- Updated development dependencies to patched versions (sharp, vitest, glob);
  none are bundled in the shipped extension
