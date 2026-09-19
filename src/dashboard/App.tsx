import { useCallback, useEffect, useState } from 'react';
import type { ScanResult } from '@core/models';
import { useSettings, useTheme } from '../ui/hooks/useSettings';
import { browserApi } from '../platform/browser';
import { sendToBackground } from '../shared/messages';
import { APP_NAME, APP_TAGLINE } from '../shared/constants';
import { Logo } from '../ui/components/Logo';
import { DashboardView, ScanDetail } from './views/DashboardView';
import { HistoryView } from './views/HistoryView';
import { CompareView } from './views/CompareView';
import { BatchView } from './views/BatchView';
import { ReportsView } from './views/ReportsView';
import { RulesView } from './views/RulesView';
import { SettingsView } from './views/SettingsView';
import { WelcomeView } from './views/WelcomeView';

export type Route =
  'dashboard' | 'history' | 'compare' | 'batch' | 'reports' | 'rules' | 'settings' | 'welcome';

const NAV: Array<{ id: Route; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'history', label: 'Scans', icon: '≡' },
  { id: 'compare', label: 'Compare', icon: '⇄' },
  { id: 'batch', label: 'Batch Scan', icon: '⊞' },
  { id: 'reports', label: 'Reports', icon: '⇩' },
  { id: 'rules', label: 'Rules', icon: '☑' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

function parseHash(): { route: Route; scanUrl?: string } {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('scan?url=')) {
    const url = decodeURIComponent(hash.slice('scan?url='.length));
    return { route: 'dashboard', scanUrl: url };
  }
  const valid: Route[] = [
    'dashboard',
    'history',
    'compare',
    'batch',
    'reports',
    'rules',
    'settings',
    'welcome',
  ];
  const route = valid.includes(hash as Route) ? (hash as Route) : 'dashboard';
  return { route };
}

export function App() {
  const { settings } = useSettings();
  useTheme(settings);
  const [route, setRoute] = useState<Route>(() => parseHash().route);
  const [scanUrl, setScanUrl] = useState<string | undefined>(() => parseHash().scanUrl);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const onHash = () => {
      const parsed = parseHash();
      setRoute(parsed.route);
      setScanUrl(parsed.scanUrl);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.location.hash = next;
    setRoute(next);
    setScanUrl(undefined);
  }, []);

  // Handle deep links from the popup / context menu: run the scan immediately.
  useEffect(() => {
    if (!scanUrl || scanning) return;
    setScanning(true);
    sendToBackground<ScanResult>({ type: 'scan/url', url: scanUrl })
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        setScanning(false);
        window.location.hash = 'dashboard';
      });
  }, [scanUrl, scanning]);

  return (
    <div className="dash">
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <Logo size={22} />
          <div>
            <div className="dash-brand-name">{APP_NAME}</div>
            <div className="xs faint">{APP_TAGLINE}</div>
          </div>
        </div>
        <nav className="dash-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={route === item.id ? 'active' : ''}
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="dash-sidebar-footer xs faint">
          <div>Local-first · No telemetry</div>
          <div>v{browserApi.extensionVersion()}</div>
        </div>
      </aside>

      <main className="dash-main">
        {route === 'dashboard' && <DashboardView scanUrl={scanUrl} scanning={scanning} />}
        {route === 'history' && <HistoryView onOpenScan={() => navigate('dashboard')} />}
        {route === 'compare' && <CompareView />}
        {route === 'batch' && <BatchView />}
        {route === 'reports' && <ReportsView />}
        {route === 'rules' && <RulesView />}
        {route === 'settings' && <SettingsView />}
        {route === 'welcome' && <WelcomeView onDone={() => navigate('dashboard')} />}
      </main>
    </div>
  );
}

export { ScanDetail };
