"""
backend/services/daily_demand_sync.py
------------------------------------
Service for synchronizing aggregated daily demand time series from CSV into PostgreSQL.
Provides idempotent batch upsert with row-level validation and foreign key integrity.
"""

import csv
import logging
import time
from datetime import datetime, date
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from backend.db.session import SessionLocal
from backend.models.demand import DailyProductDemand
from backend.models.product import Product

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DEMAND_CSV = PROJECT_ROOT / "dataset" / "processed" / "daily_product_demand.csv"


def sync_daily_demand(
    csv_path: Optional[Path] = None,
    db: Optional[Session] = None,
    batch_size: int = 5000,
) -> Dict[str, Any]:
    """
    Reads the processed daily demand CSV, validates every row, and performs an
    idempotent batch upsert into the PostgreSQL `daily_product_demand` table.
    
    Returns a synchronization report with metrics.
    """
    t0 = time.time()
    source_file = csv_path or DEFAULT_DEMAND_CSV

    # 1. Verify CSV existence; generate via pipeline if missing
    if not source_file.exists():
        logger.info(f"Daily demand CSV not found at {source_file}. Triggering generation...")
        from forecasting.build_daily_demand_data import build_daily_demand
        build_daily_demand()
        if not source_file.exists():
            return {
                "status": "error",
                "total_rows": 0,
                "inserted": 0,
                "updated": 0,
                "skipped": 0,
                "failed": 0,
                "errors": [f"Source CSV file not found: {source_file}"],
                "duration_seconds": round(time.time() - t0, 3),
                "message": f"Failed to locate or generate source CSV at {source_file}",
            }

    owns_session = False
    if db is None:
        db = SessionLocal()
        owns_session = True

    try:
        # 2. Cache valid product_ids from database to guarantee foreign key integrity
        logger.info("Fetching valid product_ids from database catalog...")
        valid_product_ids: Set[int] = set(
            pid[0] for pid in db.query(Product.product_id).all()
        )
        logger.info(f"Cached {len(valid_product_ids):,} valid product_ids.")

        # 3. Cache existing (date_, product_id, city_name) unique keys to track inserted vs updated
        logger.info("Fetching existing daily_product_demand keys...")
        existing_keys: Set[Tuple[date, int, str]] = set(
            db.query(
                DailyProductDemand.date_,
                DailyProductDemand.product_id,
                DailyProductDemand.city_name,
            ).all()
        )
        logger.info(f"Found {len(existing_keys):,} existing daily demand records in database.")

        total_rows = 0
        inserted_count = 0
        updated_count = 0
        skipped_count = 0
        failed_count = 0
        error_log: List[str] = []

        batch_records: List[Dict[str, Any]] = []

        def flush_batch(records: List[Dict[str, Any]]) -> None:
            if not records:
                return
            stmt = insert(DailyProductDemand).values(records)
            stmt = stmt.on_conflict_do_update(
                constraint="uq_daily_demand_date_product_city",
                set_={
                    "total_quantity": stmt.excluded.total_quantity,
                    "total_sales_value": stmt.excluded.total_sales_value,
                    "total_discount_value": stmt.excluded.total_discount_value,
                    "avg_unit_price": stmt.excluded.avg_unit_price,
                    "order_count": stmt.excluded.order_count,
                },
            )
            db.execute(stmt)

        # 4. Stream and validate CSV rows
        with open(source_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row_idx, row in enumerate(reader, start=2):
                total_rows += 1

                # Parse & validate date_
                raw_date = row.get("date_", "").strip()
                if not raw_date:
                    failed_count += 1
                    if len(error_log) < 20:
                        error_log.append(f"Row {row_idx}: Missing date_ field")
                    continue
                try:
                    parsed_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
                except ValueError:
                    failed_count += 1
                    if len(error_log) < 20:
                        error_log.append(f"Row {row_idx}: Invalid date format '{raw_date}' (expected YYYY-MM-DD)")
                    continue

                # Parse & validate product_id
                raw_pid = row.get("product_id", "").strip()
                try:
                    pid = int(float(raw_pid))
                except (ValueError, TypeError):
                    failed_count += 1
                    if len(error_log) < 20:
                        error_log.append(f"Row {row_idx}: Invalid non-integer product_id '{raw_pid}'")
                    continue

                if pid not in valid_product_ids:
                    skipped_count += 1
                    if len(error_log) < 20:
                        error_log.append(
                            f"Row {row_idx}: product_id {pid} not found in product master (skipped for FK integrity)"
                        )
                    continue

                # Parse & validate city_name
                city = row.get("city_name", "").strip() or "ALL"

                # Parse & validate daily_quantity
                try:
                    qty = float(row.get("daily_quantity", 0.0) or 0.0)
                    if qty < 0:
                        qty = 0.0
                except (ValueError, TypeError):
                    failed_count += 1
                    if len(error_log) < 20:
                        error_log.append(f"Row {row_idx}: Invalid numeric quantity '{row.get('daily_quantity')}'")
                    continue

                # Parse & validate daily_revenue / total_sales_value
                try:
                    rev = float(row.get("daily_revenue", 0.0) or 0.0)
                    if rev < 0:
                        rev = 0.0
                except (ValueError, TypeError):
                    failed_count += 1
                    if len(error_log) < 20:
                        error_log.append(f"Row {row_idx}: Invalid numeric revenue '{row.get('daily_revenue')}'")
                    continue

                # Parse & validate order_count
                try:
                    orders = int(float(row.get("order_count", 0) or 0))
                    if orders < 0:
                        orders = 0
                except (ValueError, TypeError):
                    failed_count += 1
                    if len(error_log) < 20:
                        error_log.append(f"Row {row_idx}: Invalid numeric order_count '{row.get('order_count')}'")
                    continue

                # Compute avg_unit_price
                avg_price = round(rev / qty, 2) if qty > 0 else 0.0

                record_key = (parsed_date, pid, city)
                if record_key in existing_keys:
                    updated_count += 1
                else:
                    inserted_count += 1
                    existing_keys.add(record_key)

                batch_records.append({
                    "date_": parsed_date,
                    "product_id": pid,
                    "city_name": city,
                    "total_quantity": qty,
                    "total_sales_value": rev,
                    "total_discount_value": 0.0,
                    "avg_unit_price": avg_price,
                    "order_count": orders,
                })

                if len(batch_records) >= batch_size:
                    flush_batch(batch_records)
                    batch_records.clear()

            # Flush final batch
            if batch_records:
                flush_batch(batch_records)
                batch_records.clear()

        db.commit()
        duration = round(time.time() - t0, 3)

        report = {
            "status": "success",
            "total_rows": total_rows,
            "inserted": inserted_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "errors": error_log[:20],
            "duration_seconds": duration,
            "message": (
                f"Successfully synchronized {inserted_count + updated_count:,} daily demand records "
                f"({inserted_count:,} inserted, {updated_count:,} updated, {skipped_count:,} skipped, {failed_count:,} failed) "
                f"in {duration}s."
            ),
        }
        logger.info(report["message"])
        return report

    except Exception as e:
        db.rollback()
        logger.error(f"Error during daily demand sync: {e}", exc_info=True)
        return {
            "status": "error",
            "total_rows": total_rows if "total_rows" in locals() else 0,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "failed": 0,
            "errors": [str(e)],
            "duration_seconds": round(time.time() - t0, 3),
            "message": f"Database transaction failed: {str(e)}",
        }
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    import json
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    print("=" * 70)
    print("STARTING DAILY DEMAND DATABASE SYNCHRONIZATION")
    print("=" * 70)
    res = sync_daily_demand()
    print("\nSYNC RESULT:")
    print(json.dumps(res, indent=2))
