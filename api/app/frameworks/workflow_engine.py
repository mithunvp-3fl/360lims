"""Generic workflow engine.

A module registers a `WorkflowDefinition` (ordered stage keys + labels). The engine
exposes `create`, `advance(to_key)`, and `complete_through(key)`. Incoming Material
Inspection is the first consumer; future modules (Heat Chemistry, Casting Quality,
Mechanical Testing, MTC & Dispatch) plug in their own definitions without changing
this file.
"""
from __future__ import annotations
import uuid
from dataclasses import dataclass, field
from typing import Dict, List

from app.schemas.workflow import StageStatus, Workflow, WorkflowStage
from app.schemas.common import now_iso


@dataclass(frozen=True)
class StageDef:
    key: str
    label: str


@dataclass(frozen=True)
class WorkflowDefinition:
    module_key: str
    entity_type: str
    stages: List[StageDef]


REGISTRY: Dict[str, WorkflowDefinition] = {}


def register(definition: WorkflowDefinition) -> None:
    REGISTRY[definition.module_key] = definition


def get_definition(module_key: str) -> WorkflowDefinition:
    return REGISTRY[module_key]


def create_workflow(module_key: str, entity_id: str) -> Workflow:
    definition = REGISTRY[module_key]
    stages = [
        WorkflowStage(key=s.key, label=s.label, order=i, status=StageStatus.PENDING)
        for i, s in enumerate(definition.stages)
    ]
    if stages:
        stages[0].status = StageStatus.IN_PROGRESS
    return Workflow(
        id=str(uuid.uuid4()),
        moduleKey=definition.module_key,
        entityType=definition.entity_type,
        entityId=entity_id,
        stages=stages,
    )


def complete_through(workflow: Workflow, stage_key: str, actor: str) -> Workflow:
    """Mark every stage up to and including `stage_key` as completed,
    and move the next stage (if any) to In Progress."""
    found = False
    for stage in workflow.stages:
        if stage.status != StageStatus.COMPLETED:
            stage.status = StageStatus.COMPLETED
            stage.completedAt = now_iso()
            stage.completedBy = actor
        if stage.key == stage_key:
            found = True
            break
    if not found:
        return workflow
    # advance the next pending stage
    for stage in workflow.stages:
        if stage.status == StageStatus.PENDING:
            stage.status = StageStatus.IN_PROGRESS
            break
    return workflow


# --- Incoming Material Inspection definition ---
INCOMING_INSPECTION = WorkflowDefinition(
    module_key="incoming-inspection",
    entity_type="receipt",
    stages=[
        StageDef("receipt", "Receipt"),
        StageDef("sample", "Sample"),
        StageDef("testing", "Testing"),
        StageDef("validation", "Validation"),
        StageDef("review", "Review"),
        StageDef("release", "Release"),
    ],
)
register(INCOMING_INSPECTION)
