// src/components/board/TaskCard.tsx
import { memo } from 'react';
import type { Task, TaskStatus } from '../../../shared/schemas';

interface TaskCardProps {
  task: Task;
  ownerName: string | null;
  blockedBy: string[]; // titles of unfinished prerequisites; empty when not blocked
  atRisk: boolean;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

function TaskCard({ task, ownerName, blockedBy, atRisk, onStatusChange }: TaskCardProps) {
  const blocked = blockedBy.length > 0;
  const selectId = `status-${task.id}`;

  return (
    <article className={`task task--${task.priority}`} data-testid={`task-${task.id}`} aria-labelledby={`title-${task.id}`}>
      <h3 id={`title-${task.id}`}>{task.title}</h3>
      <p className="task__meta">
        <span>{ownerName ?? 'Unassigned'}</span>
        <span>Due {task.dueDate}</span>
        <span>{task.priority}</span>
      </p>
      {blocked && (
        <p className="task__flag" data-testid={`blocked-${task.id}`}>
          <span aria-hidden="true">🔒 </span>Blocked: waiting on {blockedBy.join(', ')}
        </p>
      )}
      {atRisk && !blocked && <p className="task__flag task__flag--risk">At risk: may miss its deadline</p>}
      {task.inKindOption && <p className="task__inkind">In-kind idea: {task.inKindOption}</p>}
      {task.reason && <p className="task__reason">{task.reason}</p>}
      <label htmlFor={selectId}>Status</label>
      <select
        id={selectId}
        value={task.status}
        onChange={e => onStatusChange(task.id, e.target.value as TaskStatus)}
      >
        <option value="todo">To do</option>
        <option value="doing" disabled={blocked}>Doing</option>
        <option value="done" disabled={blocked}>Done</option>
      </select>
    </article>
  );
}

export default memo(TaskCard);
