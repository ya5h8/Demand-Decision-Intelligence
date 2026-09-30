"""
backend/api/recommendations.py
------------------------------
API routes for Recommendation Lifecycle State Machine, RBAC Approval Limits,
The Learning Loop (Lead Time Reality Check), and Forecast Accountability Scorecard (Prompt 4.2).
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db.session import get_db, enforce_writable_db
from backend.core.deps import get_current_user, require_role, get_current_user_or_guest
from backend.models.user import User
from backend.models.recommendation import ActionRecommendation, RecommendationEvent
from backend.models.inventory import LeadTimeObservation, InventoryRecommendation
from backend.services.inventory_service import get_lead_time_stats, compute_safety_stock_kings, compute_safety_stock_classical
from backend.services.dataset_service import resolve_dataset
from backend.services.recommendation_lifecycle import (
    transition_recommendation_status,
    compute_forecast_accountability_scorecard,
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations & Learning Loop"])


class TransitionRequest(BaseModel):
    target_status: str
    note: Optional[str] = None
    snooze_days: Optional[int] = 7


@router.get("")
def list_recommendations(
    dataset_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """Lists all active actionable recommendations across products."""
    target_ds = resolve_dataset(db, current_user, dataset_id)
    eff_dataset_id = target_ds.id if target_ds else 1

    query = db.query(ActionRecommendation)
    if eff_dataset_id:
        query = query.filter(ActionRecommendation.dataset_id == eff_dataset_id)
    if status_filter:
        query = query.filter(ActionRecommendation.status == status_filter.upper())

    recs = query.order_by(ActionRecommendation.created_at.desc()).limit(100).all()

    # If table is currently empty, dynamically seed from inventory recommendations
    if not recs and eff_dataset_id:
        invs = db.query(InventoryRecommendation).filter(
            InventoryRecommendation.dataset_id == eff_dataset_id,
            InventoryRecommendation.current_stock < InventoryRecommendation.reorder_point
        ).limit(10).all()

        for inv in invs:
            value_impact = inv.recommended_order_qty * 45.0
            new_rec = ActionRecommendation(
                dataset_id=dataset_id,
                product_id=inv.product_id,
                city_name=inv.city_name,
                type="reorder",
                status="NEW",
                recommended_qty=inv.recommended_order_qty,
                rationale_json={
                    "current_stock": inv.current_stock,
                    "reorder_point": inv.reorder_point,
                    "safety_stock": inv.safety_stock,
                    "reason": "Current inventory has fallen below the calculated Reorder Point."
                },
                expected_value_impact=value_impact,
            )
            db.add(new_rec)
        db.commit()
        recs = query.order_by(ActionRecommendation.created_at.desc()).limit(100).all()

    results = []
    for r in recs:
        results.append({
            "id": r.id,
            "product_id": r.product_id,
            "product_name": r.product.product_name if r.product else r.product_id,
            "city_name": r.city_name,
            "type": r.type,
            "status": r.status,
            "recommended_qty": r.recommended_qty,
            "expected_value_impact": r.expected_value_impact,
            "rationale": r.rationale_json,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "actioned_at": r.actioned_at.isoformat() if r.actioned_at else None,
            "snoozed_until": r.snoozed_until.isoformat() if r.snoozed_until else None,
        })
    return {"recommendations": results}


@router.post("/{rec_id}/transition")
def update_recommendation_state(
    rec_id: int,
    payload: TransitionRequest,
    db: Session = Depends(get_db),
    _write_guard: None = Depends(enforce_writable_db),
    current_user: Optional[User] = Depends(require_role(["admin", "manager"])),
):
    """
    Executes valid state machine transition with append-only event logging
    and manager approval limit enforcement.
    """
    return transition_recommendation_status(
        recommendation_id=rec_id,
        target_status=payload.target_status,
        db=db,
        user=current_user,
        note=payload.note,
        snooze_days=payload.snooze_days or 7
    )


@router.get("/lead-time-reality-check")
def get_lead_time_reality_check(
    dataset_id: Optional[int] = None,
    product_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """
    THE LEARNING LOOP: Compares promised lead times vs actual observed receipt durations,
    illustrating the dynamic calibration of King's safety stock.
    """
    target_ds = resolve_dataset(db, current_user, dataset_id)
    eff_dataset_id = target_ds.id if target_ds else 1
    query = db.query(LeadTimeObservation).filter(LeadTimeObservation.dataset_id == eff_dataset_id)
    if product_id:
        query = query.filter(LeadTimeObservation.product_id == product_id)

    observations = query.order_by(LeadTimeObservation.ordered_at.desc()).limit(50).all()

    # If no observations yet, generate simulated learning comparisons for demonstrable UI
    if not observations:
        return {
            "summary": {
                "total_observations": 0,
                "status": "Awaiting initial goods receipt. Complete a Purchase Order to activate live learning."
            },
            "comparisons": [
                {
                    "product_id": "SKU-SAMPLE-1",
                    "product_name": "Premium Basmati Rice 5kg",
                    "supplier_name": "AgroCorp Wholesale",
                    "promised_days": 4,
                    "actual_mean_days": 6.8,
                    "sigma_L_days": 1.45,
                    "observations_count": 8,
                    "classical_safety_stock": 28.0,
                    "kings_calibrated_safety_stock": 42.0,
                    "delta_safety_stock": 14.0,
                    "risk_assessment": "Under-buffered: Supplier delivers 2.8 days slower than promised with high variance."
                }
            ]
        }

    # Group by product
    by_product: Dict[str, List[LeadTimeObservation]] = {}
    for obs in observations:
        by_product.setdefault(obs.product_id, []).append(obs)

    comparisons = []
    for pid, obs_list in by_product.items():
        actuals = [o.actual_days for o in obs_list]
        mean_actual = sum(actuals) / len(actuals)
        stats = get_lead_time_stats(
            db=db,
            dataset_id=dataset_id,
            product_id=pid,
            supplier_id=obs_list[0].supplier_id,
            default_lead_time=promised
        )
        mean_d = 15.0
        sigma_d = 4.5
        old_ss = compute_safety_stock_classical(std_demand=sigma_d, lead_time_days=promised, z_score=1.645)
        new_ss = compute_safety_stock_kings(
            avg_demand=mean_d,
            std_demand=sigma_d,
            lead_time_days=stats["lead_time_days"],
            std_lead_time=stats["lead_time_sd"],
            z_score=1.645
        )

        comparisons.append({
            "product_id": pid,
            "product_name": obs_list[0].product.product_name if obs_list[0].product else pid,
            "supplier_id": obs_list[0].supplier_id,
            "promised_days": promised,
            "actual_mean_days": round(mean_actual, 1),
            "sigma_L_days": round(stats["lead_time_sd"], 2),
            "observations_count": len(obs_list),
            "classical_safety_stock": old_ss,
            "kings_calibrated_safety_stock": new_ss,
            "delta_safety_stock": new_ss - old_ss,
            "is_low_confidence": stats["is_fallback"]
        })

    return {
        "summary": {
            "total_observations": len(observations),
            "calibrated_skus": len(comparisons),
        },
        "comparisons": comparisons
    }


@router.get("/forecast-scorecard")
def get_forecast_scorecard(
    dataset_id: Optional[int] = None,
    lookback_days: int = 60,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """FORECAST ACCOUNTABILITY: Returns running WAPE, MAPE, and historical error audit."""
    target_ds = resolve_dataset(db, current_user, dataset_id)
    eff_dataset_id = target_ds.id if target_ds else 1
    return compute_forecast_accountability_scorecard(dataset_id=eff_dataset_id, db=db, lookback_days=lookback_days)
