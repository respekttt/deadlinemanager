# Чекліст перевірок

Кожна перевірка — ціль `Makefile`. Хуки вмикаються автоматично на `bun install` через скрипт `prepare` у `package.json`: `git config core.hooksPath .githooks || true` (`|| true` — щоб встановлення не падало поза git-репозиторієм). CI запускає `make ci`. Prettier, ESLint і dependency-cruiser зафіксовано в `devDependencies` (версії в `bun.lock`); `bunx` запускає локально встановлену версію, тож вони покриті C8 і C9.

| ID  | Перевірка                                                                                     | Команда           | pre-commit | pre-push |   CI   |
| --- | --------------------------------------------------------------------------------------------- | ----------------- | :--------: | :------: | :----: |
| C1  | Формат (Prettier через `bunx`)                                                                | `make fmt-check`  |     ✓      |          |   ✓    |
| C2  | Лінт (ESLint через `bunx`)                                                                    | `make lint`       |     ✓      |          |   ✓    |
| C3  | Аудит меж модулів (dependency-cruiser через `bunx`, правила з spec §2)                        | `make boundaries` |     ✓      |          |   ✓    |
| C4  | Unit- і API-тести                                                                             | `make test`       |            |    ✓     |   ✓    |
| C5  | Кожен AC зі spec має тест `AC-N:`                                                             | `make ac-check`   |            |    ✓     |   ✓    |
| C6  | Покриття рядків ≥ 80 % (`bun test --coverage`, поріг у `bunfig.toml`)                         | `make coverage`   |            |          |   ✓    |
| C7  | Smoke: сервер стартує на порожній БД, `GET /health` → 200                                     | `make smoke`      |            |    ✓     |   ✓    |
| C8  | Збірка: `bun install --frozen-lockfile` + застосування `schema.sql` до порожньої БД           | `make build`      |            |          |   ✓    |
| C9  | Аудит залежностей (`bun audit`, high і вище)                                                  | `make audit`      |            |          |   ✓    |
| C10 | Зміни в `server/routes` або `server/db/schema.sql` супроводжуються зміною `standards/spec.md` | `make spec-check` |            |          | ✓ (PR) |
| C11 | `ai/prompts-log.md` оновлено в PR                                                             | `make log-check`  |            |          | ✓ (PR) |

Групи: `make check` = C1–C3 (pre-commit), `make prepush` = C4, C5, C7 (pre-push), `make ci` = C1–C11.
