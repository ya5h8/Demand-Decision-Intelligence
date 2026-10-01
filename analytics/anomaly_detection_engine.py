"""
Demand Anomaly & Outlier Detection Engine  Phase 4
analytics/anomaly_detection_engine.py

Hybrid, demand-category-aware pipeline:
  SMOOTH / ERRATIC  -> Modified Z-Score (MAD) + Isolation Forest
  INTERMITTENT / LUMPY -> Poisson percentile + inter-arrival gap
  ALL -> Dead-stock detection

Anomaly types: DEMAND_SPIKE, DEMAND_DROP, RESIDUAL_ANOMALY,
               VOLATILITY_ANOMALY, STOCKOUT_SUSPECTED, DEAD_STOCK
"""

import sys
import logging
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("AnomalyDetectionEngine")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAD_FLOOR_ABS        = 1.0
MAD_FLOOR_FRAC       = 0.1
MODIFIED_Z_THRESHOLD = 3.5
ROLLING_WINDOW       = 14
MIN_HISTORY_DAYS     = 7
DEAD_STOCK_ZERO_DAYS = 60
DEAD_STOCK_MIN_HIST  = 90
INTERMITTENT_PCT     = 99
GAP_PERCENTILE       = 99
ISO_CONTAMINATION    = 0.03
ISO_RANDOM_STATE     = 42

SMOOTH_CATS       = {"Smooth", "Erratic"}
INTERMITTENT_CATS = {"Intermittent", "Lumpy"}


