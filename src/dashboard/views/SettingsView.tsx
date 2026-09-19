import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS } from '@core/models';
import { clearAllData, exportAllData, importAllData, type DataExport } from '@core/storage/storage';
import { browserApi } from '../../platform/browser';
import { useSettings } from '../../ui/hooks/useSettings';
import { Toggle } from '../../ui/components/Controls';
import { hostFromOriginPattern } from '../../shared/utils';
import { HISTORY_LIMITS } from '../../shared/constants';
import { APP_NAME } from '../../shared/constants';

export function SettingsView({ standalone = false }: { standalone?: boolean }) {
  const { settings, update, ready } = useSettings();
  const [grantedHosts, setGrantedHosts] = useState<string[]>([]);
  const [status, setStatus] = useState('');

  const reloadGrants = () => {
    void browserApi.grantedHosts().then((patterns) => {
      setGrantedHosts(
        patterns
          .map(hostFromOriginPattern)
          .filter((h): h is string => h !== null)
          .sort(),
      );
    });
  };

  useEffect(reloadGrants, []);

  if (!ready) return null;

  const flash = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(''), 2500);
  };

  return (
    <div className={`dash-view ${standalone ? 'options-view' : ''}`}>
      {!standalone && (
        <header className="view-header">
          <h1>Settings</h1>
        </header>
      )}
      {standalone && (
        <header className="view-header" style={{ paddingTop: 0 }}>
          <h1>Klynto Settings</h1>
        </header>
      )}

      <section className="card">
        <div className="card-title">General</div>
        <div className="setting-row">
          <div>
            <div>Theme</div>
            <div className="xs muted">Follow the system, or pick a fixed theme.</div>
          </div>
          <select
            value={settings.theme}
            onChange={(e) => void update({ theme: e.target.value as typeof settings.theme })}
          >
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <div>Show passing checks</div>
            <div className="xs muted">Include green PASS rows in finding lists.</div>
          </div>
          <Toggle
            on={settings.showPasses}
            onChange={(v) => void update({ showPasses: v })}
            label="Show passing checks"
          />
        </div>
      </section>

      <section className="card">
        <div className="card-title">Scanning</div>
        <div className="setting-row">
          <div>
            <div>Automatic inspection</div>
            <div className="xs muted">
              Inspect pages as they load, for origins you have granted access to.
            </div>
          </div>
          <Toggle
            on={settings.autoInspect}
            onChange={(v) => void update({ autoInspect: v })}
            label="Automatic inspection"
          />
        </div>
        <div className="setting-row">
          <div>
            <div>Analyze cookies</div>
            <div className="xs muted">
              Evaluate Set-Cookie attributes (Secure, HttpOnly, SameSite…).
            </div>
          </div>
          <Toggle
            on={settings.analyzeCookies}
            onChange={(v) => void update({ analyzeCookies: v })}
            label="Analyze cookies"
          />
        </div>
        <div className="setting-row">
          <div>
            <div>Analyze CORS</div>
            <div className="xs muted">Evaluate cross-origin response configuration.</div>
          </div>
          <Toggle
            on={settings.analyzeCors}
            onChange={(v) => void update({ analyzeCors: v })}
            label="Analyze CORS"
          />
        </div>
        <div className="setting-row">
          <div>
            <div>History size</div>
            <div className="xs muted">
              Scans kept on this device ({HISTORY_LIMITS.min}-{HISTORY_LIMITS.max}).
            </div>
          </div>
          <input
            type="number"
            min={HISTORY_LIMITS.min}
            max={HISTORY_LIMITS.max}
            value={settings.historyLimit}
            style={{ width: 90 }}
            onChange={(e) =>
              void update({
                historyLimit: Number.parseInt(e.target.value, 10) || DEFAULT_SETTINGS.historyLimit,
              })
            }
          />
        </div>
      </section>

      <section className="card">
        <div className="card-title">Site access</div>
        <p className="xs muted" style={{ marginBottom: 10 }}>
          Klynto can only observe responses for origins you granted. Grant per-site from the popup,
          or add all sites below. Revoke any time - no data leaves your browser either way.
        </p>
        {grantedHosts.length === 0 ? (
          <p className="small faint">No origins granted yet.</p>
        ) : (
          <div className="host-list">
            {grantedHosts.map((host) => (
              <div key={host} className="host-row">
                <span className="mono small">{host}</span>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={async () => {
                    await browserApi.removeOrigins([`http://${host}/*`, `https://${host}/*`]);
                    reloadGrants();
                    flash(`Removed access for ${host}`);
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn-sm"
            onClick={async () => {
              await browserApi.requestOrigins(['http://*/*', 'https://*/*']);
              reloadGrants();
            }}
          >
            Grant access to all sites…
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-title">Privacy & data</div>
        <p className="xs muted" style={{ marginBottom: 10 }}>
          Klynto is local-first: analysis happens in your browser, history stays on this device, and
          nothing is ever sent to a server. There is no telemetry.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-sm"
            onClick={async () => {
              const data = await exportAllData(browserApi.storageLocal());
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = `klynto-export-${new Date().toISOString().slice(0, 10)}.json`;
              anchor.click();
              setTimeout(() => URL.revokeObjectURL(url), 5000);
              flash('Data exported');
            }}
          >
            Export all data
          </button>
          <label className="btn btn-sm" style={{ position: 'relative', overflow: 'hidden' }}>
            Import data
            <input
              type="file"
              accept="application/json"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const parsed = JSON.parse(await file.text()) as DataExport;
                  await importAllData(browserApi.storageLocal(), parsed);
                  flash('Data imported');
                } catch {
                  flash('Import failed - not a Klynto export');
                }
              }}
            />
          </label>
          <button
            className="btn btn-sm btn-danger"
            onClick={async () => {
              await clearAllData(browserApi.storageLocal());
              flash('History and batch data cleared');
            }}
          >
            Clear history & batch data
          </button>
        </div>
        {status && (
          <p className="small" style={{ marginTop: 10, color: 'var(--accent)' }}>
            {status}
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-title">About</div>
        <p className="small muted">
          {APP_NAME} v{browserApi.extensionVersion()} - Web Security Inspector & Developer Toolkit.
          Inspect. Understand. Fix.
        </p>
      </section>
    </div>
  );
}
