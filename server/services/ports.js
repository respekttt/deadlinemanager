// Порти сховища (Repository, spec §2). Реалізації: repositories/memory (прототип, unit-тести) і SQLite.
// Записи — пласкі об'єкти з полями Task; усі часи — ISO 8601 UTC.

/**
 * @typedef {object} TaskRepository
 * @property {(task: object) => object} save        INSERT (без id) або UPDATE; повертає запис з id
 * @property {(id: number) => object | null} findById з courseName
 * @property {() => object[]} list                   з courseName, одним запитом (без N+1)
 */

/**
 * @typedef {object} CourseRepository
 * @property {(id: number) => object | null} findById
 */

/**
 * @typedef {object} HistoryRepository
 * @property {(entry: { taskId, fromStatus, toStatus, changedBy, changedAt }) => void} append
 * @property {(taskId: number) => object[]} listByTaskId за changedAt, id
 */

/**
 * @typedef {object} IdempotencyRepository
 * @property {(key: string) => { key, requestHash, taskId } | null} find
 * @property {(entry: { key, requestHash, taskId, createdAt }) => void} save
 */

/**
 * @typedef {object} Repos
 * @property {TaskRepository} tasks
 * @property {CourseRepository} courses
 * @property {HistoryRepository} history
 * @property {IdempotencyRepository} idempotency
 * @property {<T>(fn: () => T) => T} transaction  відкат усіх записів fn на виняток
 */

export {};
