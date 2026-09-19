import { type ScoreGrade, type ScoreSummary } from '@core/models';

const GRADE_LABEL: Record<ScoreGrade, string> = {
  good: 'Good posture',
  fair: 'Needs attention',
  poor: 'Poor posture',
  unknown: 'Not assessable',
};

const GRADE_COLOR: Record<ScoreGrade, string> = {
  good: 'var(--severity-pass)',
  fair: 'var(--severity-warning)',
  poor: 'var(--severity-high)',
  unknown: 'var(--severity-na)',
};

export function ScoreRing({
  score,
  grade,
  size = 116,
}: {
  score: number;
  grade: ScoreGrade;
  size?: number;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circumference;
  const color = grade === 'unknown' ? 'var(--severity-na)' : GRADE_COLOR[grade];

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ transition: 'stroke-dasharray 400ms ease' }}
        />
      </svg>
      <div className="score-ring-value">
        <div className="number" style={{ color }}>
          {score < 0 ? '-' : score}
        </div>
        <div className="label">{GRADE_LABEL[grade]}</div>
      </div>
    </div>
  );
}

export function scoreColor(grade: ScoreGrade): string {
  return GRADE_COLOR[grade];
}

export function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="score-bar">
      <div style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: color }} />
    </div>
  );
}

export function ScoreBreakdown({ scores }: { scores: ScoreSummary }) {
  const modules = Object.entries(scores.modules).filter(([, m]) => m.applicable);
  if (modules.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {modules.map(([id, module]) => {
        const worst = (['high', 'warning', 'review', 'info'] as const).find(
          (severity) => module.counts[severity] > 0,
        );
        const color = worst
          ? `var(--severity-${worst})`
          : module.score >= 80
            ? 'var(--severity-pass)'
            : module.score >= 50
              ? 'var(--severity-warning)'
              : 'var(--severity-high)';
        return (
          <div key={id}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 'var(--text-xs)',
                marginBottom: 4,
              }}
            >
              <span className="muted">{id.replace('-', ' ')}</span>
              <span style={{ color, fontWeight: 600 }}>{module.score}</span>
            </div>
            <ScoreBar score={module.score} color={color} />
          </div>
        );
      })}
    </div>
  );
}
