"""Quality360 API entry point.

Phase 1 uses an in-memory store. The router surface, response models and
framework hooks are stable across the eventual swap to SQLAlchemy + Postgres.
"""
from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    receipts,
    samples,
    results,
    approvals,
    master_data,
    insights,
    audit,
    notifications,
    dashboard,
)
from app.seed import seed


def create_app() -> FastAPI:
    app = FastAPI(
        title="Quality360 API",
        version="0.1.0",
        description="Manufacturing Quality Intelligence Platform — Phase 1.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )

    seed()

    app.include_router(master_data.router, prefix="/api/v1", tags=["master-data"])
    app.include_router(receipts.router, prefix="/api/v1", tags=["receipts"])
    app.include_router(samples.router, prefix="/api/v1", tags=["samples"])
    app.include_router(results.router, prefix="/api/v1", tags=["results"])
    app.include_router(approvals.router, prefix="/api/v1", tags=["approvals"])
    app.include_router(insights.router, prefix="/api/v1", tags=["insights"])
    app.include_router(audit.router, prefix="/api/v1", tags=["audit"])
    app.include_router(notifications.router, prefix="/api/v1", tags=["notifications"])
    app.include_router(dashboard.router, prefix="/api/v1", tags=["dashboard"])

    @app.get("/api/v1/health")
    def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
