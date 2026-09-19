<div align="center">

# KLYNTO

**Web Security Inspector & Developer Toolkit**

> Inspect. Understand. Fix.

A local-first browser extension for developers that inspects web security signals,
explains what they mean, identifies configuration issues, and provides actionable fixes.

`TypeScript` `React` `Manifest V3` `No servers` `No telemetry`

</div>

---

## What Klynto does

Klynto doesn't just tell you that something exists or is missing - it explains what it
means and what you can do about it:

```text
Content-Security-Policy
────────────────────────
⚠ Review

CSP was not detected.

What does this mean?
CSP controls which resources a browser is allowed to load and can reduce the
impact of certain content-injection scenarios.

Recommended action
Define a CSP appropriate for this application.

[View Fix] [Documentation]
```

### Modules

| Module           | What it inspects                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Transport**    | HTTPS, HTTP→HTTPS redirects, mixed content                                                                                          |
| **HTTP Headers** | HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, obsolete headers                                |
| **CSP**          | Full policy parsing: `unsafe-inline`/`unsafe-eval`, wildcards, `data:`, `object-src`, `base-uri`, `form-action`, reporting and more |
| **Cookies**      | `Set-Cookie` attributes: Secure, HttpOnly, SameSite, Domain scope, `__Host-`/`__Secure-` prefixes, lifetimes                        |
| **CORS**         | Wildcard + credentials, origin reflection, exposed headers                                                                          |
| **Cross-Origin** | COOP / COEP / CORP isolation status                                                                                                 |
| **Disclosure**   | Server/X-Powered-By/ASP.NET version fingerprints                                                                                    |
| **Redirects**    | Chain length, downgrades, cross-origin hops                                                                                         |

### Feature highlights

- **Security posture score** - transparent, per-module breakdown. Findings matter more than the number.
- **Fix Center** - copy-paste snippets per finding for Express, Next.js, NGINX, Apache, WordPress, PHP, Cloudflare and Django (clearly labeled _starting points_).
- **Scan history** - everything stored locally, with per-origin latest state.
- **Compare mode** - side-by-side diff of any two scans (e.g. production vs staging) with regression/improvement highlighting.
- **Regression detection** - a toolbar badge fires when a control that previously passed now fails.
- **Batch scanning** - enter a list of targets (production, staging, API, admin…) and scan them all.
- **Reports** - JSON (machines), Markdown (GitHub issues), and a self-contained HTML report (print → PDF).
- **DevTools panel** - a full Klynto analysis surface inside DevTools, powered by the network log, with **zero extra permissions**.
- **Rule registry** - every check is an independent rule with explanation, impact, recommendation, fix snippets and MDN/OWASP references. Rules can be toggled individually in Settings.

## Privacy & permissions

Klynto is **local-first**: all analysis runs in your browser, history stays on your
machine, and nothing is ever sent to a server. There is **no telemetry** and no account.

Klynto requests access **per site** via a prompt the first time you inspect a domain - 
not "read all your data on all websites" at install. You can revoke any origin any time
in Settings → Site access. It never modifies requests or pages; it only observes.

## Install

### From source (Chrome / Edge / Brave)

```bash
git clone https://github.com/your-org/klynto.git
cd klynto
npm install
npm run build
```

Then:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

### Keyboard shortcut

`Ctrl+Shift+K` (`Cmd+Shift+K` on macOS) opens Klynto.

## Development

```bash
npm install
npm run watch      # rebuild dist/ on change, then reload the extension
npm test           # unit tests (every rule is tested)
npm run typecheck  # strict TypeScript
npm run lint       # ESLint
npm run release    # build + package store ZIP into releases/
```

See [docs/development.md](docs/development.md) for the architecture tour and
[docs/architecture.md](docs/architecture.md) for the design rationale.

## Testing

Every security rule ships with positive, negative and edge-case tests driven by JSON
fixtures (`tests/fixtures/`), plus parser, scoring, storage, regression-diff and
component tests. Run them with `npm test`.

## Roadmap

- [x] v0.1 - Foundation: observation, header rules, findings, posture, popup
- [x] v0.2 - Analysis: CSP, cookies, CORS, transport, disclosure, Fix Center, history, exports
- [x] v0.3 - Toolkit: compare, regressions, batch, reports, DevTools panel, rule config
- [ ] v0.4 - Firefox build (architecture is already adapter-based)
- [ ] v0.5 - Custom rules, project environments, security baselines

## License

[MIT](LICENSE)
