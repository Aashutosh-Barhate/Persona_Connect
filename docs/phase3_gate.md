# Phase 3 Gate — Schema + Loader (Alembic)

**Date:** 2026-10-25
**Status:** ✅ VERIFIED

## What was done

- Reproduced the reported failure: `alembic upgrade head` → `sqlite3.OperationalError: unable to open database file`.
- **Root cause:** `backend/app/alembic/env.py` computed `PROJECT_ROOT` by walking only **two** levels up
  (`backend/app/alembic/env.py` → `<root>/backend`), not three. `get_url()` then built the URL
  `sqlite:///<root>/backend/backend/app.db`, whose `backend/backend/` directory does not exist — so SQLite
  refused to open the file. (The earlier "Python 3.15" hypothesis was a red herring; the repro also failed
  on the project venv's Python 3.12.)
- **Fix:** `PROJECT_ROOT` in `env.py` now walks three levels up to the true project root.
  DB path resolves to `<root>/backend/app.db`, matching `backend/database.py`.
- Also aligned `backend/database.py::init_db()` to import `from backend.models import Base`
  (the old `from models import Base` only worked if `backend/` itself happened to be on `sys.path`).

## Verification evidence

| Check | Result |
|---|---|
| `alembic upgrade head` | ✅ `0001_initial` applied |
| `alembic current` | ✅ `0001_initial (head)` |
| Tables created | ✅ `questionnaires`, `questions`, `assessments`, `user_responses`, `personality_profiles`, `biography_profiles`, `recommendations`, `recommendation_items`, `consent` (+ `alembic_version`) |
| Downgrade → base → re-upgrade round trip | ✅ clean |
| `alembic check` (migration vs. ORM metadata drift) | ✅ "No new upgrade operations detected." |

## Notes

- Use the project venv (Python 3.12) — system Python is 3.15: `cd <root> && .venv/bin/python -m alembic upgrade head`
- DB file lives at `backend/app.db`; override with `DATABASE_URL` env var.
