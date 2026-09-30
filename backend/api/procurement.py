"""
backend/api/procurement.py
--------------------------
API routes for Purchase Orders, MOQ/pack-size rounding generation,
PDF export, CSV export, email dispatch, and Goods Receipt processing (Prompt 4.1).
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db.session import get_db, enforce_writable_db
from backend.core.deps import get_current_user, require_role, get_current_user_or_guest
from backend.models.user import User
from backend.models.procurement import PurchaseOrder, Supplier, SupplierProduct
from backend.services.procurement_service import (
    generate_draft_purchase_orders,
    generate_po_pdf,
    export_po_csv,
    send_po_email,
)
from backend.services.recommendation_lifecycle import process_goods_receipt_learning_loop
from backend.services.dataset_service import resolve_dataset

router = APIRouter(prefix="/purchase-orders", tags=["Procurement & Purchase Orders"])


class GeneratePORequest(BaseModel):
    dataset_id: Optional[int] = None
    recommendation_ids: Optional[List[int]] = None


class GoodsReceiptLineItem(BaseModel):
    po_line_id: int
    quantity: int
    condition_notes: Optional[str] = "Good"


class RecordReceiptRequest(BaseModel):
    lines: List[GoodsReceiptLineItem]
    notes: Optional[str] = None


class CreateDirectPORequest(BaseModel):
    product_id: str
    quantity: int
    product_name: Optional[str] = None
    unit_cost: Optional[float] = None
    notes: Optional[str] = None
    dataset_id: Optional[int] = None


@router.post("/create-direct", status_code=status.HTTP_201_CREATED)
def create_direct_po(
    payload: CreateDirectPORequest,
    db: Session = Depends(get_db),
    _write_guard: None = Depends(enforce_writable_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """
    Creates an immediate purchase order for a single product directly from SKU Detail Page.
    Returns complete order details and download URLs for PDF & Excel/CSV.
    """
    import json
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import func
    from backend.models.procurement import PurchaseOrder, PurchaseOrderLine, Supplier
    from backend.models.product import Product

    target_ds = resolve_dataset(db, current_user, payload.dataset_id)
    eff_dataset_id = target_ds.id if target_ds else 1

    pid = str(payload.product_id).strip()
    qty = max(1, int(payload.quantity))

    # Resolve product
    prod = db.query(Product).filter(Product.product_id == pid).first()
    resolved_name = payload.product_name or (prod.product_name if prod else f"Product #{pid}")

    # Resolve unit cost (approx. reasonable wholesale cost)
    unit_cost = payload.unit_cost
    if not unit_cost:
        unit_cost = 28.0
        if prod and hasattr(prod, 'unit_cost') and prod.unit_cost:
            unit_cost = float(prod.unit_cost)

    line_total = round(qty * float(unit_cost), 2)

    # Supplier
    supplier = db.query(Supplier).first()
    if not supplier:
        supplier = Supplier(
            name="Standard Wholesale Supply",
            contact_email="orders@standardwholesale.example.com",
            contact_phone="+91 98765 43210",
            address="Commercial Distribution Center",
            payment_terms_days=30,
            is_active=True
        )
        db.add(supplier)
        db.flush()

    now = datetime.now(timezone.utc)
    current_year = now.year
    max_id = db.query(func.max(PurchaseOrder.id)).scalar() or 0
    seq_num = max_id + 1
    po_number = f"PO-{current_year}-{seq_num:04d}"
    while db.query(PurchaseOrder).filter(PurchaseOrder.po_number == po_number).first():
        seq_num += 1
        po_number = f"PO-{current_year}-{seq_num:04d}"

    delivery_date = now + timedelta(days=7)

    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=supplier.id,
        dataset_id=eff_dataset_id,
        status="confirmed",
        total_value=line_total,
        currency="INR",
        expected_delivery_date=delivery_date,
        created_by=current_user.id if current_user else None,
        triggered_by="SKU_DETAIL_PAGE",
        notes=payload.notes or f"Direct order for {resolved_name}",
    )
    db.add(po)
    db.flush()

    po_line = PurchaseOrderLine(
        po_id=po.id,
        product_id=pid,
        quantity_ordered=qty,
        quantity_received=0,
        unit_cost=float(unit_cost),
        line_total=float(line_total),
        reason_code="RESTOCK_ORDER",
        context_data=json.dumps({
            "product_name": resolved_name,
            "quantity_ordered": qty,
            "unit_cost": unit_cost,
            "order_date": now.strftime("%Y-%m-%d"),
        })
    )
    db.add(po_line)
    db.commit()
    db.refresh(po)

    return {
        "status": "success",
        "message": f"Purchase Order {po.po_number} created successfully",
        "purchase_order": {
            "id": po.id,
            "po_number": po.po_number,
            "product_id": pid,
            "product_name": resolved_name,
            "quantity_ordered": qty,
            "unit_cost": float(unit_cost),
            "total_value": float(line_total),
            "currency": "INR",
            "created_at": po.created_at.strftime("%d %b %Y, %I:%M %p") if po.created_at else now.strftime("%d %b %Y"),
            "expected_delivery_date": delivery_date.strftime("%d %b %Y"),
            "status": "CONFIRMED",
            "pdf_url": f"/api/purchase-orders/{po.id}/pdf",
            "csv_url": f"/api/purchase-orders/{po.id}/csv",
        }
    }


@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_pos(
    payload: GeneratePORequest,
    db: Session = Depends(get_db),
    _write_guard: None = Depends(enforce_writable_db),
    current_user: Optional[User] = Depends(require_role(["admin", "manager"])),
):
    """
    Generates DRAFT POs grouped by preferred supplier with quantities
    rounded UP to order_multiple and floored at MOQ.
    """
    target_ds = resolve_dataset(db, current_user, payload.dataset_id)
    eff_dataset_id = target_ds.id if target_ds else 1

    user_id = current_user.id if current_user else None
    results = generate_draft_purchase_orders(
        dataset_id=eff_dataset_id,
        db=db,
        created_by_user_id=user_id,
        specific_recommendation_ids=payload.recommendation_ids
    )
    return {
        "status": "success",
        "created_orders_count": len(results),
        "purchase_orders": results
    }


@router.get("")
def list_purchase_orders(
    dataset_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """Lists purchase orders with supplier and line count information."""
    target_ds = resolve_dataset(db, current_user, dataset_id)
    eff_dataset_id = target_ds.id if target_ds else 1

    query = db.query(PurchaseOrder)
    if eff_dataset_id:
        query = query.filter(PurchaseOrder.dataset_id == eff_dataset_id)
    if status_filter:
        query = query.filter(PurchaseOrder.status == status_filter.lower())

    pos = query.order_by(PurchaseOrder.created_at.desc()).limit(100).all()
    results = []
    for po in pos:
        results.append({
            "id": po.id,
            "po_number": po.po_number,
            "supplier_id": po.supplier_id,
            "supplier_name": po.supplier.name if po.supplier else "N/A",
            "status": po.status,
            "total_value": po.total_value,
            "currency": po.currency,
            "created_at": po.created_at.isoformat() if po.created_at else None,
            "expected_delivery_date": po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
            "line_count": len(po.lines),
            "triggered_by": po.triggered_by,
            "notes": po.notes
        })
    return {"purchase_orders": results}


@router.get("/catalog-lead-times")
def list_catalog_lead_times(
    dataset_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """Lists SKUs with their supplier lead times, on-hand inventory, and configuration status."""
    from backend.models.product import Product
    from backend.models.inventory import InventoryState
    from backend.models.demand import DailyProductDemand
    from backend.services.dataset_service import resolve_dataset
    from sqlalchemy import func

    target_dataset = resolve_dataset(db, None, dataset_id)

    # Distinct product IDs from active dataset
    demand_pids = [
        r[0] for r in (
            db.query(DailyProductDemand.product_id)
            .filter(DailyProductDemand.dataset_id == target_dataset.id)
            .group_by(DailyProductDemand.product_id)
            .order_by(func.sum(DailyProductDemand.total_quantity).desc())
            .limit(limit)
            .all()
        ) if r[0]
    ]

    # Also include any product with an active SupplierProduct configuration
    configured_sp_pids = [
        r[0] for r in db.query(SupplierProduct.product_id).distinct().limit(limit).all() if r[0]
    ]

    all_pids = list(dict.fromkeys(configured_sp_pids + demand_pids))[:limit]
    products = db.query(Product).filter(Product.product_id.in_(all_pids)).all() if all_pids else []

    p_ids = [p.product_id for p in products]
    sp_list = db.query(SupplierProduct).filter(SupplierProduct.product_id.in_(p_ids)).all()
    sp_map = {sp.product_id: sp for sp in sp_list}

    inv_list = db.query(InventoryState).filter(
        InventoryState.dataset_id == target_dataset.id,
        InventoryState.product_id.in_(p_ids)
    ).all()
    inv_map = {inv.product_id: inv for inv in inv_list}

    results = []
    for p in products:
        sp = sp_map.get(p.product_id)
        inv = inv_map.get(p.product_id)
        lead_time = sp.promised_lead_time_days if sp else 7
        is_conf = bool(sp and sp.promised_lead_time_days)
        results.append({
            "product_id": p.product_id,
            "product_name": p.product_name,
            "category": p.l1_category or p.l0_category or "General",
            "supplier_id": sp.supplier_id if sp else None,
            "supplier_name": sp.supplier.name if (sp and sp.supplier) else "Primary Wholesale Distributor",
            "lead_time_days": lead_time,
            "is_configured": is_conf,
            "current_stock": float(inv.closing_stock) if inv and inv.closing_stock is not None else 0.0,
            "unit_cost": sp.unit_cost if sp else 10.0,
            "moq": sp.moq if sp else 1,
            "order_multiple": sp.order_multiple if sp else 1,
        })

    return {
        "status": "success",
        "dataset_id": target_dataset.id,
        "total": len(results),
        "catalog": results
    }


@router.get("/{po_id}")
def get_purchase_order_details(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """Retrieves single PO with full line items and reason codes."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    lines = []
    for l in po.lines:
        lines.append({
            "id": l.id,
            "product_id": l.product_id,
            "product_name": l.product.product_name if l.product else l.product_id,
            "quantity_ordered": l.quantity_ordered,
            "quantity_received": l.quantity_received,
            "unit_cost": l.unit_cost,
            "line_total": l.line_total,
            "reason_code": l.reason_code,
            "context_data": l.context_data
        })

    return {
        "id": po.id,
        "po_number": po.po_number,
        "supplier": {
            "id": po.supplier.id if po.supplier else None,
            "name": po.supplier.name if po.supplier else "N/A",
            "email": po.supplier.contact_email if po.supplier else None,
            "phone": po.supplier.contact_phone if po.supplier else None,
            "payment_terms_days": po.supplier.payment_terms_days if po.supplier else 30
        },
        "status": po.status,
        "total_value": po.total_value,
        "currency": po.currency,
        "created_at": po.created_at.isoformat() if po.created_at else None,
        "expected_delivery_date": po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
        "lines": lines
    }


