"""
tests/test_anomaly_detection.py

Deterministic unit tests for the Phase-4 hybrid anomaly detection engine.

Tests:
  1.  Normal demand (no anomalies expected)
  2.  Demand spike (Modified Z-Score)
  3.  Demand drop (Modified Z-Score)
  4.  Modified Z-Score calculation
  5.  Isolation Forest (deterministic with seed=42)
  6.  Intermittent demand spike (99th percentile)
  7.  Lumpy demand spike
  8.  Stockout silence (inter-arrival gap)
  9.  Dead stock (60+ consecutive zeros, 90+ history)
  10. Missing/NaN values gracefully handled
  11. Insufficient history (< 7 days) → no Modified Z-Score flags
  12. Explanation generation (non-empty, contains actual values)
  13. API response structure validation
  14. Isolation Forest determinism (same seed → same labels)
"""

import sys
import uuid
import pytest
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import date, timedelta
from unittest.mock import patch, MagicMock

# Ensure project root is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from analytics.anomaly_detection_engine import (
    DemandAnomalyDetector,
    MAD_FLOOR_ABS,
    MAD_FLOOR_FRAC,
    MODIFIED_Z_THRESHOLD,
    DEAD_STOCK_ZERO_DAYS,
    DEAD_STOCK_MIN_HIST,
    INTERMITTENT_PCT,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_forecast_df(n_days: int = 120, pid: str = "1", city: str = "Delhi",
                     base_demand: float = 100.0, noise_std: float = 5.0,
                     cat: str = "Smooth") -> pd.DataFrame:
    """Build a synthetic forecast_results-like DataFrame."""
    rng   = np.random.default_rng(42)
    dates = [date(2022, 1, 1) + timedelta(days=i) for i in range(n_days)]
    qty   = np.clip(base_demand + rng.normal(0, noise_std, n_days), 0, None)
    return pd.DataFrame({
        "date_":         [str(d) for d in dates],
        "product_id":    pid,
        "city_name":     city,
        "daily_quantity": qty,
        "pred_hybrid":    qty * 0.95,          # close forecast
    })


def make_sku_df(pid: str = "1", city: str = "Delhi", cat: str = "Smooth") -> pd.DataFrame:
    return pd.DataFrame({
        "product_id":     [pid],
        "city_name":      [city],
        "demand_category":[cat],
    })


def build_detector() -> DemandAnomalyDetector:
    return DemandAnomalyDetector(
        project_root=PROJECT_ROOT,
        contamination=0.03,
        z_threshold=MODIFIED_Z_THRESHOLD,
        rolling_window=14,
        min_history_days=7,
        random_state=42,
        expected_demand_col="pred_hybrid",
    )


# ---------------------------------------------------------------------------
# 1. Normal demand — no anomalies
# ---------------------------------------------------------------------------
class TestNormalDemand:
    def test_no_anomalies_for_stable_series(self):
        """A perfectly stable demand series should not trigger Z-Score flags."""
        det = build_detector()
        df_fc  = make_forecast_df(n_days=60, noise_std=1.0)
        df_sku = make_sku_df()
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        # With tiny noise the vast majority must be clean
        flagged = df["is_mz_anomaly"].sum()
        assert flagged <= 2, f"Expected ≤2 flags for stable demand, got {flagged}"


# ---------------------------------------------------------------------------
# 2. Demand Spike (Z-Score)
# ---------------------------------------------------------------------------
class TestDemandSpike:
    def test_spike_is_detected(self):
        det = build_detector()
        df_fc  = make_forecast_df(n_days=60, base_demand=100.0, noise_std=3.0)
        df_sku = make_sku_df()

        # Inject a huge spike on day 50
        df_fc = df_fc.copy()
        df_fc.loc[50, "daily_quantity"] = 800.0

        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        spike_row = df.iloc[50]
        assert spike_row["is_mz_anomaly"], "Day 50 spike should be flagged"
        assert spike_row["modified_z_score"] > MODIFIED_Z_THRESHOLD

    def test_spike_classified_as_demand_spike(self):
        det = build_detector()
        df_fc  = make_forecast_df(n_days=60, base_demand=100.0, noise_std=3.0)
        df_sku = make_sku_df()
        df_fc  = df_fc.copy()
        df_fc.loc[50, "daily_quantity"] = 800.0
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        records = det.classify_smooth_anomalies(df)
        types = [r["anomaly_type"] for r in records]
        assert "DEMAND_SPIKE" in types, f"Expected DEMAND_SPIKE in {set(types)}"


