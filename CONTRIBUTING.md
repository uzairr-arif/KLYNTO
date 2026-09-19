# Contributing to Klynto

Thanks for your interest in improving Klynto! This guide covers the essentials.

## Development setup

```bash
npm install
npm run watch        # builds dist/ and rebuilds on change
```

Load the extension once:

1. `chrome://extensions` → Developer mode → **Load unpacked** → select `dist/`
2. After changes, rebuild (`npm run watch` does this automatically) and hit reload on
   the extension card (or use the reload button in `chrome://extensions`).

## Project rules

1. **All security logic lives in `src/core/` and `src/modules/`-style rule modules.**
   The popup, dashboard and DevTools panel are UI only - no detection logic there.
2. **All `chrome.*` usage flows through `src/platform/browser.ts`** (or the background
   service worker) so a Firefox port stays cheap.
3. **Every rule needs tests.** Rules live in `src/core/rules/`, are registered in
   `src/core/rules/registry.ts`, and must include: explanation, impact, recommendation,
   references (MDN/OWASP), pass title, and where possible Fix Center snippets.
4. **Severity honesty.** Prefer `review` over fake `high` findings. Legacy headers are
   `info`. Never present a configuration difference as a vulnerability without cause.
5. **No new permissions without justification.** Anything that widens access needs a
   discussion in the PR and an update to `stores/permission-justifications.md`.

## Workflow

```bash
npm run typecheck   # strict TS must pass
npm run lint        # ESLint must pass
npm test            # every rule + parsers + storage + compare must pass
npm run build       # extension must build
```

CI runs all of the above on every push and PR.

## Adding a rule (checklist)

1. Add the rule to the appropriate module in `src/core/rules/`.
2. Add tests in `tests/rules/` - positive, negative and edge cases.
3. Add a fixture to `tests/fixtures/` if it represents a realistic response.
4. Add Fix Center snippets (`src/core/fixes/library.ts`) if there is a concrete fix.
5. Run `npm test` and open a PR describing the check's rationale.

## Reporting issues

Please search existing issues first. Security-relevant reports about Klynto itself go
through [SECURITY.md](SECURITY.md).
