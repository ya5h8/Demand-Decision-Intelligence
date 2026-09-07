# CONVENTIONS.md

# How We Write Code Here

## General

Code should be readable, modular, reproducible, testable and easy for
another team member to understand.

## Python

Use `snake_case` for variables/functions and `PascalCase` for classes.

``` python
product_id
sales_quantity

def calculate_reorder_point():
    ...
```

## React

Use `PascalCase` for components and `camelCase` for variables/functions.

Examples: `ForecastChart.jsx`, `InventoryCard.jsx`, `UploadPage.jsx`.

## Database

Use `snake_case`: `product_id`, `product_name`, `sales_quantity`,
`reorder_point`, `created_at`.

## API

Use resource-oriented REST endpoints:

``` text
POST /api/auth/login
POST /api/uploads/sales
GET  /api/products
GET  /api/forecasts
GET  /api/inventory
GET  /api/analytics/trends
GET  /api/anomalies
POST /api/chat
```

## Data Pipeline

Always use explicit stages:

``` text
raw → validated → cleaned → processed → model-ready
```

Never modify raw source files directly.

## Validation

Check required columns, data types, date format, quantity, price,
product IDs, duplicates, missing values and date coverage. Report
rejected records and reasons.

## Missing / Zero / Negative Values

Do not blindly delete or replace values. Investigate their business
meaning first. Negative quantity may represent returns; zero price may
represent special transactions or data issues.

## Forecasting

Use chronological train/validation/test splits. Never randomly split
time-series data or allow future information to leak into training.

## Inventory

Always distinguish `actual_inventory` from `model_derived_inventory`.
Simulated inventory must never be described as historical real
inventory.

## Large Data

The project contains tens of millions of transaction rows. Prefer
chunked reads, PostgreSQL aggregation, incremental processing and
efficient data types over unnecessary full-memory operations.

## Security

Never commit `.env`, API keys, database passwords, JWT secrets or
private datasets. Use environment variables for secrets.

## Git Commits

Use concise action-oriented messages,
e.g. `feat: add sales upload validation`,
`feat: add demand aggregation`, `fix: prevent future data leakage`,
`docs: update dataset architecture`.

## Documentation

Record important architectural and modelling choices in `DECISIONS.md`.
