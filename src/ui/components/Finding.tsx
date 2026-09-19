import { useState } from 'react';
import type { Finding } from '@core/models';
import { getRule } from '@core/rules/registry';
import { SeverityBadge, SeverityIcon } from './SeverityBadge';
import { FixViewer } from './FixViewer';

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="codeblock">
      <CopyButton text={code} className="copy-btn" />
      <pre>
        <code data-language={language}>{code}</code>
      </pre>
    </div>
  );
}

export function CopyButton({
  text,
  className,
  label = 'Copy',
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`btn btn-sm btn-ghost ${className ?? ''}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          // clipboard unavailable
        }
      }}
    >
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

/** Accordion row + full detail for a finding. Static explanation text is
 *  resolved from the rule registry by id (keeps stored scans small). */
export function FindingRow({
  finding,
  defaultOpen = false,
}: {
  finding: Finding;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rule = getRule(finding.ruleId);

  return (
    <div className={`finding-row ${finding.status === 'pass' ? 'pass' : ''}`}>
      <button className="finding-summary" onClick={() => setOpen((v) => !v)}>
        <SeverityIcon severity={finding.severity} />
        <span className="finding-title">{finding.title}</span>
        {finding.status === 'fail' && <SeverityBadge severity={finding.severity} />}
        <span className={`finding-chevron ${open ? 'open' : ''}`}>▶</span>
      </button>
      {open && <FindingDetail finding={finding} />}
      {open && rule?.fixControls && rule.fixControls.length > 0 && (
        <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
          <FixViewer controls={rule.fixControls} />
        </div>
      )}
    </div>
  );
}

export function FindingDetail({ finding }: { finding: Finding }) {
  const rule = getRule(finding.ruleId);
  const evidence = finding.evidence;
  return (
    <div className="finding-detail">
      {rule && (
        <>
          <div className="detail-section">
            <h4>What this means</h4>
            <p>{rule.explanation}</p>
            {finding.detail && <p style={{ marginTop: 6 }}>{finding.detail}</p>}
          </div>
          <div className="detail-section">
            <h4>Why it matters</h4>
            <p>{rule.impact}</p>
          </div>
          <div className="detail-section">
            <h4>Recommended action</h4>
            <p>{rule.recommendation}</p>
          </div>
        </>
      )}

      {evidence && (
        <div className="detail-section">
          <h4>Evidence</h4>
          {evidence.summary && <p>{evidence.summary}</p>}
          {evidence.headers && evidence.headers.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {evidence.headers.map((h, i) => (
                <div className="header-row" key={i}>
                  <span className="name">{h.name}</span>
                  <span className="value">{h.value}</span>
                </div>
              ))}
            </div>
          )}
          {evidence.items && evidence.items.length > 0 && (
            <ul>
              {evidence.items.map((item, i) => (
                <li key={i} className="mono small">
                  {item}
                </li>
              ))}
            </ul>
          )}
          {evidence.detail && (
            <p className="mono small" style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>
              {evidence.detail}
            </p>
          )}
        </div>
      )}

      {rule && rule.references.length > 0 && (
        <div className="detail-section">
          <h4>Learn more</h4>
          <ul style={{ paddingLeft: 18 }}>
            {rule.references.map((ref) => (
              <li key={ref.url}>
                <a href={ref.url} target="_blank" rel="noreferrer noopener" className="small">
                  {ref.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
