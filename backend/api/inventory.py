"""
Inventory API Router
Project: Demand-Decision-Intelligence
Provides inventory recommendations, dynamic policy calculations,
and daily simulation status (Closing Stock = Opening + Received - Sales).
"""

import json
import math
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, date
from pydantic import BaseModel, Field
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import pandas as pd

from backend.db.session import get_db
from backend.core.deps import get_current_user_or_guest
from backend.models.user import User
from backend.models.product import Product
from backend.models.demand import DailyProductDemand
from backend.models.inventory import InventoryState, InventoryRecommendation
from backend.models.upload import UploadJob
from backend.services.dataset_service import resolve_dataset
from backend.services.forecast_service import check_historical_warning
from backend.services.inventory_service import (
    compute_inventory_recommendation_for_sku,
    compute_safety_stock_kings,
    compute_safety_stock_classical,
)


class BudgetAllocationRequest(BaseModel):
    dataset_id: Optional[int] = None
    budget: float = Field(..., gt=0, description="Available procurement working capital budget")
    horizon_days: int = Field(default=14, ge=1, le=180, description="Planning horizon in days")
    location_id: Optional[str] = Field(default=None, description="Optional city/location filter (e.g. 'Delhi', 'Mumbai', 'ALL')")
    constraints: Optional[Dict[str, Any]] = None


router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
REPORTS_DIR = PROJECT_ROOT / "reports"


@router.get("/status")
def get_inventory_status(
    product_id: Optional[str] = None,
    city_name: Optional[str] = None,
    snapshot_date: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    db: Session = Depends(get_db)
):
    """
    Returns daily inventory simulation status:
    Formula: Closing Stock = Opening Stock + Stock Received - Sales Quantity.
    Includes Days of Stock Cover, stockout risk indicators, and reorder urgency.
    """
    query = db.query(InventoryState).join(Product, InventoryState.product_id == Product.product_id, isouter=True)

    if product_id:
        query = query.filter(InventoryState.product_id == str(product_id).strip())

    if city_name and city_name.upper() != "ALL":
        query = query.filter(InventoryState.city_name.ilike(city_name.strip()))

    if snapshot_date:
        try:
            parsed_d = date.fromisoformat(snapshot_date.strip())
            query = query.filter(InventoryState.snapshot_date == parsed_d)
        except ValueError:
            pass

    rows = query.order_by(InventoryState.snapshot_date.desc(), InventoryState.product_id).limit(limit).all()

    # Pre-fetch recommendation averages for days-of-cover computation
    rec_dict = {}
    if rows:
        p_ids = {r.product_id for r in rows}
        recs = db.query(InventoryRecommendation).filter(InventoryRecommendation.product_id.in_(p_ids)).all()
        for r in recs:
            rec_dict[(r.product_id, r.city_name)] = r.avg_daily_demand

    results = []
    for item in rows:
        daily_dem = rec_dict.get((item.product_id, item.city_name), max(1.0, item.sales_quantity))
        days_cover = round(item.closing_stock / max(1.0, daily_dem), 1)

        if days_cover <= 2.0:
            stockout_risk = "CRITICAL_STOCKOUT"
            reorder_urgency = "HIGH"
            action_text = "Trigger Emergency Replenishment"
        elif days_cover <= 4.0:
            stockout_risk = "REORDER_RECOMMENDED"
            reorder_urgency = "MEDIUM"
            action_text = "Issue Supplier Reorder"
        elif days_cover > 15.0:
            stockout_risk = "OVERSTOCK"
            reorder_urgency = "LOW"
            action_text = "Surplus Inventory - Pause PO"
        else:
            stockout_risk = "OPTIMAL"
            reorder_urgency = "NONE"
            action_text = "Stock Buffer Adequate"

        results.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product.product_name if item.product else f"SKU #{item.product_id}",
            "city_name": item.city_name,
            "snapshot_date": str(item.snapshot_date),
            "opening_stock": round(item.opening_stock, 1),
            "stock_received": round(item.stock_received, 1),
            "sales_quantity": round(item.sales_quantity, 1),
            "closing_stock": round(item.closing_stock, 1),
            "is_simulated": item.is_simulated,
            "days_of_cover": days_cover,
            "stockout_risk": stockout_risk,
            "reorder_urgency": reorder_urgency,
            "action_text": action_text,
        })

    return {
        "status": "success",
        "total_returned": len(results),
        "data": results
    }


