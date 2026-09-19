# Rules reference

Klynto ships 60 rules across 8 modules. Every rule is an independent unit with:
explanation, impact, recommendation, references, a pass title, tests, and (where
applicable) Fix Center snippets. Rules can be toggled in **Dashboard → Rules**.

Severity legend: 🟥 high · 🟧 warning · 🟨 review · ℹ️ info

## Transport (`KLYNTO-TRN-*`)

| ID      | Check                                                 | Severity when failing                  |
| ------- | ----------------------------------------------------- | -------------------------------------- |
| TRN-001 | Page served over plain HTTP (production)              | 🟥 high (ℹ️ info on localhost/private) |
| TRN-002 | Redirect chain downgrades HTTPS → HTTP                | 🟥 high                                |
| TRN-003 | Mixed content: insecure subresources on an HTTPS page | 🟧 warning                             |
| TRN-004 | HTTP → HTTPS redirect uses a temporary status         | ℹ️ info                                |
| TRN-005 | Site upgrades to HTTPS but sends no HSTS              | ℹ️ info                                |

## HTTP Headers (`KLYNTO-HDR-*`)

| ID      | Check                                                                        | Severity when failing |
| ------- | ---------------------------------------------------------------------------- | --------------------- |
| HDR-001 | Strict-Transport-Security missing                                            | 🟨 review             |
| HDR-002 | HSTS max-age short / invalid (thresholds: <1 week warning, <180 days review) | 🟧/🟨                 |
| HDR-003 | HSTS missing includeSubDomains                                               | 🟨 review             |
| HDR-004 | HSTS not preloaded                                                           | ℹ️ info               |
| HDR-005 | HSTS sent over plain HTTP (ignored by browsers)                              | ℹ️ info               |
| HDR-010 | Content-Security-Policy missing / Report-Only only                           | 🟨 review             |
| HDR-011 | Multiple enforced CSP headers (intersection semantics)                       | ℹ️ info               |
| HDR-012 | X-Content-Type-Options missing / invalid value                               | 🟨/🟧                 |
| HDR-013 | No clickjacking protection (no XFO, no frame-ancestors)                      | 🟨 review             |
| HDR-014 | X-Frame-Options invalid/deprecated value (ALLOW-FROM)                        | 🟧 warning            |
| HDR-015 | Referrer-Policy missing / unsafe-url / legacy default                        | 🟨/🟧/ℹ️              |
| HDR-016 | Permissions-Policy missing                                                   | ℹ️ info               |
| HDR-017 | Permissions-Policy grants sensitive features to `*`                          | 🟧 warning            |
| HDR-018 | X-XSS-Protection present (obsolete)                                          | ℹ️ info               |
| HDR-019 | Expect-CT present (retired)                                                  | ℹ️ info               |
| HDR-020 | X-UA-Compatible present (obsolete)                                           | ℹ️ info               |

## Content Security Policy (`KLYNTO-CSP-*`)

