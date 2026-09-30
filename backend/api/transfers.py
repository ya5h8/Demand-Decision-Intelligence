"""
backend/api/transfers.py
------------------------
API routes for Inter-City Inventory Transfers (Prompt 4.5).
- Opportunity scanning (surplus vs deficit, time advantage, cost comparison)
- Source ROP safety invariant enforcement
- Interactive map visualization endpoints
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db.session import get_db, enforce_writable_db
from backend.core.deps import get_current_user, require_role, get_current_user_or_guest
from backend.models.user import User
from backend.models.transfer import Location, TransferLane, TransferOrder, TransferOrderLine
from backend.services.transfer_optimizer import find_transfer_opportunities, ensure_default_locations_and_lanes
from backend.services.dataset_service import resolve_dataset

router = APIRouter(prefix="/transfers", tags=["Inter-City Transfers"])


class TransferLineCreate(BaseModel):
    product_id: str
    quantity: int
    reason: Optional[str] = "REPLENISH_DEFICIT"


class CreateTransferOrderRequest(BaseModel):
    dataset_id: int = 1
    from_city: str
    to_city: str
    lines: List[TransferLineCreate]


@router.get("/opportunities")
def get_transfer_opportunities(
    dataset_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """
    Scans network for inter-city transfer opportunities where moving surplus
    stock is cheaper and faster than supplier purchase, while strictly protecting source ROP.
    """
    target_ds = resolve_dataset(db, current_user, dataset_id)
    eff_dataset_id = target_ds.id if target_ds else 1
    return find_transfer_opportunities(dataset_id=eff_dataset_id, db=db)


@router.get("/locations")
def list_locations(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """Lists logistics nodes with coordinates for map rendering."""
    ensure_default_locations_and_lanes(db)
    locs = db.query(Location).filter(Location.is_active == True).all()
    return {
        "locations": [
            {
                "id": l.id,
                "city_name": l.city_name,
                "location_type": l.location_type,
                "lat": l.lat,
                "lng": l.lng,
                "address": l.address
            }
            for l in locs
        ]
    }


@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_transfer_order(
    payload: CreateTransferOrderRequest,
    db: Session = Depends(get_db),
    _write_guard: None = Depends(enforce_writable_db),
    current_user: Optional[User] = Depends(require_role(["admin", "manager"])),
):
    """Creates a confirmed transfer order between two facilities."""
    from_loc = db.query(Location).filter(Location.city_name == payload.from_city).first()
    to_loc = db.query(Location).filter(Location.city_name == payload.to_city).first()

    if not from_loc or not to_loc:
        raise HTTPException(status_code=400, detail="Invalid origin or destination city")

    now = datetime.now(timezone.utc)
    order = TransferOrder(
        dataset_id=payload.dataset_id,
        from_location_id=from_loc.id,
        to_location_id=to_loc.id,
        status="approved",
        created_at=now,
        expected_arrival=now + timedelta(days=2),
        total_cost=sum(l.quantity * 2.0 for l in payload.lines) + 150.0
    )
    db.add(order)
    db.flush()

    for l in payload.lines:
        line = TransferOrderLine(
            transfer_order_id=order.id,
            product_id=l.product_id,
            quantity=l.quantity,
            reason=l.reason
        )
        db.add(line)

    db.commit()
    return {
        "status": "created",
        "order_status": order.status,
        "transfer_order_id": order.id,
        "from_city": payload.from_city,
        "to_city": payload.to_city,
        "expected_arrival": order.expected_arrival.isoformat()
    }
