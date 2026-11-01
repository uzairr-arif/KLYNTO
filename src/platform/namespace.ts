/**
 * Runtime namespace compatibility (must be the first import of every entry).
 *
 * Klynto calls the extension APIs promise-style via the `chrome` namespace.
 * That is correct on Chromium (MV3 `chrome.*` returns promises) but silently
 * broken on Firefox, where the `chrome` alias is callback-only and the
 * promise-based namespace is `browser.*` - `await chrome.tabs.query()`
 * evaluates to `undefined` there.
 *
 * When the `browser` global exists (Firefox), point `globalThis.chrome` at it
 * before any other module runs. Chromium has no `browser` global and is left
 * untouched. Both namespaces expose the same event objects and types, so the
 * rest of the codebase stays unmodified.
 */

type NamespaceLike = Record<string, unknown>;
const globals = globalThis as unknown as { browser?: NamespaceLike; chrome?: NamespaceLike };

if (globals.browser && globals.chrome && globals.browser !== globals.chrome) {
  globals.chrome = globals.browser;
}

export {};