@router.get("/{po_id}/pdf")
def download_po_pdf(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """Streams formatted ReportLab PDF for the Purchase Order."""
    pdf_bytes = generate_po_pdf(po_id, db)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=PO_{po_id}.pdf"}
    )


@router.get("/{po_id}/csv")
def download_po_csv(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_guest),
):
    """Exports Purchase Order lines in standard CSV format."""
    csv_str = export_po_csv(po_id, db)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=PO_{po_id}.csv"}
    )


@router.post("/{po_id}/email")
def dispatch_po_email(
    po_id: int,
    dry_run: bool = True,
    db: Session = Depends(get_db),
    _write_guard: None = Depends(enforce_writable_db),
    current_user: Optional[User] = Depends(require_role(["admin", "manager"])),
):
    """Dispatches Purchase Order email (dry-run mode by default)."""
    return send_po_email(po_id=po_id, db=db, dry_run=dry_run)


@router.post("/{po_id}/receipt")
def record_goods_receipt(
    po_id: int,
    payload: RecordReceiptRequest,
    db: Session = Depends(get_db),
    _write_guard: None = Depends(enforce_writable_db),
    current_user: Optional[User] = Depends(require_role(["admin", "manager"])),
):
    """
    Records received goods against PO line items and triggers THE LEARNING LOOP,
    updating lead time observations and recalculating King's safety stock.
    """
    user_id = current_user.id if current_user else None
    lines_data = [l.model_dump() for l in payload.lines]
    return process_goods_receipt_learning_loop(
        po_id=po_id,
        receipt_lines=lines_data,
        received_by_user_id=user_id,
        db=db,
        notes=payload.notes
    )