# ---------------------------------------------------------------------------
# 3. Demand Drop (Z-Score)
# ---------------------------------------------------------------------------
class TestDemandDrop:
    def test_drop_is_detected(self):
        det = build_detector()
        df_fc  = make_forecast_df(n_days=60, base_demand=100.0, noise_std=3.0)
        df_sku = make_sku_df()
        df_fc  = df_fc.copy()
        df_fc.loc[50, "daily_quantity"] = 0.0
        df_fc.loc[50, "pred_hybrid"]    = 100.0
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        assert df.iloc[50]["is_mz_anomaly"], "Day 50 drop should be flagged"
        assert df.iloc[50]["modified_z_score"] < -MODIFIED_Z_THRESHOLD

    def test_drop_classified_as_demand_drop(self):
        det = build_detector()
        df_fc  = make_forecast_df(n_days=60, base_demand=100.0, noise_std=3.0)
        df_sku = make_sku_df()
        df_fc  = df_fc.copy()
        df_fc.loc[50, "daily_quantity"] = 0.0
        df_fc.loc[50, "pred_hybrid"]    = 100.0
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        records = det.classify_smooth_anomalies(df)
        types = [r["anomaly_type"] for r in records]
        assert "DEMAND_DROP" in types or "RESIDUAL_ANOMALY" in types, \
            f"Expected DEMAND_DROP or RESIDUAL_ANOMALY, got {set(types)}"


# ---------------------------------------------------------------------------
# 4. Modified Z-Score calculation
# ---------------------------------------------------------------------------
class TestModifiedZScore:
    def test_mad_floor_applied(self):
        """MAD floor must be max(MAD, 1.0, 0.1*median)."""
        det = build_detector()
        # Constant series → raw MAD = 0 → floor must kick in
        df_fc = pd.DataFrame({
            "date_":         [str(date(2022, 1, 1) + timedelta(days=i)) for i in range(30)],
            "product_id":    "99",
            "city_name":     "TestCity",
            "daily_quantity": [50.0] * 30,
            "pred_hybrid":    [50.0] * 30,
        })
        df_sku = make_sku_df(pid="99", city="TestCity")
        df = det.prepare_series(df_fc, df_sku)
        assert (df["rolling_mad_14"] >= MAD_FLOOR_ABS).all(), "MAD floor not applied"

    def test_zscore_zero_for_median_value(self):
        """When actual == median, Modified Z-Score should be 0."""
        det = build_detector()
        df_fc  = make_forecast_df(n_days=30, base_demand=100.0, noise_std=0.0)
        df_sku = make_sku_df()
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        # Rows with enough history and no deviation should have ~0 MZ
        valid = df[df["history_count"] >= 7]
        # Most should be ~0 for constant demand
        near_zero = (valid["modified_z_score"].abs() < 0.5).sum()
        assert near_zero > len(valid) * 0.7, "Most Z-scores should be near 0 for stable demand"

    def test_zscore_positive_for_spike(self):
        det = build_detector()
        df_fc  = make_forecast_df(n_days=60, base_demand=50.0, noise_std=2.0)
        df_sku = make_sku_df()
        df_fc  = df_fc.copy()
        df_fc.loc[55, "daily_quantity"] = 500.0
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        assert df.iloc[55]["modified_z_score"] > 0, "Spike should produce positive MZ"

    def test_zscore_negative_for_drop(self):
        det = build_detector()
        df_fc  = make_forecast_df(n_days=60, base_demand=100.0, noise_std=2.0)
        df_sku = make_sku_df()
        df_fc  = df_fc.copy()
        df_fc.loc[55, "daily_quantity"] = 0.0
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        assert df.iloc[55]["modified_z_score"] <= 0, "Drop should produce non-positive MZ"


