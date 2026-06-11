"""Traceability Center API.

Exposes the genealogy framework over HTTP. Frontend uses these to render the
Traceability Center page, the always-on Genealogy Card, and the Lifecycle
Progress panel on every workbench. Traceability Center V2 endpoints
(``/events``, ``/approvals``, ``/impact``, ``/scorecard``, ``/summary``,
``/risk``, ``/related``) compose the per-module data into chain-wide views.
"""
from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.frameworks import genealogy as gen
from app.frameworks import lineage as lin
from app.frameworks import traceability_center as tc
from app.schemas.genealogy import (
    GenealogyChain,
    JourneyTimeline,
    NodeType,
    TraceabilityDashboard,
    TraceabilitySearchHit,
)
from app.schemas.lineage import MaterialLineage
from app.schemas.traceability_v2 import (
    ApprovalsResponse,
    ChainQualitySummary,
    ChainRiskPanel,
    ImpactAnalysis,
    QualityEventsResponse,
    QualityScorecard,
    RelatedRecords,
)


router = APIRouter()


@router.get("/traceability/search", response_model=List[TraceabilitySearchHit])
def search(
    q: str = Query(..., min_length=1),
    limit: int = 20,
    scope: Optional[str] = Query(
        None,
        description="Optional comma-separated node-type filter — raw-material,process-qualification,metal-batch,product-batch,certificate",
    ),
) -> List[TraceabilitySearchHit]:
    hits = gen.search(q, limit=limit)
    if scope:
        wanted = {s.strip() for s in scope.split(",") if s.strip()}
        if wanted:
            hits = [h for h in hits if h.nodeType.value in wanted]
    return hits


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


@router.get("/traceability/{node_type}/{node_key}/lineage", response_model=MaterialLineage)
def get_lineage(node_type: NodeType, node_key: str) -> MaterialLineage:
    lineage = lin.build_lineage(node_type, node_key)
    if lineage is None:
        raise HTTPException(status_code=404, detail=f"No {node_type} found for key {node_key}")
    return lineage


# ---------------------------------------------------------------------------
# Traceability Center V2
# ---------------------------------------------------------------------------
@router.get("/traceability/{node_type}/{node_key}/events", response_model=QualityEventsResponse)
def get_events(node_type: NodeType, node_key: str) -> QualityEventsResponse:
    out = tc.chain_events(node_type, node_key)
    if out is None:
        raise HTTPException(status_code=404, detail=f"No {node_type} found for key {node_key}")
    return out


@router.get("/traceability/{node_type}/{node_key}/approvals", response_model=ApprovalsResponse)
def get_approvals(node_type: NodeType, node_key: str) -> ApprovalsResponse:
    out = tc.chain_approvals(node_type, node_key)
    if out is None:
        raise HTTPException(status_code=404, detail=f"No {node_type} found for key {node_key}")
    return out


@router.get("/traceability/{node_type}/{node_key}/summary", response_model=ChainQualitySummary)
def get_summary(node_type: NodeType, node_key: str) -> ChainQualitySummary:
    out = tc.chain_summary(node_type, node_key)
    if out is None:
        raise HTTPException(status_code=404, detail=f"No {node_type} found for key {node_key}")
    return out


@router.get("/traceability/{node_type}/{node_key}/scorecard", response_model=QualityScorecard)
def get_scorecard(node_type: NodeType, node_key: str) -> QualityScorecard:
    out = tc.chain_scorecard(node_type, node_key)
    if out is None:
        raise HTTPException(status_code=404, detail=f"No {node_type} found for key {node_key}")
    return out


@router.get("/traceability/{node_type}/{node_key}/impact", response_model=ImpactAnalysis)
def get_impact(node_type: NodeType, node_key: str) -> ImpactAnalysis:
    out = tc.chain_impact(node_type, node_key)
    if out is None:
        raise HTTPException(status_code=404, detail=f"No {node_type} found for key {node_key}")
    return out


@router.get("/traceability/{node_type}/{node_key}/risk", response_model=ChainRiskPanel)
def get_risk(node_type: NodeType, node_key: str) -> ChainRiskPanel:
    out = tc.chain_risk(node_type, node_key)
    if out is None:
        raise HTTPException(status_code=404, detail=f"No {node_type} found for key {node_key}")
    return out


@router.get("/traceability/{node_type}/{node_key}/related", response_model=RelatedRecords)
def get_related(node_type: NodeType, node_key: str) -> RelatedRecords:
    out = tc.related_records(node_type, node_key)
    if out is None:
        raise HTTPException(status_code=404, detail=f"No {node_type} found for key {node_key}")
    return out
