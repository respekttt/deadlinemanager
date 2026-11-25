import { getContext } from '../context.js';

// Підписник на task.created і task.status_changed: пише історію з ініціатором із контексту (ADR 0010).
export function recordHistory(event, { repos, now }) {
  repos.history.append({
    taskId: event.task.id,
    fromStatus: event.from ?? null,
    toStatus: event.task.status,
    changedBy: getContext()?.userId ?? 'anonymous',
    changedAt: now.toISOString(),
  });
}

export function registerHistoryRecorder(events) {
  events.subscribe('task.created', recordHistory);
  events.subscribe('task.status_changed', recordHistory);
}
