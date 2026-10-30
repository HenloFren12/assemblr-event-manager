// src/components/whatif/DiffView.tsx
import type { Patch, Task } from '../../../shared/schemas';

interface DiffViewProps {
  patch: Patch;
  before: Task[]; // the plan BEFORE the patch, used to show titles of removed tasks
  after: Task[];  // the plan AFTER the patch
}

export default function DiffView({ patch, before, after }: DiffViewProps) {
  const titleBefore = new Map(before.map(t => [t.id, t.title]));
  const titleAfter = new Map(after.map(t => [t.id, t.title]));
  const nothing = patch.added.length + patch.modified.length + patch.removed.length === 0;

  return (
    <section aria-label="What changed" className="diff">
      <p className="diff__summary">{patch.summary}</p>
      {nothing && <p>No task changes were needed.</p>}

      {patch.added.length > 0 && (
        <div className="diff__group diff__group--added">
          <h3>Added ({patch.added.length})</h3>
          <ul>
            {patch.added.map(t => (
              <li key={t.id}><strong>+ {t.title}</strong>{t.reason ? `: ${t.reason}` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {patch.modified.length > 0 && (
        <div className="diff__group diff__group--modified">
          <h3>Changed ({patch.modified.length})</h3>
          <ul>
            {patch.modified.map(m => (
              <li key={m.id}>
                <strong>~ {titleAfter.get(m.id) ?? titleBefore.get(m.id) ?? m.id}</strong>
                {` (${Object.keys(m.changes).filter(k => k !== 'reason').join(', ') || 'details'})`}
                {m.changes.reason ? `: ${m.changes.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {patch.removed.length > 0 && (
        <div className="diff__group diff__group--removed">
          <h3>Removed ({patch.removed.length})</h3>
          <ul>
            {patch.removed.map(id => (
              <li key={id}><s>{titleBefore.get(id) ?? id}</s></li>
            ))}
          </ul>
        </div>
      )}

      {patch.tradeoffs.length > 0 && (
        <div className="diff__group">
          <h3>Decisions for you</h3>
          <ul>{patch.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
