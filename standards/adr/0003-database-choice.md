# Вбудований bun:sqlite як драйвер БД без ORM

* **Date:** 2026-10-14

## Context and Problem Statement

Дані DeadlineHub — чотири таблиці (`courses`, `tasks`, `task_history`, `reminders`, spec §4), один користувач, локальний файл БД (`DB_PATH`). Сценарії S1 і S2 (spec §5) потребують транзакцій: зміна статусу й запис історії мають відкочуватися разом (AC-12). Чим працювати з SQLite, щоб не тягнути зайві залежності й не збільшувати поверхню для supply chain attacks?

## Considered Options

* Вбудований `bun:sqlite`
* ORM (Sequelize)
* Сторонній драйвер (`better-sqlite3`)

## Decision Outcome

Обраний варіант: «Вбудований `bun:sqlite`», бо він не додає зовнішніх залежностей (менший ризик supply chain attacks, перевірка C9), не потребує нативної збірки й дає максимальну швидкість «з коробки». ORM для чотирьох таблиць — зайвий шар абстракції, а `better-sqlite3` дублює те, що вже є в runtime (ADR 0001).

Доступ до БД — лише з `server/repositories` і `server/db` (межі з spec §2): `bun:sqlite` імпортують тільки вони, а composition root `server/main.js` створює підключення через `server/db` і передає його в репозиторії. `domain`, `services` і `routes` не можуть імпортувати `bun:sqlite`, `repositories` чи `db`, що перевіряє C3 (ADR 0006).

### Consequences

* Добре, бо нуль додаткових пакетів для роботи з БД: менше вразливостей для `bun audit` (C9) і простіша збірка з нуля (C8).
* Добре, бо транзакції `transaction(fn)` у репозиторіях реалізуються прямо через `db.transaction()` і закривають AC-12.
* Добре, бо схема задається явним `schema.sql` з обмеженнями (`PRAGMA foreign_keys = ON`, `CHECK` для `status`, spec §4), який C8 застосовує до порожньої БД.
* Добре, бо `bun:sqlite` ізольовано в `repositories` і `db`, тож unit-тести `services` працюють з in-memory репозиторіями без БД (spec §2, `tests`).
* Погано, бо SQL і мапінг рядків у об'єкти (`due_at` → `dueAt`) пишемо вручну в репозиторіях.
* Погано, бо немає вбудованого механізму міграцій — зміни схеми керуються вручну через `schema.sql` і супроводжуються оновленням spec (C10).
