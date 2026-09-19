import { useMemo, useState } from 'react';
import { ALL_RULES } from '@core/rules/registry';
import { MODULE_IDS, MODULE_META } from '@core/models';
import { useSettings } from '../../ui/hooks/useSettings';
import { SeverityBadge } from '../../ui/components/SeverityBadge';
import { Spinner, Toggle } from '../../ui/components/Controls';

export function RulesView() {
  const { settings, update, ready } = useSettings();
  const [query, setQuery] = useState('');

  const disabled = useMemo(() => new Set(settings.disabledRuleIds), [settings.disabledRuleIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_RULES;
    return ALL_RULES.filter(
      (rule) =>
        rule.title.toLowerCase().includes(q) ||
        rule.id.toLowerCase().includes(q) ||
        rule.summary.toLowerCase().includes(q),
    );
  }, [query]);

  if (!ready) return <Spinner />;

  return (
    <div className="dash-view">
      <header className="view-header">
        <h1>Rules</h1>
        <div className="view-actions">
          <input
            placeholder="Search rules…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 220 }}
          />
        </div>
      </header>

      <p className="small muted" style={{ marginBottom: 16 }}>
        {ALL_RULES.length} rules across {MODULE_IDS.length} modules. Disabled rules are skipped
        during analysis and do not affect scores. Every rule ships with an explanation, a
        recommendation and references - this is Klynto’s rule engine, running locally.
      </p>

      {MODULE_IDS.map((moduleId) => {
        const rules = filtered.filter((r) => r.moduleId === moduleId);
        if (rules.length === 0) return null;
        return (
          <section key={moduleId} style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ marginBottom: 8 }}>
              <div className="uppercase-label">{MODULE_META[moduleId].label}</div>
              <div className="xs faint">{MODULE_META[moduleId].description}</div>
            </div>
            <div className="card" style={{ padding: 0 }}>
              {rules.map((rule) => {
                const isEnabled = !disabled.has(rule.id);
                return (
                  <div key={rule.id} className="rule-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="small" style={{ fontWeight: 600 }}>
                        {rule.title} <span className="mono xs faint">{rule.id}</span>
                      </div>
                      <div className="xs muted" style={{ marginTop: 2 }}>
                        {rule.summary}
                      </div>
                    </div>
                    <SeverityBadge severity={rule.severity} />
                    <Toggle
                      on={isEnabled}
                      label={`Enable ${rule.id}`}
                      onChange={(next) => {
                        const nextDisabled = new Set(disabled);
                        if (next) nextDisabled.delete(rule.id);
                        else nextDisabled.add(rule.id);
                        void update({ disabledRuleIds: [...nextDisabled] });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
