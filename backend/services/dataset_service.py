import os
import logging
from contextvars import ContextVar
from typing import Optional
from sqlalchemy import event
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.db.session import engine
from backend.models.dataset import Dataset
from backend.models.user import User

logger = logging.getLogger(__name__)

# Context variable to optionally allow unscoped queries for migrations/admin tasks
bypass_scoping_check: ContextVar[bool] = ContextVar("bypass_scoping_check", default=False)

SCOPED_TABLE_NAMES = {
    "daily_product_demand",
    "forecast_runs",
    "forecasts",
    "inventory_recommendations",
    "anomalies",
    "sales",
}


def resolve_dataset(
    db: Session,
    user: Optional[User] = None,
    dataset_id: Optional[int] = None
) -> Dataset:
    """
    Resolves the dataset to operate on in prioritized order (Prompt Fix 2):
    1. Explicitly requested dataset_id (if provided).
    2. Caller user's active dataset (if user provided and user.active_dataset_id is set).
    3. Caller user's most recent active dataset (if user provided and has datasets).
    4. System active/default upload target (Dataset.is_default_upload_target == True).
    5. Latest active non-demo/non-seed dataset (Dataset.is_active == True, name != 'Demo Data', source != 'seed').
    6. Seed/Demo Data dataset fallback (only if genuinely nothing else exists), marked clearly with is_demo=True.
    """
    # 1. Explicitly requested dataset_id
    if dataset_id is not None and not hasattr(dataset_id, "default"):
        try:
            ds_int = int(dataset_id)
            dataset = db.query(Dataset).filter(
                Dataset.id == ds_int,
                Dataset.is_active == True
            ).first()
            if not dataset:
                dataset = db.query(Dataset).filter(
                    Dataset.is_active == True
                ).order_by(Dataset.is_default_upload_target.desc(), Dataset.id.desc()).first()
            if not dataset:
                raise HTTPException(status_code=404, detail=f"Dataset with id {dataset_id} not found or inactive.")
            dataset.is_demo = bool(dataset.name == "Demo Data" or dataset.source == "seed")
            return dataset
        except (ValueError, TypeError):
            pass

    # 2. Caller user's active dataset
    if user is not None and getattr(user, "id", None) is not None:
        if getattr(user, "active_dataset_id", None):
            user_active = db.query(Dataset).filter(
                Dataset.id == user.active_dataset_id,
                Dataset.is_active == True
            ).first()
            if user_active:
                user_active.is_demo = False
                return user_active

        user_dataset = db.query(Dataset).filter(
            Dataset.user_id == user.id,
            Dataset.is_active == True
        ).order_by(Dataset.id.desc()).first()
        if user_dataset:
            user_dataset.is_demo = False
            return user_dataset

    # 3. System default upload target
    default_target = db.query(Dataset).filter(
        Dataset.is_default_upload_target == True,
        Dataset.is_active == True
    ).order_by(Dataset.id.desc()).first()
    if default_target:
        default_target.is_demo = False
        return default_target

    # 4. Latest active non-demo dataset with real rows or source != 'seed'
    real_dataset = db.query(Dataset).filter(
        Dataset.is_active == True,
        Dataset.name != "Demo Data",
        Dataset.source != "seed"
    ).order_by(Dataset.id.desc()).first()
    if real_dataset:
        real_dataset.is_demo = False
        return real_dataset

    # 5. Fallback only if genuinely nothing else exists: seed/Demo Data
    demo_dataset = db.query(Dataset).filter(
        Dataset.name == "Demo Data",
        Dataset.is_active == True
    ).first()

    if not demo_dataset:
        demo_dataset = db.query(Dataset).filter(
            Dataset.source == "seed",
            Dataset.is_active == True
        ).first()

    if not demo_dataset:
        demo_dataset = Dataset(
            name="Demo Data",
            source="seed",
            is_active=True,
            row_count=0
        )
        db.add(demo_dataset)
        db.commit()
        db.refresh(demo_dataset)

    demo_dataset.is_demo = True
    return demo_dataset


def check_demo_dataset_integrity(db: Session, max_seed_rows: int = 100) -> dict:
    """
    Startup and health check warning loudly (log + admin-visible flag)
    if the default demo dataset (Dataset 1) ever has more than a small seed row count added
    to it — which indicates something is still accidentally writing to it (Prompt Fix 2.3).
    """
    from backend.models.demand import DailyProductDemand
    demo_ds = db.query(Dataset).filter(Dataset.id == 1).first()
    if not demo_ds:
        return {"status": "ok", "warning": None, "demo_dataset_rows": 0, "accidental_write_suspected": False}

    demand_count = db.query(DailyProductDemand).filter(DailyProductDemand.dataset_id == 1).count()
    if demand_count > max_seed_rows:
        msg = (
            f"CRITICAL WARNING: Default Demo Dataset (Dataset 1) contains {demand_count} rows, "
            f"exceeding expected threshold ({max_seed_rows}). Something is accidentally writing to Dataset 1!"
        )
        logger.error(msg)
        return {
            "status": "warning",
            "warning": msg,
            "demo_dataset_rows": demand_count,
            "accidental_write_suspected": True,
        }
    return {
        "status": "ok",
        "warning": None,
        "demo_dataset_rows": demand_count,
        "accidental_write_suspected": False,
    }


def install_query_scoping_guard():
    """
    SQLAlchemy event listener guard that ensures any SELECT query
    touching scoped tables includes a dataset_id filter.
    Fails loudly in dev/test, logs alert in production.
    """
    @event.listens_for(engine, "before_cursor_execute", retval=False)
    def check_query_dataset_scoping(conn, cursor, statement, parameters, context, executemany):
        if bypass_scoping_check.get():
            return

        stmt_str = str(statement).strip()
        stmt_upper = stmt_str.upper()

        if not stmt_upper.startswith("SELECT"):
            return

        stmt_lower = stmt_str.lower()
        # Skip introspection, alembic, and internal sqlite/postgres metadata
        if any(meta in stmt_lower for meta in ("information_schema", "pg_catalog", "alembic_version", "sqlite_master")):
            return

        for tbl in SCOPED_TABLE_NAMES:
            if f"from {tbl}" in stmt_lower or f"join {tbl}" in stmt_lower:
                if "dataset_id" not in stmt_lower:
                    err_msg = (
                        f"[DATASET SCOPING GUARD VIOLATION] Query against scoped table '{tbl}' "
                        f"lacks a dataset_id filter!\nSQL: {statement}"
                    )
                    env = os.getenv("APP_ENV", "development").lower()
                    if env in ("development", "dev", "test"):
                        raise RuntimeError(err_msg)
                    else:
                        logger.error(err_msg)


# Initialize guard
install_query_scoping_guard()
