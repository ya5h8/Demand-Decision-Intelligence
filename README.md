# Demand Decision Intelligence

A demand forecasting and inventory optimization system for Indian grocery retail.

## Project Structure

```
Demand-Decision-Intelligence/
│
└── dataset/
    ├── raw/
    │   ├── sales/           # 7 raw sales CSVs (NOT tracked by Git — too large)
    │   └── products/        # dim_product.csv
    │
    ├── combined/            # fact_sales_combined.csv (NOT tracked by Git)
    │
    ├── cleaned/             # Cleaned and joined data
    │   ├── sales_cleaned.csv
    │   └── sales_product_master.csv
    │
    ├── processed/           # Aggregated demand data
    │   └── daily_product_demand.csv
    │
    ├── inventory/           # Inventory simulation data
    │   ├── inventory_simulation_sample.csv
    │   └── inventory_upload_template.csv
    │
    └── external/            # External feature data
        ├── calendar/
        ├── weather/
        └── commodity/
```

## Dataset Setup

The raw sales CSV files are **not included** in this repository due to their size (~5.9 GB total).

To set up the data locally:

1. Obtain the 7 sales CSV files:
   - `fact_sales_apr1.csv` (~634 MB)
   - `fact_sales_apr2.csv` (~656 MB)
   - `fact_sales_may1.csv` (~502 MB)
   - `fact_sales_may2.csv` (~535 MB)
   - `fact_sales_jun1.csv` (~521 MB)
   - `fact_sales_jun2.csv` (~500 MB)
   - `fact_sales_jul1.csv` (~573 MB)

2. Place them in `dataset/raw/sales/`

3. Run the combine script to generate `dataset/combined/fact_sales_combined.csv`

## Tech Stack

- Python 3.13+
- pandas

## License

MIT
