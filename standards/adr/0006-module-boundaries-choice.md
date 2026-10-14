# dependency-cruiser для автоматичної перевірки меж модулів

- **Date:** 2026-10-14

## Context and Problem Statement

Spec §2 визначає шари (`domain`, `services`, `routes`, `repositories`, `db`) і заборонені залежності між ними: `domain` → будь-що з `server/`, `fastify`, `bun:sqlite`; `services` → `repositories`, `db`, `routes`, `fastify`, `bun:sqlite`; `routes` → `repositories`, `db` і будь-що з `domain`, крім `domain/errors.js` і `domain/schemas.js`. Від цього залежать патерни (Repository, Command, Strategy) і можливість тестувати `domain` і `services` без БД та HTTP. Як гарантувати, що межі не порушуються, коли код пишуть і люди, і ШІ?

## Considered Options

- dependency-cruiser з правилами з spec §2
- Дисципліна та code review (без автоматизації)

## Decision Outcome

Обраний варіант: «dependency-cruiser з правилами з spec §2», бо він автоматично перевіряє заборонені залежності між шарами й не покладається на дисципліну людини чи ШІ. Перевірка C3 (`make boundaries`) виконується в pre-commit і CI та закриває AC-15 і D2. dependency-cruiser зафіксовано в `devDependencies` і запускається через `bunx`, як ESLint і Prettier (ADR 0005).

### Consequences

- Добре, бо порушення межі (наприклад, імпорт `bun:sqlite` у `services`) ловиться до коміту, а не на рев'ю.
- Добре, бо правила в конфігу dependency-cruiser — машинно перевірювана копія таблиці зі spec §2.
- Добре, бо ШІ отримує чітку автоматичну відповідь на порушення архітектури, а не покладається на інструкції в промпті.
- Погано, бо це ще один інструмент і конфіг, які треба тримати синхронними зі spec §2 при зміні модулів.
- Погано, бо правило «`routes` бере з `domain` лише помилки й схеми» виражається шляхами файлів, тож класи помилок і JSON Schema мають лежати в окремих модулях `domain/errors.js` і `domain/schemas.js`.