# ---------------------------------------------------------------------------
# 5. Isolation Forest
# ---------------------------------------------------------------------------
class TestIsolationForest:
    def test_iso_model_is_fitted(self):
        det = build_detector()
        df_fc  = make_forecast_df(n_days=60)
        df_sku = make_sku_df()
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        assert det.iso_model is not None, "Isolation Forest model should be fitted"

    def test_anomaly_score_in_range(self):
        det = build_detector()
        df_fc  = make_forecast_df(n_days=60)
        df_sku = make_sku_df()
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        assert df["anomaly_score"].between(0.0, 1.0).all(), "Scores must be in [0,1]"

    def test_contamination_ratio(self):
        """~3% of records should be flagged by Isolation Forest."""
        det = build_detector()
        df_fc  = make_forecast_df(n_days=200, noise_std=5.0)
        df_sku = make_sku_df()
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        frac = df["is_isolation_anomaly"].mean()
        # contamination=0.03 → expect ~3% flagged
        assert 0.01 <= frac <= 0.08, f"Isolation Forest flagged {frac:.2%}, expected ~3%"


# ---------------------------------------------------------------------------
# 6. Intermittent demand spike
# ---------------------------------------------------------------------------
class TestIntermittentDemand:
    def _make_intermittent_df(self, pid="5", city="Mumbai"):
        """90 days, mostly zeros, occasional spikes."""
        rng   = np.random.default_rng(0)
        qty   = np.zeros(90)
        # Non-zero on 20 days
        nz_idx = rng.choice(90, 20, replace=False)
        qty[nz_idx] = rng.integers(10, 80, 20).astype(float)
        # Inject a mega spike beyond 99th pct
        qty[80] = 5000.0
        dates = [str(date(2022, 1, 1) + timedelta(days=i)) for i in range(90)]
        return pd.DataFrame({
            "date_":          dates,
            "product_id":     pid,
            "city_name":      city,
            "daily_quantity": qty,
            "pred_hybrid":    qty * 0.9,
        })

    def test_intermittent_spike_detected(self):
        det = build_detector()
        df_fc  = self._make_intermittent_df()
        df_sku = make_sku_df(pid="5", city="Mumbai", cat="Intermittent")
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        records = det.detect_intermittent_anomalies(df)
        spikes  = [r for r in records if r["anomaly_type"] == "DEMAND_SPIKE"]
        assert len(spikes) >= 1, "Should detect at least 1 intermittent spike"

    def test_intermittent_spike_explanation_contains_percentile(self):
        det = build_detector()
        df_fc  = self._make_intermittent_df()
        df_sku = make_sku_df(pid="5", city="Mumbai", cat="Intermittent")
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        records = det.detect_intermittent_anomalies(df)
        for r in records:
            if r["anomaly_type"] == "DEMAND_SPIKE":
                assert "99th percentile" in r["explanation"], \
                    "Intermittent spike explanation must reference percentile"
                break


# ---------------------------------------------------------------------------
# 7. Lumpy demand spike
# ---------------------------------------------------------------------------
class TestLumpyDemand:
    def _make_lumpy_df(self):
        qty = np.zeros(90)
        qty[::7] = np.array([200, 250, 300, 280, 220, 260, 310, 240, 290, 270, 230, 260, 5000])
        dates = [str(date(2022, 1, 1) + timedelta(days=i)) for i in range(90)]
        return pd.DataFrame({
            "date_":          dates,
            "product_id":     "6",
            "city_name":      "Delhi",
            "daily_quantity": qty,
            "pred_hybrid":    qty * 0.85,
        })

    def test_lumpy_spike_detected(self):
        det = build_detector()
        df_fc  = self._make_lumpy_df()
        df_sku = make_sku_df(pid="6", city="Delhi", cat="Lumpy")
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        records = det.detect_intermittent_anomalies(df)
        assert len(records) >= 1, "Should detect anomaly in lumpy demand"


