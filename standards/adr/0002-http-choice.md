# Fastify 5 як HTTP-фреймворк

* **Date:** 2026-10-14

## Context and Problem Statement

API з spec §3 має шість маршрутів, єдиний формат помилок (`{ "error": { "code", "message" } }`) і валідацію вхідних даних. API-тести за spec §2 (модуль `tests`) мають виконуватися через `app.inject()` без запуску порту, щоб бути швидкими й детермінованими. Який HTTP-фреймворк дає це з найменшою кількістю ручного коду?

## Considered Options

* Fastify 5
* Express

## Decision Outcome

Обраний варіант: «Fastify 5», бо він має вбудовану валідацію за JSON Schema (див. ADR 0009) і `app.inject()` для API-тестів без запуску порту (spec §2, `tests`; перевірки C4, C5). До того ж Fastify нативно підтримує ESM і `async/await`, а централізований `setErrorHandler` прибирає ручний boilerplate для мапінгу помилок у статуси (spec §3).

### Consequences

* Добре, бо API-тести всіх AC зі spec §6 запускаються через `app.inject()` у `bun:test` без мережі й без конфлікту портів (C4, C5).
* Добре, бо smoke-перевірка `GET /health` → `200` (C7) працює на тому самому застосунку, що й тести.
* Добре, бо async-обробники й єдиний обробник помилок спрощують мапінг `VALIDATION_ERROR` / `INVALID_TRANSITION` / `NOT_FOUND` (spec §3).
* Добре, бо межі модулів зберігаються: `fastify` імпортують лише `routes` і `main.js`, а `domain` і `services` про нього не знають (spec §2, C3).
* Погано, бо Fastify має менше готових прикладів і middleware, ніж Express, і власну модель плагінів, яку треба розуміти.
