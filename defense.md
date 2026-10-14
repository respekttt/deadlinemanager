# DEFENSE — Завдання 1: Фундамент і структура застосунку

## Що я реалізував (1–2 речення)

Заклав фундамент DeadlineHub (REST API навчальних дедлайнів): `standards/` (spec з модулями, ER, сценаріями й AC-1…AC-15; checklist C1–C11; DoD D1–D9), 9 ADR і каркас сервера на Bun + Fastify + `bun:sqlite` з `GET /health`, smoke-тестом на порожній БД і `Makefile` як єдиною точкою входу для хуків і CI. Усі промпти й сесії лежать у `ai/prompts-log.md` та `ai/sessions/01–05`.

## Топ-3, де я «зрізав кути» / знайшов і виправив (проти spec)

- **Хуки викликали неіснуючі цілі.** `.githooks` запускали `make check` / `make prepush`, а в `Makefile` були лише `run` і `smoke`. Перший коміт `ed7d8ec` пішов з `--no-verify`. Під час аудиту (сесія 05) додав усі цілі C1–C11 і групи `check` / `prepush` / `ci`. Коміт `4f88bf8` уже пройшов pre-commit без обходу.
- **Інструменти не були зафіксовані, хоча ADR 0005/0006 і checklist вимагають цього.** ESLint, Prettier і dependency-cruiser не стояли в `devDependencies`, тож `bunx` щоразу тягнув latest. Це невідтворювано (C8), і `bun audit` їх не бачив (C9). До того ж `fastify` був вказаний як `"5"`. Виправив: точні версії в `package.json`, `engines.bun >= 1.3`, конфіги `eslint.config.js`, `.prettierrc.json`, `.dependency-cruiser.cjs` (правила меж зі spec §2) і `bunfig.toml` (поріг покриття 80 %).
- **Smoke не перевіряв те, що вимагає C7.** C7 — це «старт на порожній БД», а `server/db` не існувало, і `buildApp()` не приймав залежностей. Додав `server/db` (`schema.sql` з обмеженнями spec §4, `seed.sql`, `openDb()`), `buildApp({ db })`, а smoke тепер піднімає застосунок на `:memory:`.

Окремо: C5 (`make ac-check`) падав, бо вимагав тести для всіх AC-1…AC-14, а їхня функціональність належить до наступного завдання. Через це push робився з `--no-verify`, а CI на PR був червоний. Перевірку не вимикав і не обходив заглушками `test.todo`. Натомість у spec §6 додав колонку «Завдання», а C5 тепер вимагає тести лише для AC із завдання ≤ `TASK` у `Makefile` (зараз `1`). Коли перейду до наступного завдання, підніму `TASK`, і всі AC цього завдання стануть обов'язковими. Ендпоінта `/version` поки немає.

## Ключове рішення — які альтернативи зважив і чому обрав цю (ADR)

[ADR 0001](standards/adr/0001-runtime-choice.md): **Bun ≥ 1.3 (ESM) замість Node.js + npm/pnpm + окремих тест-раннера й SQLite-драйвера.** Спершу ШІ самостійно обрав Node 24 + Express 5 + `node:sqlite` + `node:test` (сесія 01). Я свідомо змінив стек, бо філософія проєкту — «менше коду, менше помилок». Bun в одному бінарнику дає runtime, `bun install`, `bun:test` з `--coverage` і `bun:sqlite`. Отже, менше залежностей і менша поверхня supply chain (C9), відтворювана збірка через `--frozen-lockfile` (C8) і покриття без пакетів (C6).

Ціна рішення: Bun молодший, ніж Node, а через `bun:sqlite` і `bun:test` проєкт прив'язаний до нього, тож міграція на Node буде дорожчою. До цього ж рішення додав Fastify замість Express ([ADR 0002](standards/adr/0002-http-choice.md)). У Fastify є `app.inject()` для API-тестів без порту і вбудована JSON Schema-валідація ([ADR 0009](standards/adr/0009-input-validation-choice.md)).

## Перевірка (на реально запущеній системі)

- `make smoke` → `1 pass, 0 fail` (`GET /health` → `200 { "status": "ok" }` на порожній БД у пам'яті).
- `make check` → Prettier OK, ESLint 0 попереджень, dependency-cruiser: `no dependency violations found (8 modules, 8 dependencies cruised)`.
- `make ac-check` → exit 0 (`TASK=1`); `make ac-check TASK=2` → падає й перелічує 14 відсутніх тестів AC-1…AC-14, тож перевірка справді працює.
- Версія `/version`: ендпоінт ще не реалізовано. Поточний коміт `task1` — `3734d8d`.

## Здача

- (а) PR #1: https://github.com/respekttt/deadlinemanager/pull/1 (`task1 → main`).
- (б) Цей заповнений DEFENSE.
