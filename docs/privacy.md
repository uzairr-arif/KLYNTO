# Privacy

**Klynto is local-first.** The whole product is built so that your browsing data never
needs to leave your machine - because it never does.

## What Klynto collects

**Nothing.** There is no telemetry, no analytics, no crash reporting, no account, no
server. Klynto makes no network requests of its own except when _you_ explicitly ask it
to scan a URL you typed (batch scanning) - and those requests go to the target site
itself, from your browser.

## What Klynto stores, and where

Everything lives in your browser profile's local extension storage on your device:

| Data                                     | Where                    | Purpose                                      |
| ---------------------------------------- | ------------------------ | -------------------------------------------- |
| Scan results (headers, findings, scores) | `chrome.storage.local`   | History, compare, reports                    |
| Latest scan per origin                   | `chrome.storage.local`   | Regression detection                         |
| Batch runs                               | `chrome.storage.local`   | Batch scan results                           |
| Settings                                 | `chrome.storage.local`   | Your preferences                             |
| Live per-tab evidence                    | `chrome.storage.session` | Passive inspection; cleared with the session |

You can export everything (Settings → Export all data) or wipe it
(Settings → Clear history & batch data) at any time. Uninstalling the extension
removes all of it.

## Permissions, honestly

| Permission                                 | Why                                                                                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                  | Save scans and settings locally on your device.                                                                                               |
| `webRequest`                               | Observe response headers of pages you granted access to. Klynto never blocks or modifies anything.                                            |
| `activeTab`                                | Read the URL of the page you invoked Klynto on.                                                                                               |
| `contextMenus`                             | The "Inspect security with Klynto" right-click entry.                                                                                         |
| `http://*/*`, `https://*/*` (**optional**) | Granted **per site** when you click "Enable inspection" - or for all sites only if you explicitly opt in via Settings. Revocable at any time. |

Klynto deliberately does **not** use the `cookies` API (cookie analysis reads observed
`Set-Cookie` response headers), content scripts, the `scripting` API, or notifications.

## What the DevTools panel can see

The DevTools panel reads the network log that DevTools itself already recorded for the
page you are inspecting. It requires no site permissions.

## Data flow diagram

```text
Website → your browser → Klynto (local analysis) → local results
                                  ✗ no servers, no uploads, no third parties
```

## Policy for future changes

If any of this ever changes, it will be a major, clearly announced change - and the
default will still be local-only. This project considers the local-first guarantee a
feature, not a limitation.
