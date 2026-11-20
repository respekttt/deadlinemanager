// Strategy: { apply(tasks, { now, value }) → tasks }. Реєстр «параметр запиту → стратегія» збирає main.js;
// стратегії застосовуються в порядку реєстру, якщо параметр присутній у запиті.
export const StatusFilter = {
  apply: (tasks, { value }) => tasks.filter((t) => t.status === value),
};

export const CourseFilter = {
  apply: (tasks, { value }) => tasks.filter((t) => t.courseId === value),
};

export const OverdueOnly = {
  apply: (tasks, { now, value }) => (value ? tasks.filter((t) => t.isOverdue(now)) : tasks),
};

export const ByDueDate = {
  apply: (tasks) => [...tasks].sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id - b.id),
};

export const defaultStrategies = () => ({
  status: StatusFilter,
  courseId: CourseFilter,
  overdue: OverdueOnly,
  sort: ByDueDate,
});
