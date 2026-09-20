"""
backend/schemas/demand.py
-------------------------
Pydantic schemas for Step 4: Daily Demand Aggregation and Persistence.
"""

from datetime import date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DailyDemandItem(BaseModel):
    id: Optional[int] = None
    date_: str = Field(..., description="Calendar date of sales activity (YYYY-MM-DD)")
    sale_date: str = Field(..., description="Alias for date_ for backwards compatibility")
    product_id: str = Field(..., description="Unique product SKU ID")
    city_name: str = Field(..., description="Store location / City")
    total_quantity: float = Field(..., description="Aggregated units demanded")
    total_sales_value: float = Field(..., description="Gross revenue (INR)")
    revenue: float = Field(..., description="Alias for total_sales_value")
    order_count: int = Field(..., description="Number of unique transaction orders")
    avg_unit_price: Optional[float] = Field(None, description="Average selling price per unit")

    class Config:
        from_attributes = True


class DailyDemandResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: List[DailyDemandItem]


class DailyDemandSummaryDateRange(BaseModel):
    start: str
    end: str
    total_calendar_days: int
    recorded_active_days: int


class TopProductItem(BaseModel):
    product_id: str
    total_qty: float


class DailyDemandSummaryCatalog(BaseModel):
    total_product_master_skus: int
    active_sales_skus: int
    product_city_series: int
    unmatched_skus: int
    unmatched_sales_rows: int
    match_rate_pct: float


class DailyDemandSummary(BaseModel):
    dataset_name: str
    total_sales_transactions: int
    total_demand_quantity: float
    total_revenue_inr: float
    total_quantity: float
    total_revenue: float
    unique_products: int
    unique_cities: int
    date_min: str
    date_max: str
    date_range: DailyDemandSummaryDateRange
    geography: List[str]
    top_products_by_qty: List[TopProductItem]
    catalog: DailyDemandSummaryCatalog
    data_integrity: Dict[str, Any]


class DailyDemandSyncReport(BaseModel):
    status: str
    total_rows: int
    inserted: int
    updated: int
    skipped: int
    failed: int
    errors: List[str]
    duration_seconds: float
    message: str
