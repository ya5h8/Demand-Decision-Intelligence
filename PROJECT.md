# PROJECT.md

# Demand & Decision Intelligence System

## What This Thing Is

The **Demand & Decision Intelligence System** is an AI/ML-based
decision-support platform for Indian retail/FMCG. It converts historical
sales and product data into demand forecasts, inventory decisions,
trends, anomaly alerts, price/discount insights, and business
recommendations.

### Main capabilities

-   Sales data upload, validation and cleaning
-   Product master management
-   Demand forecasting and forecast evaluation
-   Inventory optimization and reorder recommendations
-   Trend analysis and anomaly detection
-   Price/discount analysis
-   Business recommendations
-   RAG chatbot over project data
-   Owner-uploaded historical data

### Target categories

1.  Groceries & Food
2.  Household Essentials
3.  Personal Care

## High-Level Flow

``` text
Sales + Product Master
        ↓
Validation & Cleaning
        ↓
Daily Demand Aggregation
        ↓
Demand Forecasting
        ↓
Forecast Evaluation
        ↓
Inventory Optimization
        ↓
Recommendations / Alerts
        ↓
React Dashboard + RAG Chatbot
```

## Current Data Foundation

The current primary foundation is a publicly available **Flipkart
Supermart/Indian grocery transaction and product dataset**.

Current validated coverage: - Approximately 46.7 million transaction
rows - 2022-04-01 to 2022-07-10 - 7 available sales files -
`fact_sales_jul2` is currently unavailable - Approximately 32,226 unique
product IDs in the product master - Overall product-ID match is
approximately 98.86%

This supports short-term demand forecasting, product/city analysis,
trends, price/discount analysis and inventory decision modelling. It
does **not** provide enough history to claim that annual or Diwali
seasonality has been learned.

## Data Expansion

The hosted system will allow an owner to upload additional historical
sales data. Suitable high-quality history can improve forecasting by
providing longer trends and seasonal history. More rows alone do not
guarantee better accuracy.

With 12+ months, annual patterns can potentially be evaluated. Multiple
years provide stronger evidence for recurring festival/seasonal effects.

## External Factors

The architecture will later support festivals/public holidays, weekends,
weather, commodity-market prices, price and discounts/promotions.
Calendar and weather integration will be added after the core sales →
forecasting → inventory pipeline is stable.

## Inventory

The current transaction data does not contain verified historical
inventory movements. Therefore the initial inventory layer uses
**model-derived/constructed inventory simulation** and must never be
presented as real historical inventory.

Core calculations include:

``` text
Closing Stock = Opening Stock + Stock Received - Sales Quantity
Reorder Point = Average Demand × Lead Time + Safety Stock
```

When an owner uploads actual inventory records, the system should use
those records instead of relying only on simulation.

## Forecasting

Start with naive and moving-average baselines, then Prophet, then
enhanced models where justified. For the current short history,
initially use trend and weekly seasonality. Yearly seasonality should
only be evaluated when sufficient historical data supports it. Use
chronological train/validation/test splits.

## Dashboard

The dashboard should provide KPIs, actual vs forecast, forecast horizon,
product/category trends, inventory status, stockout/overstock alerts,
reorder recommendations, price/discount insights, anomaly alerts,
forecast evaluation and the chatbot.

## Owner Upload

Minimum sales fields:

``` text
date
product_id / SKU
quantity
selling_price
```

Optional fields include `order_id`, `city_name`, `MRP`, `discount`,
`promotion`, `category`, and `brand`. Optional inventory fields are
`date`, `product_id`, `opening_stock`, `stock_received`, and
`closing_stock`.

The upload pipeline validates columns, types, missing values,
duplicates, dates and product identifiers before storing or using the
data.

## RAG Chatbot

The chatbot answers natural-language questions using retrieved project
data. It does not require training a new LLM from scratch.

## Non-Goals

The initial project does not focus on customer behavior analysis,
claiming simulated inventory is real, claiming annual/festival
seasonality from insufficient history, randomly merging unrelated
datasets, or training an LLM from scratch.

## Success Criteria

An owner should be able to upload sales data, receive validation
results, generate and evaluate forecasts, identify inventory risks,
receive reorder recommendations, view trends/anomalies, and update the
forecasting workflow with additional historical data.
