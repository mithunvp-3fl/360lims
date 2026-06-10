"""Traceability Center API.

Exposes the genealogy framework over HTTP. Frontend uses these to render the
Traceability Center page, the always-on Genealogy Card, and the Quality
Journey Panel on every workbench.
"""
from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.frameworks import genealogy as gen
from app.schemas.genealogy import (
    GenealogyChain,
    JourneyTimeline,
    NodeType,
    TraceabilityDashboard,
    TraceabilitySearchHit,
)


router = APIRouter()


@router.get("/traceability/search", response_model=List[TraceabilitySearchHit])
def search(q: str = Query(..., min_length=1), limit: int = 20) -> List[TraceabilitySearchHit]:
    return gen.search(q, limit=limit)


@router.get("/traceability/dashboard", response_model=TraceabilityDashboard)
def dashboard() -> TraceabilityDashboard:
    return gen.dashboard()


@router.get("/traceability/{node_type}/{node_key}", response_model=GenealogyChain)
def get_chain(node_type: NodeType, node_key: str) -> GenealogyChain:
    chain = gen.build_chain(node_type, node_key)
    if chain is None:
        raise HTTPException(status_code=404, detail=f"No {node_type} found for key {node_key}")
    return chain


@router.get("/traceability/{node_type}/{node_key}/journey", response_model=JourneyTimeline)
def get_journey(node_type: NodeType, node_key: str) -> JourneyTimeline:
    journey = gen.build_journey(node_type, node_key)
    if journey is None:
        raise HTTPException(status_code=404, detail=f"No {node_type} found for key {node_key}")
    return journey
