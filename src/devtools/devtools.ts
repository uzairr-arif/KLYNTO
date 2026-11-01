import '../platform/namespace';

// DevTools entry: registers the Klynto panel. Chromium delivers the panel
// through the callback; Firefox (via the namespace shim, chrome === browser)
// returns a promise - handle whichever form this runtime produced.
const registration = chrome.devtools.panels.create(
  'Klynto',
  'icons/icon-32.png',
  'panel.html',
) as unknown;
if (registration && typeof (registration as PromiseLike<unknown>).then === 'function') {
  void Promise.resolve(registration).catch(() => undefined);
}