@router.get("/recommendations")
def get_inventory_recommendations(
    product_id: Optional[str] = None,
    city_name: Optional[str] = None,
    supplier_id: Optional[str] = None,
    dataset_id: Optional[int] = Query(default=None),
    as_of: Optional[date] = Query(default=None),
    use_classical: bool = Query(default=False, description="Use classical constant lead-time formula instead of King's formula"),
    limit: int = Query(default=100, le=1000),
    db: Session = Depends(get_db)
):
    """
    Returns calculated inventory optimization recommendations:
    Safety Stock (King's Formula with lead-time variability or classical), Reorder Point (ROP), Target Stock Level (TSL).
    Dynamically computes recommendations from the database scoped to the dataset if product_id is provided,
    otherwise returns precomputed deliverable sample dataset or DB records.
    """
    target_dataset = resolve_dataset(db, None, dataset_id)
    latest_job = (
        db.query(UploadJob.id)
        .filter(UploadJob.status == "COMPLETED")
        .order_by(UploadJob.id.desc())
        .first()
    )
    latest_upload_id = latest_job[0] if latest_job else None

    if product_id:
        # Check staleness in DB
        stale_rec = (
            db.query(InventoryRecommendation)
            .filter(
                InventoryRecommendation.dataset_id == target_dataset.id,
                InventoryRecommendation.product_id == str(product_id),
                InventoryRecommendation.is_stale == True
            )
            .first()
        )
        is_stale = stale_rec is not None

        rec = compute_inventory_recommendation_for_sku(
            db=db,
            target_dataset=target_dataset,
            product_id=str(product_id),
            city_name=city_name,
            supplier_id=supplier_id,
            as_of=as_of,
            use_classical=use_classical,
        )
        if rec:
            return {
                "status": "success",
                "dataset_id": target_dataset.id,
                "total_returned": 1,
                "data": [rec],
                "as_of": rec["as_of"],
                "historical_warning": rec["historical_warning"],
                "freshness": {
                    "computed_at": datetime.now(timezone.utc).isoformat(),
                    "data_through": rec["as_of"],
                    "is_stale": is_stale,
                    "model_name": f"King_SafetyStock_95 ({rec['formula_used']})",
                    "source_upload_job_id": latest_upload_id
                }
            }

    # Query DB recommendations first
    db_query = db.query(InventoryRecommendation).join(
        Product, InventoryRecommendation.product_id == Product.product_id, isouter=True
    ).filter(InventoryRecommendation.dataset_id == target_dataset.id)

    if product_id:
        db_query = db_query.filter(InventoryRecommendation.product_id == str(product_id).strip())

    if city_name and city_name.upper() != "ALL":
        db_query = db_query.filter(InventoryRecommendation.city_name.ilike(city_name.strip()))

    db_recs = db_query.order_by(desc(InventoryRecommendation.avg_daily_demand)).limit(limit).all()

    if db_recs:
        res_list = []
        for r in db_recs:
            # Compute p_stockout from stock vs reorder point ratio
            rop = r.reorder_point if r.reorder_point and r.reorder_point > 0 else 1.0
            cur = r.current_stock if r.current_stock else 0.0
            # Ratio: 0 stock = 1.0 risk, 2x ROP = 0.0 risk
            ratio = max(0.0, min(1.0, 1.0 - (cur / (rop * 2.0))))
            # Enforce minimum thresholds based on risk_status
            risk = (r.risk_status or "").upper()
            if risk in ("CRITICAL", "REORDER_NOW"):
                ratio = max(ratio, 0.85)
            elif risk in ("REORDER_RECOMMENDED", "LOW_STOCK"):
                ratio = max(ratio, 0.60)
            p_stockout = round(ratio, 3)

            res_list.append({
                "id": r.id,
                "product_id": r.product_id,
                "product_name": r.product.product_name if r.product else f"Product #{r.product_id}",
                "city_name": r.city_name,
                "calculation_date": str(r.calculation_date),
                "current_stock": r.current_stock,
                "mean_daily_demand": r.avg_daily_demand,
                "avg_daily_demand": r.avg_daily_demand,
                "std_daily_demand": round(r.avg_daily_demand * 0.12, 2),
                "lead_time_days": r.lead_time_days,
                "safety_stock": r.safety_stock,
                "reorder_point": r.reorder_point,
                "target_stock_level": round(r.reorder_point + (r.avg_daily_demand * 7), 1),
                "recommended_order_qty": r.recommended_order_qty,
                "risk_status": r.risk_status,
                "priority": r.priority,
                "p_stockout": p_stockout,
            })
        return {
            "status": "success",
            "source": "database",
            "dataset_id": target_dataset.id,
            "total_returned": len(res_list),
            "data": res_list
        }

    return {
        "status": "success",
        "source": "database",
        "dataset_id": target_dataset.id,
        "total_returned": 0,
        "data": []
    }


