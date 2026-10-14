# DeadlineHub

REST API (JSON) для відстеження навчальних дедлайнів. Один студент, без авторизації, без UI.

Філософія: **менше коду — менше помилок** (для людей і для ШІ). Мінімум залежностей, мінімум абстракцій понад обов'язкові патерни.

## Можливості

- Створення задачі: назва, курс (необов'язково), термін здачі `dueAt`.
- Перегляд задачі за `id` і списку з фільтрами за статусом і курсом.
- Зміна статусу лише дозволеними переходами: `todo → in_progress → done`, `in_progress → todo`; `done` — кінцевий.
- Сортування за `dueAt`, позначка `overdue`.
- Історія змін статусу.
- _(Наступні завдання)_ нагадування про наближення дедлайну.

## Стек

| Що      | Чим                                             |
| ------- | ----------------------------------------------- |
| Runtime | Bun ≥ 1.3 (ESM)                                 |
| HTTP    | Fastify 5                                       |
| БД      | SQLite через вбудований `bun:sqlite`            |
| Тести   | `bun:test` + `app.inject()` (без запуску порту) |
| Якість  | Prettier, ESLint, dependency-cruiser            |

## Швидкий старт

```bash
bun install        # також вмикає .githooks (core.hooksPath)
make run           # http://localhost:3000
```

Потрібні Bun ≥ 1.3 і GNU Make. У Windows `make` за замовчуванням немає: `winget install ezwinports.make` (хуки працюють через Git Bash).

Змінні середовища: `PORT` (за замовчуванням `3000`), `DB_PATH` (за замовчуванням `./data/deadlinehub.db`), `GIT_SHA` (версія для `GET /version`; за замовчуванням — `git rev-parse --short HEAD`).

```bash
curl -X POST localhost:3000/tasks -H 'Content-Type: application/json' \
  -d '{"title":"Лабораторна 3","courseId":1,"dueAt":"2026-12-01T21:00:00Z"}'
curl -X PATCH localhost:3000/tasks/1/status -H 'Content-Type: application/json' \
  -d '{"status":"in_progress"}'
curl 'localhost:3000/tasks?status=in_progress&sort=dueAt'
curl localhost:3000/tasks/1/history
curl localhost:3000/version   # {"version":"<sha>"}
```

## Команди

| Команда           | Що робить                                     |
| ----------------- | --------------------------------------------- |
| `make run`        | запуск сервера                                |
| `make test`       | усі тести                                     |
| `make ac ID=AC-3` | тести одного критерію прийняття               |
| `make check`      | швидкі перевірки (формат, лінт, межі модулів) |
| `make ci`         | повний набір перевірок, як у CI               |

Повний перелік перевірок — [standards/checklist.md](standards/checklist.md).

## Структура

```
ai/sessions/          журнали сесій з ШІ
ai/prompts-log.md     журнал промптів
server/domain/        Task, стани (State), валідація, доменні помилки
server/services/      TaskService, команди (Command), стратегії (Strategy), події (Observer)
server/repositories/  SQLite-реалізації портів сховища (Repository)
server/routes/        HTTP-маршрути
server/db/            підключення, schema.sql, seed
server/main.js        composition root
standards/adr/        архітектурні рішення
standards/            spec.md, definition-of-done.md, checklist.md
tests/                unit- і API-тести
.githooks/            pre-commit, pre-push
```

## Документи

- [Специфікація](standards/spec.md) — модулі, дані, сценарії, критерії прийняття.
- [Definition of Done](standards/definition-of-done.md)
- [Чекліст перевірок](standards/checklist.md)
- [Архітектурні рішення (ADR)](standards/adr/) — вибір runtime, фреймворку, БД, інструментів якості й валідації.
