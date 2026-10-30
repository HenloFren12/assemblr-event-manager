// src/components/whatif/WhatIfPanel.tsx
import { useState } from 'react';
import type { Disruption } from '../../../shared/schemas';
import { useReplan } from '../../hooks/useReplan';
import { useEventStore } from '../../store/eventStore';
import { usePlanStore } from '../../store/planStore';
import DiffView from './DiffView';

export default function WhatIfPanel() {
  const profile = useEventStore(s => s.profile);
  const tasks = usePlanStore(s => s.tasks);
  const lastPatch = usePlanStore(s => s.lastPatch);
  const history = usePlanStore(s => s.history);
  const undo = usePlanStore(s => s.undo);

  const { run: replanNow, busy, error } = useReplan();
  const [dropped, setDropped] = useState<string[]>([]);
  const [cut, setCut] = useState(10000);
  const [newDate, setNewDate] = useState('');
  const [note, setNote] = useState('');

  if (!profile || tasks.length === 0) {
    return <p>Create a plan first, then come back to test what-if scenarios.</p>;
  }
  const activeVolunteers = profile.volunteers.filter(v => v.active);

  async function run(disruption: Disruption) {
    const ok = await replanNow(disruption);
    if (ok) {
      setDropped([]);
      setNote('');
    }
  }

  function toggleDropped(id: string) {
    setDropped(d => (d.includes(id) ? d.filter(x => x !== id) : [...d, id]));
  }

  return (
    <div className="whatif">
      <h2>What if…?</h2>

      <fieldset disabled={busy}>
        <legend>Volunteers unavailable</legend>
        {activeVolunteers.map(v => (
          <label key={v.id} className="check">
            <input type="checkbox" checked={dropped.includes(v.id)} onChange={() => toggleDropped(v.id)} />
            {v.name}
          </label>
        ))}
        <button type="button" disabled={dropped.length === 0}
          onClick={() => run({ kind: 'volunteer_dropout', volunteerIds: dropped })}>
          Mark unavailable and re-plan
        </button>
      </fieldset>

      <fieldset disabled={busy}>
        <legend>Budget cut</legend>
        <label htmlFor="cut">Amount (₹)</label>
        <input id="cut" type="number" min={1} step={500} value={cut}
          onChange={e => setCut(Number(e.target.value))} />
        <button type="button" disabled={!(cut > 0)} onClick={() => run({ kind: 'budget_cut', amount: cut })}>
          Cut budget and re-plan
        </button>
      </fieldset>

      <fieldset disabled={busy}>
        <legend>Weather or date</legend>
        <button type="button" onClick={() => run({ kind: 'weather', note: 'Heavy rain forecast on event day' })}>
          Rain forecast
        </button>
        <label htmlFor="newDate">New event date</label>
        <input id="newDate" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
        <button type="button" disabled={!newDate} onClick={() => run({ kind: 'date_shift', newDate })}>
          Move date and re-plan
        </button>
      </fieldset>

      <fieldset disabled={busy}>
        <legend>Something else</legend>
        <label htmlFor="note">Describe what changed</label>
        <textarea id="note" maxLength={300} value={note} onChange={e => setNote(e.target.value)} />
        <button type="button" disabled={note.trim().length === 0}
          onClick={() => run({ kind: 'custom', note: note.trim() })}>
          Re-plan
        </button>
      </fieldset>

      <p role="status" aria-live="polite">{busy ? 'Adapting your plan…' : ''}</p>
      {error && <p role="alert" className="error">{error}</p>}

      {lastPatch && (
        <>
          <DiffView patch={lastPatch} before={history[0]?.tasks ?? []} after={tasks} />
          <button type="button" onClick={undo} disabled={history.length === 0}>Undo this change</button>
        </>
      )}
    </div>
  );
}
