// src/routes/budget.tsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { summarizeBudget } from '../../shared/budget';
import DiffView from '../components/whatif/DiffView';
import { useReplan } from '../hooks/useReplan';
import { useEventStore } from '../store/eventStore';
import { usePlanStore } from '../store/planStore';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function Budget() {
  const profile = useEventStore(s => s.profile);
  const tasks = usePlanStore(s => s.tasks);
  const lastPatch = usePlanStore(s => s.lastPatch);
  const history = usePlanStore(s => s.history);
  const { run, busy, error } = useReplan();

  const summary = useMemo(() => summarizeBudget(tasks, profile?.budgetCash ?? 0), [tasks, profile]);
  if (!profile || tasks.length === 0) return <p>No plan yet. <Link to="/setup">Create one</Link>.</p>;

  const rows = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <h1>Budget</h1>
      <p>Cash budget {inr(profile.budgetCash)}. Estimated spend {inr(summary.totalEstimated)}. All figures are rough estimates, verify locally.</p>
      {summary.overBy > 0
        ? <p role="status">Over budget by {inr(summary.overBy)}. Up to {inr(summary.inKindSavingsPotential)} could be saved with in-kind options.</p>
        : <p role="status">Within budget. {inr(summary.remaining)} left.</p>}
      <table>
        <caption>Estimated cost by category</caption>
        <thead><tr><th scope="col">Category</th><th scope="col">Estimate</th></tr></thead>
        <tbody>{rows.map(([cat, amount]) => <tr key={cat}><th scope="row">{cat}</th><td>{inr(amount)}</td></tr>)}</tbody>
      </table>
      {summary.overBy > 0 && (
        <button type="button" disabled={busy} onClick={() => run({
          kind: 'custom',
          note: `We are over budget by about ${Math.round(summary.overBy)} rupees. Bring the plan within budget by switching to in-kind options and trimming according to my ranked priorities. Do not cut must-have safety tasks.`,
        })}>
          {busy ? 'Finding trade-offs…' : 'Suggest trade-offs that fit my priorities'}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {lastPatch && <DiffView patch={lastPatch} before={history[0]?.tasks ?? []} after={tasks} />}
    </>
  );
}
