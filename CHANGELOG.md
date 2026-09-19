# Changelog

All notable changes to Klynto are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-19

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
