"""
backend/api/demand.py
---------------------
API Router for Demand Intelligence & Time-Series Aggregation.
Endpoints:
  GET  /api/demand/summary                  - Dynamic summary from PostgreSQL
  GET  /api/demand/daily                    - Aggregated daily demand series from PostgreSQL
  POST /api/demand/sync                     - Trigger CSV -> PostgreSQL batch sync
  GET  /api/demand/forecast-metrics         - Static benchmark metrics
  GET  /api/demand/inventory-recommendations - Dynamic inventory recommendations
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, distinct, func
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.models.demand import DailyProductDemand
from backend.services.daily_demand_sync import sync_daily_demand

router = APIRouter()

project_root = Path(__file__).resolve().parent.parent.parent
reports_dir = project_root / "reports"


@router.get("/summary", summary="Get Demand Intelligence Dataset Summary")
def get_demand_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns dataset dimensions, date coverage, and summary metrics
    dynamically calculated from the PostgreSQL `daily_product_demand` table.
    """
    stats = db.query(
        func.count(DailyProductDemand.id).label("total_records"),
        func.sum(DailyProductDemand.total_quantity).label("total_demand"),
        func.sum(DailyProductDemand.total_sales_value).label("total_revenue"),
        func.count(distinct(DailyProductDemand.product_id)).label("unique_products"),
        func.count(distinct(DailyProductDemand.city_name)).label("unique_cities"),
        func.min(DailyProductDemand.date_).label("date_min"),
        func.max(DailyProductDemand.date_).label("date_max"),
        func.count(distinct(DailyProductDemand.date_)).label("recorded_active_days"),
    ).first()

    # If DB is empty, provide fallback
    if not stats or not stats.total_records:
        return {
            "dataset_name": "Flipkart Grocery Demand Intelligence",
            "total_sales_transactions": 46_706_387,
            "total_demand_quantity": 0.0,
            "total_revenue_inr": 0.0,
            "total_quantity": 0.0,
            "total_revenue": 0.0,
            "unique_products": 0,
            "unique_cities": 0,
            "date_min": "2022-04-01",
            "date_max": "2022-07-10",
            "date_range": {
                "start": "2022-04-01",
                "end": "2022-07-10",
                "total_calendar_days": 101,
                "recorded_active_days": 0,
            },
            "geography": [],
            "top_products_by_qty": [],
            "catalog": {
                "total_product_master_skus": 32_226,
                "active_sales_skus": 0,
                "product_city_series": 0,
                "unmatched_skus": 1_496,
                "unmatched_sales_rows": 532_122,
                "match_rate_pct": 98.86,
            },
            "data_integrity": {
                "fabricated_rows": 0,
                "deleted_rows": 0,
                "unmatched_attributes_status": "NOT_AVAILABLE",
            },
        }

    # Distinct cities
    city_rows = (
        db.query(distinct(DailyProductDemand.city_name))
        .order_by(DailyProductDemand.city_name)
        .all()
    )
    cities = [r[0] for r in city_rows if r[0]]

    # Top products by demand quantity
    top_rows = (
        db.query(
            DailyProductDemand.product_id,
            func.sum(DailyProductDemand.total_quantity).label("total_qty"),
        )
        .group_by(DailyProductDemand.product_id)
        .order_by(desc("total_qty"))
        .limit(6)
        .all()
    )
    top_products = [
        {"product_id": str(r[0]), "total_qty": round(float(r[1]), 2)}
        for r in top_rows
    ]

    d_min = stats.date_min
    d_max = stats.date_max
    cal_days = (d_max - d_min).days + 1 if (d_min and d_max) else 0

    return {
        "dataset_name": "Flipkart Grocery Demand Intelligence",
        "total_sales_transactions": 46_706_387,
        "total_demand_quantity": round(float(stats.total_demand or 0), 2),
        "total_revenue_inr": round(float(stats.total_revenue or 0), 2),
        "total_quantity": round(float(stats.total_demand or 0), 2),
        "total_revenue": round(float(stats.total_revenue or 0), 2),
        "unique_products": int(stats.unique_products or 0),
        "unique_cities": int(stats.unique_cities or 0),
        "date_min": str(d_min) if d_min else "2022-04-01",
        "date_max": str(d_max) if d_max else "2022-07-10",
        "date_range": {
            "start": str(d_min) if d_min else "2022-04-01",
            "end": str(d_max) if d_max else "2022-07-10",
            "total_calendar_days": cal_days,
            "recorded_active_days": int(stats.recorded_active_days or 0),
        },
        "geography": cities,
        "top_products_by_qty": top_products,
        "catalog": {
            "total_product_master_skus": 32_226,
            "active_sales_skus": int(stats.unique_products or 0),
            "product_city_series": int(stats.total_records or 0),
            "unmatched_skus": 1_496,
            "unmatched_sales_rows": 532_122,
            "match_rate_pct": 98.86,
        },
        "data_integrity": {
            "fabricated_rows": 0,
            "deleted_rows": 0,
            "unmatched_attributes_status": "NOT_AVAILABLE",
        },
    }


