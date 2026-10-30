// src/routes/board.tsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { computeSchedule, getBlockedIds, todayIST } from '../../shared/dependencyEngine';
import { readinessBreakdown } from '../../shared/readiness';
import type { TaskStatus } from '../../shared/schemas';
import TaskCard from '../components/board/TaskCard';
import ReadinessPanel from '../components/shared/ReadinessPanel';
import { useEventStore } from '../store/eventStore';
import { usePlanStore } from '../store/planStore';

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To do' },
  { status: 'doing', title: 'Doing' },
  { status: 'done', title: 'Done' },
];

export default function Board() {
  const profile = useEventStore(s => s.profile);
  const tasks = usePlanStore(s => s.tasks);
  const eventDate = usePlanStore(s => s.eventDate);
  const assumptions = usePlanStore(s => s.assumptions);
  const setStatus = usePlanStore(s => s.setStatus);

  const derived = useMemo(() => {
    if (!eventDate || tasks.length === 0) return null;
    const schedule = computeSchedule(tasks, eventDate, todayIST());
    const blocked = getBlockedIds(tasks);
    const titleById = new Map(tasks.map(t => [t.id, t.title]));
    const statusById = new Map(tasks.map(t => [t.id, t.status]));
    const activeIds = new Set((profile?.volunteers ?? []).filter(v => v.active).map(v => v.id));
    const readiness = readinessBreakdown(tasks, schedule, profile?.budgetCash ?? 0, activeIds);
    return { schedule, blocked, titleById, statusById, readiness };
  }, [tasks, eventDate, profile]);

  if (!profile || !derived) {
    return <p>No plan yet. <Link to="/setup">Create one</Link>.</p>;
  }
  const nameById = new Map(profile.volunteers.map(v => [v.id, v.name]));

  return (
    <>
      <h1>{profile.type} board</h1>
      <ReadinessPanel breakdown={derived.readiness} />
      <details>
        <summary>Assumptions the AI made</summary>
        <ul>{assumptions.map(a => <li key={a}>{a}</li>)}</ul>
      </details>
      <div className="columns">
        {COLUMNS.map(col => (
          <section key={col.status} aria-label={col.title}>
            <h2>{col.title}</h2>
            {tasks.filter(t => t.status === col.status).map(t => (
              <TaskCard
                key={t.id}
                task={t}
                ownerName={t.ownerId ? nameById.get(t.ownerId) ?? null : null}
                blockedBy={derived.blocked.has(t.id)
                  ? t.dependsOn.filter(d => derived.statusById.get(d) !== 'done').map(d => derived.titleById.get(d) ?? d)
                  : []}
                atRisk={derived.schedule[t.id]?.atRisk ?? false}
                onStatusChange={setStatus}
              />
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