@router.get("/metadata")
def get_inventory_metadata():
    """
    Returns inventory engine metadata and configuration audit.
    """
    meta_file = REPORTS_DIR / "inventory_engine_metadata.json"
    if not meta_file.exists():
        return {
            "status": "success",
            "metadata": {
                "engine_version": "2.1.0",
                "default_lead_time_days": 3,
                "target_service_level": 0.95,
                "review_period_days": 7
            }
        }

    with open(meta_file, "r") as f:
        data = json.load(f)

    return {
        "status": "success",
        "metadata": data
    }


@router.get("/forward-buy-analysis")
def get_forward_buy_analysis(
    product_id: Optional[str] = None,
    delta_pct: float = 0.15,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """
    Prompt 4.3: Quantifies optimal forward cover and order quantity against
    an anticipated price rise, subject to shelf life, capital, and capacity constraints.
    """
    from backend.services.forward_buy_optimizer import compute_optimal_forward_buy
    from backend.models.inventory import InventoryRecommendation
    from backend.models.procurement import SupplierProduct

    d_bar = 25.0
    sigma_d = 7.5
    current_price = 50.0
    shelf_life = 180

    if product_id:
        prod = db.query(Product).filter(Product.product_id == str(product_id)).first()
        if prod and prod.shelf_life_days:
            shelf_life = prod.shelf_life_days

        rec = db.query(InventoryRecommendation).filter(
            InventoryRecommendation.product_id == str(product_id)
        ).first()
        if rec and rec.avg_daily_demand > 0:
            d_bar = rec.avg_daily_demand
            sigma_d = rec.avg_daily_demand * 0.35

        sp = db.query(SupplierProduct).filter(
            SupplierProduct.product_id == str(product_id)
        ).first()
        if sp and sp.unit_cost > 0:
            current_price = sp.unit_cost

    result = compute_optimal_forward_buy(
        d_bar=d_bar,
        sigma_d=sigma_d,
        current_price=current_price,
        delta_pct=delta_pct,
        shelf_life_days=shelf_life,
        holding_cost_rate=0.25,
        storage_capacity_units=1500.0,
        available_capital=300000.0
    )
    result["product_id"] = product_id
    result["unit_price"] = current_price
    result["mean_daily_demand"] = d_bar
    return result


@router.post("/allocate")
def allocate_procurement_budget(
    payload: BudgetAllocationRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """
    Capital Allocation Planner: 'What should I buy with the money I have'
    Input: {dataset_id, budget, horizon_days, location_id?, constraints?}
    """
    from backend.services.budget_allocator import allocate_budget
    return allocate_budget(
        db=db,
        dataset_id=payload.dataset_id,
        budget=payload.budget,
        horizon_days=payload.horizon_days,
        location_id=payload.location_id,
        constraints=payload.constraints,
    )


class WhatIfSimulationRequest(BaseModel):
    dataset_id: Optional[int] = None
    product_ids: Optional[List[str]] = None
    service_level: Optional[float] = Field(0.95, ge=0.50, le=0.999)
    lead_time_days: Optional[int] = Field(None, ge=1, le=180)
    review_period_days: Optional[int] = Field(None, ge=1, le=90)
    demand_multiplier: float = Field(1.0, ge=0.1, le=5.0)
    price_change_pct: float = Field(0.0, ge=-80.0, le=200.0)
    price_elasticity: float = Field(-1.5, le=0.0)
    budget: Optional[float] = Field(None, ge=0.0)
    holding_cost_rate: float = Field(0.20, ge=0.01, le=1.0)


class SaveSimulationPolicyRequest(BaseModel):
    dataset_id: Optional[int] = None
    service_level: float = Field(0.95, ge=0.50, le=0.999)
    lead_time_days: Optional[int] = None
    review_period_days: Optional[int] = None
    cell: Optional[str] = "ALL"


@router.post("/simulate")
def simulate_inventory_policy(
    payload: WhatIfSimulationRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """
    Vectorized What-If Policy Simulation (Prompt 5.3):
    Runs instant side-by-side policy scenario comparison (<500ms execution for 1000 SKUs).
    Evaluates changes in Service Level, Lead Time, Review Period, Demand Shocks, Price Elasticity,
    and Working Capital vs Holding & Stockout Costs, including non-linear cost curve.
    """
    from backend.services.whatif_simulator import run_vectorized_whatif_simulation
    return run_vectorized_whatif_simulation(
        db=db,
        dataset_id=payload.dataset_id,
        product_ids=payload.product_ids,
        service_level=payload.service_level,
        lead_time_days=payload.lead_time_days,
        review_period_days=payload.review_period_days,
        demand_multiplier=payload.demand_multiplier,
        price_change_pct=payload.price_change_pct,
        price_elasticity=payload.price_elasticity,
        budget=payload.budget,
        holding_cost_rate=payload.holding_cost_rate,
    )


@router.post("/simulate/save-policy")
def save_simulated_policy(
    payload: SaveSimulationPolicyRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """
    Persists simulated policy parameters (service level, review period, lead time)
    into ABC-XYZ policy rules.
    """
    from backend.models.classification import AbcXyzPolicy

    updated_cells = []
    cells_to_update = (
        ["AX", "AY", "AZ", "BX", "BY", "BZ", "CX", "CY", "CZ"]
        if not payload.cell or payload.cell.upper() == "ALL"
        else [payload.cell.upper()]
    )

    for c in cells_to_update:
        policy = db.query(AbcXyzPolicy).filter(
            AbcXyzPolicy.cell == c
        ).first()

        if policy:
            policy.target_service_level = payload.service_level
            if payload.review_period_days is not None:
                policy.review_frequency_days = payload.review_period_days
            updated_cells.append(c)
        else:
            new_policy = AbcXyzPolicy(
                cell=c,
                abc_class=c[0],
                xyz_class=c[1],
                target_service_level=payload.service_level,
                review_frequency_days=payload.review_period_days or 7,
                review_strategy="CONTINUOUS" if "A" in c else "PERIODIC",
                safety_stock_policy="STANDARD_KINGS",
                reorder_automation="MANUAL_APPROVAL" if "Z" in c else "AUTOMATED",
            )
            db.add(new_policy)
            updated_cells.append(c)

    db.commit()
    return {
        "status": "success",
        "message": f"Successfully updated policy for {len(updated_cells)} cells with Service Level {payload.service_level * 100}%.",
        "updated_cells": updated_cells,
        "service_level": payload.service_level,
    }