# ---------------------------------------------------------------------------
# 8. Stockout silence (inter-arrival gap)
# ---------------------------------------------------------------------------
class TestStockoutSilence:
    def _make_stockout_df(self):
        """Normal demand, then a very long gap of zeros."""
        qty = np.zeros(90)
        # Demand on days 0-29 roughly every 3 days
        for i in range(0, 30, 3):
            qty[i] = 50.0
        # Normal gaps of ~3 days → p99 ~3
        # Inject a 30-day silence at day 50
        # (days 50-79 all zero)
        qty[31] = 50.0  # last non-zero before silence
        # days 32-79 = 0 (48-day gap — clearly above p99 of ~3)
        qty[80] = 50.0
        dates = [str(date(2022, 1, 1) + timedelta(days=i)) for i in range(90)]
        return pd.DataFrame({
            "date_":          dates,
            "product_id":     "7",
            "city_name":      "HR-NCR",
            "daily_quantity": qty,
            "pred_hybrid":    qty,
        })

    def test_stockout_detected(self):
        det = build_detector()
        df_fc  = self._make_stockout_df()
        df_sku = make_sku_df(pid="7", city="HR-NCR", cat="Intermittent")
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        records = det.detect_intermittent_anomalies(df)
        stockouts = [r for r in records if r["anomaly_type"] == "STOCKOUT_SUSPECTED"]
        assert len(stockouts) >= 1, "Should detect at least one stockout"

    def test_stockout_explanation_contains_gap_info(self):
        det = build_detector()
        df_fc  = self._make_stockout_df()
        df_sku = make_sku_df(pid="7", city="HR-NCR", cat="Intermittent")
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        records = det.detect_intermittent_anomalies(df)
        for r in records:
            if r["anomaly_type"] == "STOCKOUT_SUSPECTED":
                expl = r["explanation"]
                assert "zero-demand interval" in expl, "Explanation must describe gap length"
                assert "99th percentile" in expl
                break


# ---------------------------------------------------------------------------
# 9. Dead Stock
# ---------------------------------------------------------------------------
class TestDeadStock:
    def _make_dead_stock_df(self, pid="8", city="Bengaluru", history_days=120, zero_start=40):
        qty = np.zeros(history_days)
        qty[:zero_start] = 50.0  # active for first 40 days
        # remaining 80 days are zero → > 60 consecutive zeros
        dates = [str(date(2022, 1, 1) + timedelta(days=i)) for i in range(history_days)]
        return pd.DataFrame({
            "date_":          dates,
            "product_id":     pid,
            "city_name":      city,
            "daily_quantity": qty,
            "pred_hybrid":    [50.0] * history_days,
        })

    def test_dead_stock_flagged_with_sufficient_history(self):
        det = build_detector()
        df_fc  = self._make_dead_stock_df()
        df_sku = make_sku_df(pid="8", city="Bengaluru")
        df = det.prepare_series(df_fc, df_sku)
        records = det.detect_dead_stock(df)
        assert len(records) >= 1, "Should detect dead stock with 80 consecutive zeros"
        assert all(r["anomaly_type"] == "DEAD_STOCK" for r in records)

    def test_dead_stock_not_flagged_with_insufficient_history(self):
        """Short dataset (<90 days) must NOT be flagged as dead stock."""
        det = build_detector()
        df_fc = pd.DataFrame({
            "date_":          [str(date(2022, 1, 1) + timedelta(days=i)) for i in range(50)],
            "product_id":     "9",
            "city_name":      "Mumbai",
            "daily_quantity": [0.0] * 50,
            "pred_hybrid":    [20.0] * 50,
        })
        df_sku = make_sku_df(pid="9", city="Mumbai")
        df = det.prepare_series(df_fc, df_sku)
        records = det.detect_dead_stock(df)
        assert len(records) == 0, "Short dataset must NOT be flagged as dead stock"

    def test_dead_stock_explanation_mentions_consecutive_days(self):
        det = build_detector()
        df_fc  = self._make_dead_stock_df()
        df_sku = make_sku_df(pid="8", city="Bengaluru")
        df = det.prepare_series(df_fc, df_sku)
        records = det.detect_dead_stock(df)
        for r in records:
            assert "consecutive" in r["explanation"].lower(), \
                "Dead-stock explanation must mention consecutive days"
            assert str(DEAD_STOCK_ZERO_DAYS) in r["explanation"], \
                "Dead-stock explanation must include the threshold day count"
            break


