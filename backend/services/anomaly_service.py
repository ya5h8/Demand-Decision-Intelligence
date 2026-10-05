"""
Anomaly Service
backend/services/anomaly_service.py

Thin service layer wrapping the DemandAnomalyDetector engine.
Provides:
  - run_detection()          : run the full pipeline
  - load_anomalies_df()      : load the output CSV into a filtered DataFrame
  - get_summary_stats()      : aggregate KPI stats from the CSV
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

import pandas as pd
import numpy as np

logger = logging.getLogger("AnomalyService")

PROJECT_ROOT  = Path(__file__).resolve().parent.parent.parent
ANOMALY_CSV   = PROJECT_ROOT / "reports" / "demand_anomalies.csv"
FORECAST_CSV  = PROJECT_ROOT / "reports" / "forecast_results.csv"
SKU_CLASS_CSV = PROJECT_ROOT / "reports" / "sku_demand_classification.csv"

# Required columns guaranteed by the Phase-4 engine
REQUIRED_COLS = [
    "anomaly_id","date_","product_id","city_name",
    "actual_demand","expected_demand","anomaly_score",
    "anomaly_type","severity","confidence","detection_method",
    "sbc_class","explanation","action_recommendation",
    "modified_z_score","z_score","residual","rolling_volatility",
]


def run_detection(
    forecast_path: Optional[Path] = None,
    sku_class_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Execute the full anomaly detection pipeline and return stats.
    Imports engine lazily to avoid circular import at startup.
    """
    from analytics.anomaly_detection_engine import DemandAnomalyDetector
    detector = DemandAnomalyDetector()
    stats = detector.run_pipeline(
        forecast_path=forecast_path,
        sku_class_path=sku_class_path,
    )
    return stats


def load_anomalies_df(
    anomaly_csv: Optional[Path] = None,
    severity: Optional[str] = None,
    city_name: Optional[str] = None,
    product_id: Optional[str] = None,
    anomaly_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 500,
) -> pd.DataFrame:
    """
    Load and filter the anomalies CSV.

    Args:
        anomaly_csv:  Override path to the anomaly CSV.
        severity:     Filter by severity. "ALL" or None = no filter.
        city_name:    Filter by city (case-insensitive). "ALL" = no filter.
        product_id:   Filter by product_id string.
        anomaly_type: Filter by anomaly type string. "ALL" = no filter.
        start_date:   ISO date string (inclusive lower bound on date_).
        end_date:     ISO date string (inclusive upper bound on date_).
        limit:        Maximum rows returned.

    Returns:
        Filtered pandas DataFrame (never raises on empty — returns empty DF).
    """
    csv_path = anomaly_csv or ANOMALY_CSV
    if not csv_path.exists():
        logger.warning(f"Anomaly CSV not found at {csv_path}. Returning empty DataFrame.")
        return pd.DataFrame(columns=REQUIRED_COLS)

    try:
        df = pd.read_csv(csv_path, low_memory=False)
    except Exception as exc:
        logger.error(f"Failed to read anomaly CSV: {exc}")
        return pd.DataFrame(columns=REQUIRED_COLS)

    if df.empty:
        return df

    # Ensure all required cols exist (backward compat with legacy CSV)
    for col in REQUIRED_COLS:
        if col not in df.columns:
            df[col] = ""

    # Parse date
    df["date_"] = pd.to_datetime(df["date_"], errors="coerce")

    # --- filters ---
    if severity and severity.upper() != "ALL":
        df = df[df["severity"].str.upper() == severity.upper()]
    if city_name and city_name.upper() != "ALL":
        df = df[df["city_name"].str.lower() == city_name.strip().lower()]
    if product_id:
        df = df[df["product_id"].astype(str) == str(product_id).strip()]
    if anomaly_type and anomaly_type.upper() != "ALL":
        at = anomaly_type.strip().upper()
        alias_map = {"SPIKE_DEMAND": "DEMAND_SPIKE", "DROP_STOCKOUT": "DEMAND_DROP"}
        candidates = {at, alias_map.get(at, at)}
        df = df[df["anomaly_type"].str.upper().isin(candidates)]
    if start_date:
        try:
            df = df[df["date_"] >= pd.to_datetime(start_date)]
        except Exception:
            pass
    if end_date:
        try:
            df = df[df["date_"] <= pd.to_datetime(end_date)]
        except Exception:
            pass

    df = df.sort_values(["date_","anomaly_score"], ascending=[False, False])
    return df.head(limit).reset_index(drop=True)


def get_summary_stats(anomaly_csv: Optional[Path] = None) -> Dict[str, Any]:
    """
    Compute aggregate KPI statistics from the anomaly CSV.
    Always returns a valid dict even if the CSV is missing or empty.
    """
    csv_path = anomaly_csv or ANOMALY_CSV
    empty_resp: Dict[str, Any] = {
        "source": "empty",
        "total_anomalies": 0,
        "severity_breakdown":    {"CRITICAL":0,"MEDIUM":0,"LOW":0},
        "anomaly_type_breakdown":{
            "DEMAND_SPIKE":0,"DEMAND_DROP":0,"RESIDUAL_ANOMALY":0,
            "VOLATILITY_ANOMALY":0,"STOCKOUT_SUSPECTED":0,"DEAD_STOCK":0
        },
        "date_range": {"earliest_date": None, "latest_date": None},
    }

    if not csv_path.exists():
        return empty_resp

    try:
        df = pd.read_csv(csv_path, low_memory=False)
    except Exception:
        return empty_resp

    if df.empty:
        return empty_resp

    df["date_"] = pd.to_datetime(df["date_"], errors="coerce")
    sev  = df["severity"].value_counts().to_dict() if "severity" in df else {}
    typ  = df["anomaly_type"].value_counts().to_dict() if "anomaly_type" in df else {}

    return {
        "source": "csv",
        "total_anomalies": len(df),
        "severity_breakdown": {
            "CRITICAL": int(sev.get("CRITICAL", 0)),
            "MEDIUM":   int(sev.get("MEDIUM",   0)),
            "LOW":      int(sev.get("LOW",       0)),
        },
        "anomaly_type_breakdown": {
            "DEMAND_SPIKE":       int(typ.get("DEMAND_SPIKE",       0)),
            "DEMAND_DROP":        int(typ.get("DEMAND_DROP",        0)),
            "RESIDUAL_ANOMALY":   int(typ.get("RESIDUAL_ANOMALY",   0)),
            "VOLATILITY_ANOMALY": int(typ.get("VOLATILITY_ANOMALY", 0)),
            "STOCKOUT_SUSPECTED": int(typ.get("STOCKOUT_SUSPECTED", 0)),
            "DEAD_STOCK":         int(typ.get("DEAD_STOCK",         0)),
            "SPIKE_DEMAND":       int(typ.get("DEMAND_SPIKE",       0)),
            "DROP_STOCKOUT":      int(typ.get("DEMAND_DROP",        0)),
        },
        "date_range": {
            "earliest_date": str(df["date_"].min().date()) if not df["date_"].isna().all() else None,
            "latest_date":   str(df["date_"].max().date()) if not df["date_"].isna().all() else None,
        },
    }
