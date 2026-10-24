"""Persona-Connect backend entry point (Phase 4).

Run from the project root:
    .venv/bin/uvicorn backend.app.main:app --reload
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.app.api.routes import router
    from backend.app.services.seed_service import ensure_seeded
    from backend.database import SessionLocal
except ImportError:
    from app.api.routes import router
    from app.services.seed_service import ensure_seeded
    from database import SessionLocal

app = FastAPI(
    title="Persona-Connect API",
    version="0.4.0",
    description=(
        "Phase 4 backend: questionnaire serving, assessment scoring, "
        "profile retrieval and v0 biography matching."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:4173",   # Vite preview
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def on_startup() -> None:
    """Idempotent: alembic owns the schema; we only guarantee the seed data."""
    db = SessionLocal()
    try:
        ensure_seeded(db)
    finally:
        db.close()


@app.get("/healthz")
def healthz():
    return {"status": "ok", "version": app.version}