# ---------------------------------------------------------------------------
# 10. Missing values
# ---------------------------------------------------------------------------
class TestMissingValues:
    def test_nan_demand_handled_gracefully(self):
        det = build_detector()
        df_fc  = make_forecast_df(n_days=40)
        df_sku = make_sku_df()
        df_fc  = df_fc.copy()
        # Inject NaN
        df_fc.loc[[10, 20, 30], "daily_quantity"] = np.nan
        df = det.prepare_series(df_fc, df_sku)
        # Should not raise; NaN filled to 0
        assert not df["actual_demand"].isna().any(), "NaN demand must be filled"

    def test_missing_forecast_col_raises_helpful_error(self):
        det = build_detector()
        det.expected_demand_col = "nonexistent_col"
        # Remove all fallback columns
        df_fc = pd.DataFrame({
            "date_":          [str(date(2022,1,1))],
            "product_id":     "1",
            "city_name":      "Delhi",
            "daily_quantity": [100.0],
        })
        df_sku = make_sku_df()
        import tempfile, os
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / "reports").mkdir()
            fc_path = root / "reports" / "forecast_results.csv"
            sk_path = root / "reports" / "sku_demand_classification.csv"
            df_fc.to_csv(fc_path, index=False)
            df_sku.to_csv(sk_path, index=False)
            det2 = DemandAnomalyDetector(project_root=root)
            det2.expected_demand_col = "nonexistent"
            with pytest.raises(KeyError, match="No forecast column found"):
                det2.load_data(fc_path, sk_path)


# ---------------------------------------------------------------------------
# 11. Insufficient history
# ---------------------------------------------------------------------------
class TestInsufficientHistory:
    def test_no_mzscore_flags_without_history(self):
        """With only 5 days of data (< min_history_days=7), MZ should be 0."""
        det = build_detector()
        df_fc  = make_forecast_df(n_days=5, base_demand=100.0, noise_std=0.1)
        df_sku = make_sku_df()
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        # history_count < 7 → mz should be 0 → no flags
        no_hist = df[df["history_count"] < 7]
        assert (no_hist["modified_z_score"] == 0.0).all(), \
            "MZ must be 0 when history < min_history_days"
        assert not no_hist["is_mz_anomaly"].any(), \
            "No MZ anomalies should be flagged without sufficient history"


