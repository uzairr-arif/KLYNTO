# Security Policy

## Scope

Klynto is a browser extension that observes network responses the user grants access
to, analyzes them locally, and stores results in local extension storage. It has no
backend, no accounts and no network activity of its own beyond fetching pages the user
explicitly asks it to scan.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |

## Reporting a vulnerability

Please report suspected vulnerabilities privately:

1. Open a **private** security advisory via GitHub → Security → Advisories, **or**
2. Contact the maintainers directly (see the repository profile).

Include: affected version, a reproduction (extension version, steps, expected vs actual),
and any logs. Please do not open public issues for unpatched vulnerabilities.

We aim to acknowledge reports within 72 hours and will keep you informed throughout.

## Hardening notes

- Klynto never evaluates remote content as code; all pages are React bundles built from
  this repository with a strict extension CSP (`script-src 'self'`).
- Scan data lives in `chrome.storage.local`/`.session` only and is never transmitted.
- Permissions are deliberately minimal; host access is optional and per-origin.
