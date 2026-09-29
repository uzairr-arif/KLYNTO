# Privacy policy - Klynto

_Last updated: 2026-09-19_

Klynto is a browser extension ("the extension") that inspects web security signals.
This policy describes exactly what the extension does with data. Short version: **it
does not collect, transmit or sell any data.**

## Data collection

The extension does **not** collect, store remotely, or transmit:

- browsing history
- page content, headers, or cookies
- scan results
- personal information
- analytics or telemetry of any kind

All analysis is performed locally in your browser. All results are stored only in your
browser profile's local extension storage, on your device. There is no backend server,
no account system, and no third-party code that phones home.

## Permissions

The extension requests the minimum permissions required:

- **storage** - to save your scan history and settings locally on your device.
- **webRequest** - to observe response headers of pages you have granted access to.
  The extension never blocks or modifies web requests.
- **activeTab** - to read the address of the page you invoked the extension on.
- **contextMenus** - to provide the "Inspect security with Klynto" right-click entry.
- **Optional host permissions** - access is requested **per site** when you choose to
  inspect a domain ("Enable inspection" in the popup). You may instead grant or revoke
  access for all sites from the extension's Settings at any time. Without this grant,
  the extension cannot observe any site's responses.

## Data retention and deletion

Scan history and settings remain on your device until you delete them (Settings →
Clear history & batch data) or uninstall the extension, which removes all stored data.

## Third parties

None. The extension contains no external scripts, trackers, CDNs or APIs.

## Changes

If this policy ever changes, the change will be documented in the extension's
changelog and release notes. The local-first default will not change silently.

## Contact

Open an issue on the project's GitHub repository for any privacy questions.