# ---------------------------------------------------------------------------
# 12. Explanation generation
# ---------------------------------------------------------------------------
class TestExplanationGeneration:
    def test_spike_explanation_contains_actual_values(self):
        det = build_detector()
        df_fc  = make_forecast_df(n_days=60, base_demand=100.0, noise_std=2.0)
        df_sku = make_sku_df()
        df_fc  = df_fc.copy()
        df_fc.loc[55, "daily_quantity"] = 900.0
        df = det.prepare_series(df_fc, df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        records = det.classify_smooth_anomalies(df)
        spikes = [r for r in records if r["anomaly_type"] == "DEMAND_SPIKE"]
        assert len(spikes) >= 1, "Need at least one spike for explanation test"
        expl = spikes[0]["explanation"]
        # Must not be empty
        assert len(expl) > 20, "Explanation must be non-trivial"
        # Must contain actual numeric evidence
        assert any(c.isdigit() for c in expl), "Explanation must contain actual values"

    def test_dead_stock_explanation_non_empty(self):
        det = build_detector()
        qty  = [50.0]*90 + [0.0]*70  # 90d history then 70d zeros
        dates = [str(date(2022,1,1)+timedelta(days=i)) for i in range(160)]
        df_fc = pd.DataFrame({
            "date_":          dates,
            "product_id":     "10",
            "city_name":      "Delhi",
            "daily_quantity": qty,
            "pred_hybrid":    [50.0]*160,
        })
        df_sku = make_sku_df(pid="10", city="Delhi")
        df = det.prepare_series(df_fc, df_sku)
        records = det.detect_dead_stock(df)
        assert records, "Expected dead stock records"
        for r in records:
            assert r["explanation"], "Explanation must not be empty"
            assert "Dead stock" in r["explanation"]

    def test_stockout_explanation_contains_gap_length(self):
        det = build_detector()
        qty = np.zeros(90)
        for i in range(0,30,3):
            qty[i] = 50.0
        qty[31] = 50.0
        qty[80] = 50.0
        dates = [str(date(2022,1,1)+timedelta(days=i)) for i in range(90)]
        df_fc = pd.DataFrame({
            "date_": dates, "product_id":"11","city_name":"HR-NCR",
            "daily_quantity":qty,"pred_hybrid":qty
        })
        df_sku = make_sku_df(pid="11",city="HR-NCR",cat="Intermittent")
        df = det.prepare_series(df_fc,df_sku)
        df = det.detect_modified_zscore(df)
        df = det.detect_isolation_forest(df)
        records = det.detect_intermittent_anomalies(df)
        for r in records:
            if r["anomaly_type"]=="STOCKOUT_SUSPECTED":
                assert "days" in r["explanation"].lower()
                break


# ---------------------------------------------------------------------------
# 13. API response structure
# ---------------------------------------------------------------------------
class TestAPIResponseStructure:
    """Validate the format_csv_record helper produces all required fields."""

    REQUIRED_FIELDS = [
        "anomaly_id","date_","product_id","city_name",
        "metric","actual_demand","expected_demand",
        "observed_value","expected_value","deviation",
        "anomaly_score","anomaly_type","severity","confidence",
        "detection_method","sbc_class","explanation",
        "action_recommendation","status",
    ]

    def _sample_csv_row(self):
        return {
            "anomaly_id":          str(uuid.uuid4()),
            "date_":               "2022-07-15",
            "product_id":          "42",
            "city_name":           "Delhi",
            "actual_demand":       250.0,
            "expected_demand":     100.0,
            "anomaly_score":       0.72,
            "anomaly_type":        "DEMAND_SPIKE",
            "severity":            "CRITICAL",
            "confidence":          0.72,
            "detection_method":    "modified_z_score",
            "sbc_class":           "Smooth",
            "explanation":         "Test explanation with value 250.0.",
            "action_recommendation": "Review inventory.",
            "modified_z_score":    4.2,
            "z_score":             4.2,
            "residual":            150.0,
            "rolling_volatility":  12.5,
        }

    def test_format_csv_record_has_all_fields(self):
        """Import and test _format_csv_record from analytics API."""
        from backend.api.analytics import _format_csv_record
        row = self._sample_csv_row()
        result = _format_csv_record(row)
        for field in self.REQUIRED_FIELDS:
            assert field in result, f"Missing field: {field}"

    def test_deviation_is_computed_correctly(self):
        from backend.api.analytics import _format_csv_record
        row = self._sample_csv_row()
        result = _format_csv_record(row)
        expected_dev = round(250.0 - 100.0, 2)
        assert result["deviation"] == expected_dev

    def test_status_is_open(self):
        from backend.api.analytics import _format_csv_record
        row = self._sample_csv_row()
        result = _format_csv_record(row)
        assert result["status"] == "OPEN"

    def test_anomaly_type_preserved(self):
        from backend.api.analytics import _format_csv_record
        row = self._sample_csv_row()
        result = _format_csv_record(row)
        assert result["anomaly_type"] == "DEMAND_SPIKE"


# ---------------------------------------------------------------------------
# 14. Isolation Forest determinism
# ---------------------------------------------------------------------------
class TestIsolationForestDeterminism:
    def test_same_seed_produces_same_labels(self):
        """Two runs with same seed must produce identical anomaly labels."""
        det1 = build_detector()
        det2 = build_detector()

        df_fc  = make_forecast_df(n_days=100, noise_std=10.0)
        df_sku = make_sku_df()

        df1 = det1.prepare_series(df_fc.copy(), df_sku.copy())
        df1 = det1.detect_modified_zscore(df1)
        df1 = det1.detect_isolation_forest(df1)

        df2 = det2.prepare_series(df_fc.copy(), df_sku.copy())
        df2 = det2.detect_modified_zscore(df2)
        df2 = det2.detect_isolation_forest(df2)

        assert (df1["is_isolation_anomaly"].values == df2["is_isolation_anomaly"].values).all(), \
            "Isolation Forest must be deterministic with same random_state=42"

    def test_different_seeds_may_differ(self):
        """Different seeds should produce potentially different results."""
        det1 = DemandAnomalyDetector(random_state=42)
        det2 = DemandAnomalyDetector(random_state=99)

        df_fc  = make_forecast_df(n_days=100, noise_std=15.0)
        df_sku = make_sku_df()

        df1 = det1.prepare_series(df_fc.copy(), df_sku.copy())
        df1 = det1.detect_modified_zscore(df1)
        df1 = det1.detect_isolation_forest(df1)

        df2 = det2.prepare_series(df_fc.copy(), df_sku.copy())
        df2 = det2.detect_modified_zscore(df2)
        df2 = det2.detect_isolation_forest(df2)

        # We don't assert they differ (may happen to agree on clean data)
        # Just assert both run without error
        assert "is_isolation_anomaly" in df1.columns
        assert "is_isolation_anomaly" in df2.columns