class DemandAnomalyDetector:
    """
    Hybrid demand-category-aware ML Anomaly Detection Engine.
    """

    def __init__(
        self,
        project_root: Optional[Path] = None,
        contamination: float = ISO_CONTAMINATION,
        z_threshold: float = MODIFIED_Z_THRESHOLD,
        rolling_window: int = ROLLING_WINDOW,
        min_history_days: int = MIN_HISTORY_DAYS,
        random_state: int = ISO_RANDOM_STATE,
        expected_demand_col: str = "pred_hybrid",
    ):
        self.project_root      = project_root or Path(__file__).resolve().parent.parent
        self.forecast_file     = self.project_root / "reports" / "forecast_results.csv"
        self.sku_class_file    = self.project_root / "reports" / "sku_demand_classification.csv"
        self.output_csv        = self.project_root / "reports" / "demand_anomalies.csv"
        self.contamination     = contamination
        self.z_threshold       = z_threshold
        self.rolling_window    = rolling_window
        self.min_history_days  = min_history_days
        self.random_state      = random_state
        self.expected_demand_col = expected_demand_col
        self.stats: Dict[str, Any] = {}
        self.iso_model: Optional[IsolationForest] = None

    # ------------------------------------------------------------------
    # 1. LOAD DATA
    # ------------------------------------------------------------------
    def load_data(
        self,
        forecast_path: Optional[Path] = None,
        sku_class_path: Optional[Path] = None,
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        f_path = forecast_path or self.forecast_file
        s_path = sku_class_path or self.sku_class_file
        if not f_path.exists():
            raise FileNotFoundError(f"Forecast results not found: {f_path}")
        if not s_path.exists():
            raise FileNotFoundError(f"SKU classification not found: {s_path}")

        logger.info(f"Loading forecast data: {f_path}")
        df_fc = pd.read_csv(f_path, low_memory=False)
        logger.info(f"Loading SKU classification: {s_path}")
        df_sku = pd.read_csv(s_path, low_memory=False)

        req_fc = {"date_", "product_id", "city_name", "daily_quantity"}
        missing = req_fc - set(df_fc.columns)
        if missing:
            raise KeyError(f"Missing columns in forecast_results.csv: {missing}")

        pred_priority = [
            "pred_hybrid","pred_ensemble","pred_lgb","pred_xgb",
            "pred_hist_gbt","pred_prophet","pred_ridge","pred_sba","pred_ma_7"
        ]
        chosen = self.expected_demand_col
        if chosen not in df_fc.columns:
            for c in pred_priority:
                if c in df_fc.columns:
                    logger.warning(f"Column '{chosen}' missing; falling back to '{c}'")
                    chosen = c
                    self.expected_demand_col = c
                    break
            else:
                raise KeyError(f"No forecast column found. Available: {df_fc.columns.tolist()}")

        df_fc["date_"]          = pd.to_datetime(df_fc["date_"], errors="coerce")
        df_fc["product_id"]     = df_fc["product_id"].astype(str)
        df_fc["city_name"]      = df_fc["city_name"].astype(str).str.strip()
        df_fc["actual_demand"]  = pd.to_numeric(df_fc["daily_quantity"], errors="coerce").fillna(0.0)
        df_fc["expected_demand"]= pd.to_numeric(df_fc[chosen], errors="coerce").fillna(0.0)

        df_sku["product_id"] = df_sku["product_id"].astype(str)
        df_sku["city_name"]  = df_sku["city_name"].astype(str).str.strip()

        self.stats["records_loaded_forecast"] = len(df_fc)
        self.stats["records_loaded_sku_class"] = len(df_sku)
        return df_fc, df_sku

    # ------------------------------------------------------------------
    # 2. PREPARE SERIES (merge + rolling baseline)
    # ------------------------------------------------------------------
    def prepare_series(self, df_fc: pd.DataFrame, df_sku: pd.DataFrame) -> pd.DataFrame:
        logger.info("Merging data and computing rolling baselines...")
        df_fc = df_fc.copy()
        if "actual_demand" not in df_fc.columns:
            if "daily_quantity" in df_fc.columns:
                df_fc["actual_demand"] = pd.to_numeric(df_fc["daily_quantity"], errors="coerce").fillna(0.0)
            else:
                raise KeyError("Neither 'actual_demand' nor 'daily_quantity' found in df_fc")

        if "expected_demand" not in df_fc.columns:
            pred_priority = [
                self.expected_demand_col, "pred_hybrid", "pred_ensemble", "pred_lgb", "pred_xgb",
                "pred_hist_gbt", "pred_prophet", "pred_ridge", "pred_sba", "pred_ma_7"
            ]
            for c in pred_priority:
                if c in df_fc.columns:
                    df_fc["expected_demand"] = pd.to_numeric(df_fc[c], errors="coerce").fillna(0.0)
                    break
            else:
                df_fc["expected_demand"] = df_fc["actual_demand"].copy()

        if "date_" in df_fc.columns and not pd.api.types.is_datetime64_any_dtype(df_fc["date_"]):
            df_fc["date_"] = pd.to_datetime(df_fc["date_"], errors="coerce")
        if "product_id" in df_fc.columns:
            df_fc["product_id"] = df_fc["product_id"].astype(str)
        if "city_name" in df_fc.columns:
            df_fc["city_name"] = df_fc["city_name"].astype(str).str.strip()

        df_sku = df_sku.copy()
        if "product_id" in df_sku.columns:
            df_sku["product_id"] = df_sku["product_id"].astype(str)
        if "city_name" in df_sku.columns:
            df_sku["city_name"] = df_sku["city_name"].astype(str).str.strip()

        df = df_fc[["date_","product_id","city_name","actual_demand","expected_demand"]].copy()
        df = df.dropna(subset=["date_"]).sort_values(["product_id","city_name","date_"])

        sku_slim = df_sku[["product_id","city_name","demand_category"]].drop_duplicates()
        df = df.merge(sku_slim, on=["product_id","city_name"], how="left")
        df["demand_category"] = df["demand_category"].fillna("Smooth")

        grp = df.groupby(["product_id","city_name"], group_keys=False)

        def bwd(s, fn):
            return s.shift(1).rolling(self.rolling_window, min_periods=1).agg(fn)

        df["rolling_mean_14"]   = grp["actual_demand"].transform(lambda s: bwd(s,"mean"))
        df["rolling_std_14"]    = grp["actual_demand"].transform(lambda s: bwd(s,"std"))
        df["history_count"]     = grp["actual_demand"].transform(
            lambda s: s.shift(1).rolling(self.rolling_window, min_periods=1).count())
        df["rolling_median_14"] = grp["actual_demand"].transform(lambda s: bwd(s,"median"))
        df["rolling_mad_14"]    = grp["actual_demand"].transform(
            lambda s: s.shift(1).rolling(self.rolling_window, min_periods=1).apply(
                lambda w: float(np.median(np.abs(w - np.median(w)))), raw=True))

        # MAD floor
        df["rolling_mad_14"] = df.apply(
            lambda r: max(
                float(r["rolling_mad_14"]) if pd.notnull(r["rolling_mad_14"]) else 0.0,
                MAD_FLOOR_ABS,
                MAD_FLOOR_FRAC * (float(r["rolling_median_14"]) if pd.notnull(r["rolling_median_14"]) else 0.0)
            ), axis=1)

        df["rolling_std_14"]    = df["rolling_std_14"].fillna(0.0)
        df["rolling_mean_14"]   = df["rolling_mean_14"].fillna(df["actual_demand"])
        df["rolling_median_14"] = df["rolling_median_14"].fillna(df["actual_demand"])
        df["history_count"]     = df["history_count"].fillna(0).astype(int)

        df["residual"]          = df["actual_demand"] - df["expected_demand"]
        df["relative_residual"] = np.where(
            df["expected_demand"] > 0,
            df["residual"] / df["expected_demand"],
            np.where(df["actual_demand"] > 0, 1.0, 0.0))
        df["rolling_volatility"]= df["rolling_std_14"]
        df["sales_volume"]      = df["actual_demand"]

        self.stats["records_prepared"] = len(df)
        logger.info(f"Series prepared: {len(df):,} records")
        return df

    # ------------------------------------------------------------------
    # 3. MODIFIED Z-SCORE (MAD-based)
    # ------------------------------------------------------------------
    def detect_modified_zscore(self, df: pd.DataFrame) -> pd.DataFrame:
        logger.info(f"Computing Modified Z-Scores (|MZ|>{self.z_threshold})...")
        df = df.copy()
        valid   = (df["history_count"] >= self.min_history_days).values
        median  = df["rolling_median_14"].values
        mad     = df["rolling_mad_14"].values
        actual  = df["actual_demand"].values
        mz      = np.zeros(len(df), dtype=float)
        mask    = valid & (mad > 1e-9)
        mz[mask]= 0.6745 * (actual[mask] - median[mask]) / mad[mask]
        df["modified_z_score"] = np.round(mz, 4)
        df["is_mz_anomaly"]    = np.abs(df["modified_z_score"]) > self.z_threshold
        # legacy aliases
        df["z_score"]          = df["modified_z_score"]
        df["is_zscore_anomaly"]= df["is_mz_anomaly"]
        logger.info(f"Modified Z-Score flagged {df['is_mz_anomaly'].sum():,} anomalies.")
        return df

    # ------------------------------------------------------------------
    # 4. ISOLATION FOREST (preserved: contamination=0.03, seed=42)
    # ------------------------------------------------------------------
    def detect_isolation_forest(self, df: pd.DataFrame) -> pd.DataFrame:
        logger.info(f"Fitting Isolation Forest (contamination={self.contamination}, seed={self.random_state})...")
        df = df.copy()
        feature_cols = ["residual","rolling_volatility","sales_volume"]
        X = df[feature_cols].fillna(0.0).values
        self.iso_model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100)
        self.iso_model.fit(X)
        preds = self.iso_model.predict(X)
        df["is_isolation_anomaly"] = (preds == -1)
        raw = self.iso_model.decision_function(X)
        df["iso_raw_score"] = raw
        lo, hi = float(raw.min()), float(raw.max())
        rng    = hi - lo if hi > lo else 1.0
        df["anomaly_score"] = np.round(np.clip(1.0 - (raw - lo) / rng, 0.0, 1.0), 4)
        logger.info(f"Isolation Forest flagged {df['is_isolation_anomaly'].sum():,} anomalies.")
        return df

    # ------------------------------------------------------------------
    # 5. SMOOTH / ERRATIC CLASSIFICATION
    # ------------------------------------------------------------------
    def classify_smooth_anomalies(self, df: pd.DataFrame) -> List[Dict]:
        logger.info("Classifying smooth/erratic anomalies...")
        results = []
        mask     = df["demand_category"].isin(SMOOTH_CATS)
        df_s     = df[mask].copy()

        # VOLATILITY_ANOMALY threshold
        vol_p95 = float(df_s["rolling_volatility"].quantile(0.95)) if not df_s.empty else 0.0

        is_anom  = df_s["is_mz_anomaly"] | df_s["is_isolation_anomaly"]
        df_anom  = df_s[is_anom]

        # Volatility anomalies (separate pass)
        if vol_p95 > 0:
            vol_mask = df_s["rolling_volatility"] > vol_p95 * 1.5
            for _, r in df_s[vol_mask].iterrows():
                results.append(self._make_record(r, "VOLATILITY_ANOMALY", "rolling_volatility_threshold",
                    f"Demand volatility flagged: 14-day rolling std of {r['rolling_volatility']:.2f} is "
                    f"{r['rolling_volatility']/vol_p95:.1f}x the 95th-percentile baseline ({vol_p95:.2f}) "
                    f"for product {r['product_id']} in {r['city_name']}."))

        # Spike/Drop/Residual anomalies
        for _, r in df_anom.iterrows():
            mz      = float(r["modified_z_score"])
            res     = float(r["residual"])
            obs     = float(r["actual_demand"])
            exp     = float(r["expected_demand"])
            med     = float(r["rolling_median_14"])
            mad     = float(r["rolling_mad_14"])
            by_mz   = bool(r["is_mz_anomaly"])
            by_iso  = bool(r["is_isolation_anomaly"])
            score   = float(r["anomaly_score"])

            if by_mz and mz > 0:
                atype  = "DEMAND_SPIKE"
                method = "modified_z_score" if not by_iso else "modified_z_score+isolation_forest"
                expl   = (f"Demand was flagged as a spike because observed demand of {obs:.1f} "
                          f"is above the {self.rolling_window}-day median baseline of {med:.1f} "
                          f"with Modified Z-Score = {mz:.2f} (threshold {self.z_threshold}). "
                          f"MAD = {mad:.2f}, residual = {res:+.1f} units.")
            elif by_mz and mz < 0:
                atype  = "DEMAND_DROP"
                method = "modified_z_score" if not by_iso else "modified_z_score+isolation_forest"
                expl   = (f"Demand was flagged as a drop because observed demand of {obs:.1f} "
                          f"is below the {self.rolling_window}-day median baseline of {med:.1f} "
                          f"with Modified Z-Score = {mz:.2f} (threshold -{self.z_threshold}). "
                          f"MAD = {mad:.2f}, residual = {res:+.1f} units.")
            elif by_iso and not by_mz:
                atype  = "DEMAND_SPIKE" if res > 50 else ("DEMAND_DROP" if res < -50 else "RESIDUAL_ANOMALY")
                method = "isolation_forest"
                expl   = (f"Demand flagged by Isolation Forest (score={score:.4f}) without crossing "
                          f"Modified Z-Score threshold. Observed={obs:.1f}, expected={exp:.1f}, "
                          f"residual={res:+.1f}, Modified Z-Score={mz:.2f}.")
            else:
                atype  = "DEMAND_SPIKE" if res > 0 else "DEMAND_DROP"
                method = "modified_z_score+isolation_forest"
                expl   = (f"Demand anomaly confirmed by both Modified Z-Score ({mz:.2f}) and "
                          f"Isolation Forest (score={score:.4f}). Observed={obs:.1f} vs "
                          f"{self.rolling_window}-day median {med:.1f}. Residual={res:+.1f}.")

            results.append(self._make_record(r, atype, method, expl))

        logger.info(f"Smooth classification produced {len(results):,} records.")
        return results

    def _make_record(self, row, atype: str, method: str, expl: str) -> Dict:
        return {
            "anomaly_id":       str(uuid.uuid4()),
            "date_":            row["date_"],
            "product_id":       str(row["product_id"]),
            "city_name":        str(row["city_name"]),
            "actual_demand":    float(row["actual_demand"]),
            "expected_demand":  float(row["expected_demand"]),
            "anomaly_type":     atype,
            "detection_method": method,
            "sbc_class":        str(row["demand_category"]),
            "anomaly_score":    float(row["anomaly_score"]),
            "modified_z_score": float(row["modified_z_score"]),
            "z_score":          float(row["z_score"]),
            "residual":         float(row["residual"]),
            "rolling_volatility": float(row["rolling_volatility"]),
            "explanation":      expl,
        }

    # ------------------------------------------------------------------
    # 6. INTERMITTENT / LUMPY
    # ------------------------------------------------------------------
    def detect_intermittent_anomalies(self, df: pd.DataFrame) -> List[Dict]:
        logger.info("Detecting intermittent/lumpy anomalies...")
        results = []
        mask   = df["demand_category"].isin(INTERMITTENT_CATS)
        df_int = df[mask]
        if df_int.empty:
            return results

        for (pid, city), grp in df_int.groupby(["product_id","city_name"]):
            grp      = grp.sort_values("date_").reset_index(drop=True)
            demands  = grp["actual_demand"].values
            dates    = grp["date_"].values
            expected = grp["expected_demand"].values
            vols     = grp["rolling_volatility"].values
            cat      = grp["demand_category"].iloc[0]

            nonzero = demands[demands > 0]
            if len(nonzero) < 2:
                continue
            p99 = float(np.percentile(nonzero, INTERMITTENT_PCT))

            # Demand spikes on non-zero days
            for i in range(len(demands)):
                obs = float(demands[i])
                if obs > 0 and obs > p99:
                    results.append({
                        "anomaly_id":       str(uuid.uuid4()),
                        "date_":            pd.Timestamp(dates[i]),
                        "product_id":       str(pid),
                        "city_name":        str(city),
                        "actual_demand":    obs,
                        "expected_demand":  float(expected[i]),
                        "anomaly_type":     "DEMAND_SPIKE",
                        "detection_method": "intermittent_percentile",
                        "sbc_class":        cat,
                        "anomaly_score":    round(obs / max(p99, 1.0), 4),
                        "modified_z_score": 0.0,
                        "z_score":          0.0,
                        "residual":         obs - float(expected[i]),
                        "rolling_volatility": float(vols[i]),
                        "explanation": (
                            f"Demand was flagged as unusual because the non-zero demand of "
                            f"{obs:.1f} units exceeded the 99th percentile ({p99:.1f}) of the "
                            f"intermittent-demand distribution for product {pid} in {city}."
                        ),
                    })

            # STOCKOUT via inter-arrival gap analysis
            gaps, gap_starts = [], []
            cur_gap, gap_start_idx = 0, None
            for i, val in enumerate(demands):
                if val == 0:
                    cur_gap += 1
                    if gap_start_idx is None:
                        gap_start_idx = i
                else:
                    if cur_gap > 0:
                        gaps.append(cur_gap)
                        gap_starts.append(gap_start_idx)
                    cur_gap, gap_start_idx = 0, None
            if cur_gap > 0:
                gaps.append(cur_gap); gap_starts.append(gap_start_idx)

            if len(gaps) < 3:
                continue
            gap_p99 = float(np.percentile(gaps, GAP_PERCENTILE))
            if gap_p99 < 1:
                continue

            for gap_len, gsi in zip(gaps, gap_starts):
                if gap_len > gap_p99 and gsi is not None:
                    idx = min(gsi, len(dates)-1)
                    results.append({
                        "anomaly_id":       str(uuid.uuid4()),
                        "date_":            pd.Timestamp(dates[idx]),
                        "product_id":       str(pid),
                        "city_name":        str(city),
                        "actual_demand":    float(demands[idx]),
                        "expected_demand":  float(expected[idx]),
                        "anomaly_type":     "STOCKOUT_SUSPECTED",
                        "detection_method": "inter_arrival_gap",
                        "sbc_class":        cat,
                        "anomaly_score":    round(gap_len / max(gap_p99, 1.0), 4),
                        "modified_z_score": 0.0,
                        "z_score":          0.0,
                        "residual":         float(demands[idx]) - float(expected[idx]),
                        "rolling_volatility": float(vols[idx]),
                        "explanation": (
                            f"Stockout suspected because the zero-demand interval of {gap_len} days "
                            f"exceeded the historical 99th percentile inter-arrival gap of {gap_p99:.1f} "
                            f"days for product {pid} in {city}."
                        ),
                    })

        logger.info(f"Intermittent detection produced {len(results):,} records.")
        return results

    # ------------------------------------------------------------------
    # 7. DEAD STOCK
    # ------------------------------------------------------------------
    def detect_dead_stock(self, df: pd.DataFrame) -> List[Dict]:
        logger.info("Detecting dead stock (>=90d history, >=60d consecutive zeros)...")
        results = []
        for (pid, city), grp in df.groupby(["product_id","city_name"]):
            grp = grp.sort_values("date_").reset_index(drop=True)
            if len(grp) < DEAD_STOCK_MIN_HIST:
                continue
            demands  = grp["actual_demand"].values
            dates    = grp["date_"].values
            expected = grp["expected_demand"].values
            vols     = grp["rolling_volatility"].values if "rolling_volatility" in grp else np.zeros(len(grp))
            cat      = grp["demand_category"].iloc[0]
            consec, start_idx = 0, None
            for i, val in enumerate(demands):
                if val == 0:
                    consec += 1
                    if start_idx is None:
                        start_idx = i
                    if consec == DEAD_STOCK_ZERO_DAYS:
                        results.append({
                            "anomaly_id":       str(uuid.uuid4()),
                            "date_":            pd.Timestamp(dates[start_idx]),
                            "product_id":       str(pid),
                            "city_name":        str(city),
                            "actual_demand":    0.0,
                            "expected_demand":  float(expected[start_idx]),
                            "anomaly_type":     "DEAD_STOCK",
                            "detection_method": "consecutive_zero_demand",
                            "sbc_class":        cat,
                            "anomaly_score":    1.0,
                            "modified_z_score": 0.0,
                            "z_score":          0.0,
                            "residual":         float(-expected[start_idx]),
                            "rolling_volatility": float(vols[start_idx]),
                            "explanation": (
                                f"Dead stock suspected because demand remained zero for "
                                f"{DEAD_STOCK_ZERO_DAYS} consecutive days starting "
                                f"{pd.Timestamp(dates[start_idx]).date()} for product {pid} "
                                f"in {city}, after at least {DEAD_STOCK_MIN_HIST} days of history."
                            ),
                        })
                else:
                    consec, start_idx = 0, None
        logger.info(f"Dead-stock detection produced {len(results):,} records.")
        return results

    # ------------------------------------------------------------------
    # 8. SEVERITY
    # ------------------------------------------------------------------
    @staticmethod
    def assign_severity(rec: Dict) -> str:
        mz    = abs(float(rec.get("modified_z_score", 0.0)))
        res   = abs(float(rec.get("residual", 0.0)))
        obs   = float(rec.get("actual_demand", 0.0))
        exp   = float(rec.get("expected_demand", 0.0))
        atype = rec.get("anomaly_type", "")
        method= rec.get("detection_method", "")
        raw_r = float(rec.get("residual", 0.0))

        if atype in ("DEAD_STOCK","STOCKOUT_SUSPECTED"):
            return "MEDIUM"
        if mz >= 4.0:
            return "CRITICAL"
        if "+" in method and res >= 100.0 and mz >= 3.0:
            return "CRITICAL"
        if obs <= 10.0 and exp >= 150.0:
            return "CRITICAL"
        if raw_r >= 300.0 and mz >= 3.5:
            return "CRITICAL"
        if mz >= 2.8:
            return "MEDIUM"
        if "isolation_forest" in method and res >= 75.0:
            return "MEDIUM"
        if exp >= 100.0 and obs < 0.3 * exp:
            return "MEDIUM"
        return "LOW"

    # ------------------------------------------------------------------
    # 9. RECOMMENDATIONS
    # ------------------------------------------------------------------
    @staticmethod
    def get_recommendation(atype: str) -> str:
        return {
            "DEMAND_SPIKE":      "Review inventory availability and prepare emergency replenishment. Verify promotions or seasonal factors.",
            "DEMAND_DROP":       "Check inventory, supply chain, and delivery status. Investigate potential listing or pricing issues.",
            "RESIDUAL_ANOMALY":  "Investigate demand deviation against operational baseline. Check for data quality issues or one-off events.",
            "VOLATILITY_ANOMALY":"Review recent order patterns and supply chain disruptions. Consider adjusting safety-stock buffers.",
            "STOCKOUT_SUSPECTED":"Immediately audit stock levels. Verify replenishment orders and supplier lead times.",
            "DEAD_STOCK":        "Review slow-moving inventory. Consider markdowns, liquidation, or redistribution to high-demand markets.",
        }.get(atype, "Investigate demand deviation against operational baseline.")

    # ------------------------------------------------------------------
    # 10. PIPELINE
    # ------------------------------------------------------------------
    def run_pipeline(
        self,
        forecast_path: Optional[Path] = None,
        sku_class_path: Optional[Path] = None,
    ) -> Dict[str, Any]:
        logger.info("=" * 70)
        logger.info("STARTING HYBRID ANOMALY DETECTION ENGINE — Phase 4")
        logger.info("=" * 70)

        df_fc, df_sku = self.load_data(forecast_path, sku_class_path)
        df            = self.prepare_series(df_fc, df_sku)
        df            = self.detect_modified_zscore(df)
        df            = self.detect_isolation_forest(df)

        records  = self.classify_smooth_anomalies(df)
        records += self.detect_intermittent_anomalies(df)
        records += self.detect_dead_stock(df)

        logger.info(f"Total anomaly records (pre-dedup): {len(records):,}")

        if not records:
            logger.warning("No anomalies detected.")
            pd.DataFrame().to_csv(self.output_csv, index=False)
            self.stats["total_anomalies_detected"] = 0
            return self.stats

        out = pd.DataFrame(records)
        out["severity"]            = out.apply(lambda r: self.assign_severity(r.to_dict()), axis=1)
        out["confidence"]          = out["anomaly_score"].clip(0.0, 1.0).round(4)
        out["action_recommendation"] = out["anomaly_type"].map(self.get_recommendation)

        self._export(out)
        self._collect_stats(out)

        for k, v in self.stats.items():
            logger.info(f"  {k}: {v}")
        return self.stats

    def _export(self, df: pd.DataFrame) -> Path:
        self.output_csv.parent.mkdir(parents=True, exist_ok=True)
        out = df.copy()
        out["date_"] = out["date_"].apply(
            lambda d: d.strftime("%Y-%m-%d") if pd.notnull(d) else "")
        out["actual_demand"]   = out["actual_demand"].round(2)
        out["expected_demand"] = out["expected_demand"].round(2)
        out["anomaly_score"]   = out["anomaly_score"].round(4)

        sev_map = {"CRITICAL":0,"MEDIUM":1,"LOW":2}
        out["_r"] = out["severity"].map(sev_map).fillna(3)
        out = out.sort_values(["_r","date_","product_id"], ascending=[True,False,True]).drop(columns=["_r"])

        before = len(out)
        out = out.drop_duplicates(subset=["date_","product_id","city_name","anomaly_type"], keep="first")
        if before > len(out):
            logger.warning(f"Dropped {before-len(out)} duplicate records.")

        cols = [
            "anomaly_id","date_","product_id","city_name",
            "actual_demand","expected_demand","anomaly_score",
            "anomaly_type","severity","confidence","detection_method",
            "sbc_class","explanation","action_recommendation",
            "modified_z_score","z_score","residual","rolling_volatility",
        ]
        for c in cols:
            if c not in out:
                out[c] = ""
        out[cols].to_csv(self.output_csv, index=False)
        logger.info(f"Exported {len(out):,} anomalies -> {self.output_csv}")
        return self.output_csv

    def _collect_stats(self, df: pd.DataFrame):
        tc = df["anomaly_type"].value_counts().to_dict()
        sc = df["severity"].value_counts().to_dict()
        self.stats.update({
            "total_anomalies_detected": len(df),
            "DEMAND_SPIKE":      int(tc.get("DEMAND_SPIKE", 0)),
            "DEMAND_DROP":       int(tc.get("DEMAND_DROP", 0)),
            "RESIDUAL_ANOMALY":  int(tc.get("RESIDUAL_ANOMALY", 0)),
            "VOLATILITY_ANOMALY":int(tc.get("VOLATILITY_ANOMALY", 0)),
            "STOCKOUT_SUSPECTED":int(tc.get("STOCKOUT_SUSPECTED", 0)),
            "DEAD_STOCK":        int(tc.get("DEAD_STOCK", 0)),
            "severity_CRITICAL": int(sc.get("CRITICAL", 0)),
            "severity_MEDIUM":   int(sc.get("MEDIUM", 0)),
            "severity_LOW":      int(sc.get("LOW", 0)),
        })


def run():
    detector = DemandAnomalyDetector()
    return detector.run_pipeline()


if __name__ == "__main__":
    run()