Runs only when a CSP is present (absence is HDR-010's job).

| ID      | Check                                                                       | Severity when failing |
| ------- | --------------------------------------------------------------------------- | --------------------- |
| CSP-001 | `unsafe-inline` in script sources (ℹ️ info when nonces/hashes make it moot) | 🟨/ℹ️                 |
| CSP-002 | `unsafe-eval` allowed                                                       | 🟨 review             |
| CSP-003 | Wildcard script/object sources (`*`, `*.host`, `http:`)                     | 🟧 warning            |
| CSP-004 | `data:` in script/object sources                                            | 🟨 review             |
| CSP-005 | object-src not restricted (`'none'` recommended)                            | 🟨 review             |
| CSP-006 | base-uri missing (not covered by default-src)                               | ℹ️ info               |
| CSP-007 | form-action missing                                                         | ℹ️ info               |
| CSP-008 | frame-ancestors could replace/complement XFO                                | ℹ️ info               |
| CSP-009 | No violation reporting configured                                           | ℹ️ info               |
| CSP-010 | upgrade-insecure-requests missing on HTTPS                                  | ℹ️ info               |
| CSP-011 | `'none'` mixed with other sources (directive ignored)                       | 🟧 warning            |
| CSP-012 | Policy does not restrict scripts at all                                     | 🟨 review             |
| CSP-013 | Unrecognized/typoed directives                                              | ℹ️ info               |

## Cookies (`KLYNTO-CKI-*`)

From observed `Set-Cookie` headers (no `cookies` permission needed).

| ID      | Check                                         | Severity when failing |
| ------- | --------------------------------------------- | --------------------- |
| CKI-001 | Secure attribute missing                      | 🟨 review             |
| CKI-002 | HttpOnly missing on session-like cookie names | 🟨 review             |
| CKI-003 | SameSite=None without Secure                  | 🟧 warning            |
| CKI-004 | SameSite missing (implicit Lax)               | ℹ️ info               |
| CKI-005 | Domain broader than the setting host          | ℹ️ info               |
| CKI-006 | `__Host-` prefix contract violated            | 🟧 warning            |
| CKI-007 | `__Secure-` prefix without Secure             | 🟧 warning            |
| CKI-008 | Long-lived (>1y) session-like cookie          | ℹ️ info               |
| CKI-009 | Cookies set over plain HTTP                   | 🟧 warning            |

## CORS (`KLYNTO-CRS-*`)

| ID      | Check                                                             | Severity when failing |
| ------- | ----------------------------------------------------------------- | --------------------- |
| CRS-001 | Wildcard origin + Allow-Credentials                               | 🟥 high               |
| CRS-002 | Credentialed access from a specific origin (verify the allowlist) | 🟨 review             |
| CRS-003 | Sensitive headers in Expose-Headers                               | 🟨 review             |
| CRS-004 | Wildcard origin (fine for public data - verify)                   | ℹ️ info               |
| CRS-005 | Reflected / `null` origin (possible reflection pattern)           | 🟨 review             |

## Cross-Origin Isolation (`KLYNTO-XOR-*`)

| ID      | Check                                                | Severity when failing |
| ------- | ---------------------------------------------------- | --------------------- |
| XOR-001 | COOP missing                                         | 🟨 review             |
| XOR-002 | COOP: unsafe-none                                    | ℹ️ info               |
| XOR-003 | COEP missing                                         | ℹ️ info               |
| XOR-004 | Cross-origin isolation not fully enabled (COOP+COEP) | ℹ️ info               |

## Information Disclosure (`KLYNTO-DSC-*`)

All ℹ️ info - fingerprinting surface, not vulnerabilities.

| ID      | Check                                                            |
| ------- | ---------------------------------------------------------------- |
| DSC-001 | Server header with version                                       |
| DSC-002 | X-Powered-By                                                     |
| DSC-003 | X-AspNet-Version / X-AspNetMvc-Version                           |
| DSC-004 | Via header                                                       |
| DSC-005 | Generator/runtime headers (X-Generator, X-Version, X-Runtime, …) |

## Redirects (`KLYNTO-RDR-*`)

| ID      | Check                          | Severity when failing |
| ------- | ------------------------------ | --------------------- |
| RDR-001 | Chain longer than two hops     | 🟨 review             |
| RDR-002 | Chain of exactly two hops      | ℹ️ info               |
| RDR-003 | Chain leaves the target origin | ℹ️ info               |

## Scoring model

- Deductions per finding: high −35, warning −18, review −10, info −2 (module score floors at 0).
- Overall score = weighted mean over **applicable** modules only:
  headers .20, CSP .18, transport .15, cookies .15, CORS .12, cross-origin .08,
  disclosure .07, redirects .05.
- Grades: ≥80 good · ≥50 fair · <50 poor.
- The score is a compass, not a verdict - read the findings.
