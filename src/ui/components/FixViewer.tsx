import { useState } from 'react';
import { getFixes, type FixControlId } from '@core/fixes/library';
import { CodeBlock } from './Finding';

const CONTROL_LABEL: Record<FixControlId, string> = {
  hsts: 'Strict-Transport-Security',
  csp: 'Content-Security-Policy',
  xcto: 'X-Content-Type-Options',
  frame: 'Framing protection',
  referrer: 'Referrer-Policy',
  'permissions-policy': 'Permissions-Policy',
  coop: 'Cross-Origin-Opener-Policy',
  coep: 'Cross-Origin-Embedder-Policy',
  'https-redirect': 'HTTP → HTTPS redirect',
  'cookie-secure': 'Cookie Secure attribute',
  'cookie-httponly': 'Cookie HttpOnly attribute',
  'cookie-samesite': 'Cookie SameSite attribute',
  'hide-server': 'Hide server details',
  'remove-obsolete': 'Remove obsolete headers',
};

/** Fix Center: platform chooser + copyable starting-point snippets. */
export function FixViewer({ controls }: { controls: FixControlId[] }) {
  const [controlIndex, setControlIndex] = useState(0);
  const [platformIndex, setPlatformIndex] = useState(0);

  const control = controls[Math.min(controlIndex, controls.length - 1)];
  const fixes = getFixes(control);
  if (fixes.length === 0) return null;
  const fix = fixes[Math.min(platformIndex, fixes.length - 1)];

  return (
    <div className="detail-section" style={{ marginTop: 'var(--space-4)' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <h4 style={{ margin: 0 }}>Fix Center</h4>
        <span className="xs faint">Starting points - review before use</span>
      </div>

      {controls.length > 1 && (
        <div className="tabbar" style={{ marginTop: 8 }}>
          {controls.map((c, i) => (
            <button
              key={c}
              className={i === controlIndex ? 'active' : ''}
              onClick={() => {
                setControlIndex(i);
                setPlatformIndex(0);
              }}
            >
              {CONTROL_LABEL[c]}
            </button>
          ))}
        </div>
      )}

      <div className="tabbar" style={{ marginTop: 8 }}>
        {fixes.map((f, i) => (
          <button
            key={f.platform}
            className={i === platformIndex ? 'active' : ''}
            onClick={() => setPlatformIndex(i)}
          >
            {f.platformLabel}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        {fix.note && (
          <p className="small muted" style={{ marginBottom: 8 }}>
            {fix.note}
          </p>
        )}
        <CodeBlock code={fix.code} language={fix.language} />
      </div>
    </div>
  );
}
