import { Logo } from '../../ui/components/Logo';

export function WelcomeView({ onDone }: { onDone: () => void }) {
  return (
    <div className="dash-view welcome-view">
      <Logo size={56} />
      <h1 style={{ marginTop: 16 }}>Welcome to Klynto</h1>
      <p className="muted" style={{ textAlign: 'center', maxWidth: 460 }}>
        A local-first web security inspector for developers. Klynto inspects HTTP security headers,
        CSP, cookies, CORS, transport and more - then explains what each finding means and how to
        fix it.
      </p>
      <ul className="welcome-points">
        <li>
          <strong>Local-only.</strong> All analysis runs in your browser. No servers, no accounts,
          no telemetry - ever.
        </li>
        <li>
          <strong>Minimal permissions.</strong> Klynto asks per site. Grant access from the popup
          when you want a site inspected, revoke anytime in Settings.
        </li>
        <li>
          <strong>Understand & fix.</strong> Every finding explains what it means, why it matters
          and includes copy-paste fixes for your stack.
        </li>
      </ul>
      <button className="btn btn-primary" onClick={onDone}>
        Get started
      </button>
    </div>
  );
}