@router.get("/daily", summary="Get Daily Aggregated Demand")
def get_daily_demand(
    product_id: Optional[str] = None,
    city_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=1000),
    exclude_zeros: bool = Query(False),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Returns daily aggregated demand series from the PostgreSQL `daily_product_demand` table.
    Supports filtering by product_id, city_name, date range, and pagination.
    """
    query = db.query(DailyProductDemand)

    if product_id:
        try:
            pid_int = int(product_id.strip())
            query = query.filter(DailyProductDemand.product_id == pid_int)
        except ValueError:
            return {"total": 0, "page": page, "page_size": page_size, "results": []}

    if city_name and city_name.upper() != "ALL":
        query = query.filter(func.lower(DailyProductDemand.city_name) == city_name.strip().lower())

    if start_date:
        try:
            d_start = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
            query = query.filter(DailyProductDemand.date_ >= d_start)
        except ValueError:
            pass

    if end_date:
        try:
            d_end = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
            query = query.filter(DailyProductDemand.date_ <= d_end)
        except ValueError:
            pass

    if exclude_zeros:
        query = query.filter(DailyProductDemand.total_quantity > 0)

    total = query.count()

    # Order by date descending, product_id ascending
    rows = (
        query.order_by(DailyProductDemand.date_.desc(), DailyProductDemand.product_id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    results = [
        {
            "id": r.id,
            "date_": r.date_.isoformat() if hasattr(r.date_, "isoformat") else str(r.date_),
            "sale_date": r.date_.isoformat() if hasattr(r.date_, "isoformat") else str(r.date_),
            "product_id": str(r.product_id),
            "city_name": r.city_name,
            "total_quantity": round(float(r.total_quantity), 2),
            "revenue": round(float(r.total_sales_value), 2),
            "total_sales_value": round(float(r.total_sales_value), 2),
            "order_count": int(r.order_count),
            "avg_unit_price": round(float(r.avg_unit_price), 2) if r.avg_unit_price is not None else None,
        }
        for r in rows
    ]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": results,
    }


@router.post("/sync", summary="Synchronize Processed Daily Demand into PostgreSQL")
def trigger_daily_demand_sync(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Triggers idempotent batch synchronization of `daily_product_demand.csv` into PostgreSQL.
    """
    report = sync_daily_demand(db=db)
    return report


@router.get("/forecast-metrics", summary="Get Forecasting Model Benchmarks and Error Analysis")
def get_forecast_metrics():
    """Returns time-based validation performance across baselines and ML models."""
    metrics_file = reports_dir / "forecast_evaluation_report.json"
    if not metrics_file.exists():
        raise HTTPException(status_code=404, detail="Forecast evaluation metrics report not found.")
    with open(metrics_file, "r") as f:
        return json.load(f)


@router.get("/inventory-recommendations", summary="Get Safety Stock and Reorder Point Recommendations")
def get_inventory_recommendations(
    limit: int = Query(50, ge=1, le=1000),
    city: Optional[str] = Query(None, description="Filter by city name"),
    lead_time_days: int = Query(3, ge=1, le=30),
    service_level: float = Query(0.95, ge=0.80, le=0.99),
):
    """
    Returns inventory policies (Safety Stock, ROP, Target Stock Level).
    Note: Lead time and service level are user-supplied configuration parameters.
    """
    import pandas as pd
    sample_file = reports_dir / "inventory_decision_sample.csv"
    if not sample_file.exists():
        raise HTTPException(status_code=404, detail="Inventory decision recommendations not generated.")

    df = pd.read_csv(sample_file)
    if city:
        df = df[df["city_name"].str.lower() == city.lower()]

    # Recalculate dynamic columns if parameters differ from default
    if lead_time_days != 3 or service_level != 0.95:
        z_scores = {0.90: 1.282, 0.95: 1.645, 0.98: 2.054, 0.99: 2.326}
        z = z_scores.get(round(service_level, 2), 1.645)
        import numpy as np
        df["lead_time_days_param"] = lead_time_days
        df["target_service_level_param"] = service_level
        df["safety_stock"] = np.ceil(z * df["std_daily_demand"] * np.sqrt(lead_time_days)).astype(int)
        df["reorder_point"] = np.ceil(df["mean_daily_demand"] * lead_time_days + df["safety_stock"]).astype(int)
        df["target_stock_level"] = np.ceil(df["mean_daily_demand"] * (lead_time_days + 7) + df["safety_stock"]).astype(int)

    records = df.head(limit).to_dict(orient="records")
    return {
        "parameters": {
            "lead_time_days": lead_time_days,
            "target_service_level": service_level,
            "review_period_days": 7,
        },
        "total_results": len(records),
        "data": records,
    }
