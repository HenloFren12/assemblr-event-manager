// src/components/shared/ReadinessPanel.tsx
import type { ReadinessBreakdown } from '../../../shared/readiness';
import ReadinessMeter from './ReadinessMeter';

const ROWS = [
  { key: 'ownership', label: 'Tasks owned' },
  { key: 'schedule', label: 'On schedule' },
  { key: 'budget', label: 'Budget fit' },
  { key: 'progress', label: 'Completed' },
] as const;

export default function ReadinessPanel({ breakdown }: { breakdown: ReadinessBreakdown }) {
  return (
    <section className="readiness-panel" aria-label="Event readiness summary">
      <ReadinessMeter score={breakdown.score} />
      <dl className="readiness-panel__stats">
        {ROWS.map(row => (
          <div key={row.key} className="readiness-panel__row">
            <dt>{row.label}</dt>
            <dd>{breakdown[row.key]}%</dd>
            <span className="bar" aria-hidden="true">
              <span style={{ width: `${breakdown[row.key]}%` }} />
            </span>
          </div>
        ))}
      </dl>
    </section>
  );
}
