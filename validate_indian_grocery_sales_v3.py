"""
VALIDATION V3 — Indian Grocery Sales Dataset

This version is tailored to the exact columns found in the uploaded sales files:

date_
city_name
order_id
cart_id
dim_customer_key
procured_quantity
unit_selling_price
total_discount_amount
product_id
total_weighted_landing_price

It processes large CSV files in 100,000-row chunks.

Expected files:
fact_sales_apr1.csv
fact_sales_apr2.csv
fact_sales_may1.csv
fact_sales_may2.csv
fact_sales_jun1.csv
fact_sales_jun2.csv
fact_sales_jul1.csv
fact_sales_jul2.csv (if available)
dim_product(1).csv or dim_product.csv
"""

from pathlib import Path
import pandas as pd
import numpy as np
import json

BASE = Path(__file__).resolve().parent

EXPECTED = [
    "fact_sales_apr1", "fact_sales_apr2",
    "fact_sales_may1", "fact_sales_may2",
    "fact_sales_jun1", "fact_sales_jun2",
    "fact_sales_jul1", "fact_sales_jul2"
]

def find_file(stem):
    matches = [p for p in BASE.iterdir()
               if p.is_file() and p.stem.lower() == stem.lower()]
    return max(matches, key=lambda p: p.stat().st_size) if matches else None

def find_dim():
    for name in ["dim_product(1).csv", "dim_product.csv"]:
        p = BASE / name
        if p.exists():
            return p
    matches = [p for p in BASE.iterdir()
               if p.is_file() and p.stem.lower().startswith("dim_product")]
    return max(matches, key=lambda p: p.stat().st_size) if matches else None

def init_report(path):
    return {
        "file": path.name,
        "size_mb": round(path.stat().st_size / 1024**2, 2),
        "rows": 0,
        "unique_orders": 0,
        "unique_carts": 0,
        "unique_customers": 0,
        "unique_products": 0,
        "date_min": "",
        "date_max": "",
        "date_parse_failures": 0,
        "missing_date": 0,
        "missing_product_id": 0,
        "missing_quantity": 0,
        "missing_price": 0,
        "missing_discount": 0,
        "negative_quantity": 0,
        "zero_quantity": 0,
        "negative_price": 0,
        "zero_price": 0,
        "negative_discount": 0,
        "duplicate_rows": 0,
        "quantity_sum": 0.0,
        "gross_sales_value": 0.0,
        "discount_sum": 0.0,
        "net_sales_estimate": 0.0,
        "product_id_match_checked": 0,
        "product_id_match": 0,
        "product_id_unmatched": 0,
        "product_id_match_rate": np.nan,
        "error": ""
    }

# Product master
dim = find_dim()
master_ids = set()

if dim:
    try:
        header = pd.read_csv(dim, nrows=0)
        pid = next((c for c in header.columns
                    if str(c).strip().lower() == "product_id"), None)
        if pid:
            pm = pd.read_csv(dim, usecols=[pid])
            master_ids = set(pm[pid].dropna().astype(str).str.strip())
            print(f"[PRODUCT MASTER] {dim.name}")
            print(f"Unique product IDs: {len(master_ids):,}")
        else:
            print("[WARNING] product_id not found in product master.")
    except Exception as e:
        print("[WARNING] Product master error:", repr(e))
else:
    print("[WARNING] Product master file not found.")

reports = []
samples = []
columns_report = {}

for stem in EXPECTED:
    path = find_file(stem)

    if path is None:
        print(f"\n[MISSING] {stem}")
        reports.append({
            "file": stem,
            "rows": 0,
            "error": "FILE NOT FOUND"
        })
        continue

    print(f"\n[PROCESSING] {path.name}")

    r = init_report(path)
    orders, carts, customers, products = set(), set(), set(), set()
    date_min, date_max = None, None

    try:
        if path.suffix.lower() != ".csv":
            r["error"] = f"Expected CSV, found {path.suffix}"
            reports.append(r)
            continue

        reader = pd.read_csv(path, chunksize=100_000, low_memory=False)

        required = {
            "date_": "date_",
            "product_id": "product_id",
            "procured_quantity": "procured_quantity",
            "unit_selling_price": "unit_selling_price"
        }

        first = True

        for chunk in reader:
            r["rows"] += len(chunk)
            columns_report[path.name] = list(chunk.columns)

            if first:
                print("  Columns:")
                print("   " + ", ".join(map(str, chunk.columns)))
                missing_cols = [c for c in required if c not in chunk.columns]
                if missing_cols:
                    r["error"] = "Missing required columns: " + ", ".join(missing_cols)
                first = False

            if len(samples) < 100:
                s = chunk.head(min(10, len(chunk))).copy()
                s.insert(0, "source_file", path.name)
                samples.extend(s.to_dict("records"))

            r["duplicate_rows"] += int(chunk.duplicated().sum())

            # IDs
            orders.update(chunk["order_id"].dropna().astype(str))
            carts.update(chunk["cart_id"].dropna().astype(str))
            customers.update(chunk["dim_customer_key"].dropna().astype(str))

            pids = chunk["product_id"]
            r["missing_product_id"] += int(pids.isna().sum())
            pvals = pids.dropna().astype(str).str.strip()
            products.update(pvals)

            if master_ids:
                r["product_id_match_checked"] += len(pvals)
                r["product_id_match"] += int(pvals.isin(master_ids).sum())
                r["product_id_unmatched"] += int((~pvals.isin(master_ids)).sum())

            # Date — exact column date_
            parsed = pd.to_datetime(chunk["date_"], errors="coerce")
            r["missing_date"] += int(chunk["date_"].isna().sum())
            r["date_parse_failures"] += int(parsed.notna().sum() < len(chunk["date_"].dropna()))

            valid_dates = parsed.dropna()
            if len(valid_dates):
                mn, mx = valid_dates.min(), valid_dates.max()
                date_min = mn if date_min is None else min(date_min, mn)
                date_max = mx if date_max is None else max(date_max, mx)

            # Quantity
            q = pd.to_numeric(chunk["procured_quantity"], errors="coerce")
            r["missing_quantity"] += int(q.isna().sum())
            r["negative_quantity"] += int((q < 0).sum())
            r["zero_quantity"] += int((q == 0).sum())
            r["quantity_sum"] += float(q.sum(skipna=True))

            # Selling price — exact column unit_selling_price
            price = pd.to_numeric(chunk["unit_selling_price"], errors="coerce")
            r["missing_price"] += int(price.isna().sum())
            r["negative_price"] += int((price < 0).sum())
            r["zero_price"] += int((price == 0).sum())

            # Discount — exact column total_discount_amount
            disc = pd.to_numeric(chunk["total_discount_amount"], errors="coerce")
            r["missing_discount"] += int(disc.isna().sum())
            r["negative_discount"] += int((disc < 0).sum())

            # Financial sanity
            gross = q * price
            r["gross_sales_value"] += float(gross.sum(skipna=True))
            r["discount_sum"] += float(disc.sum(skipna=True))
            r["net_sales_estimate"] += float((gross - disc).sum(skipna=True))

        r["unique_orders"] = len(orders)
        r["unique_carts"] = len(carts)
        r["unique_customers"] = len(customers)
        r["unique_products"] = len(products)

        if date_min is not None:
            r["date_min"] = str(date_min.date())
            r["date_max"] = str(date_max.date())

        if r["product_id_match_checked"]:
            r["product_id_match_rate"] = (
                r["product_id_match"] / r["product_id_match_checked"]
            )

        if r["error"]:
            status = "FAIL - SCHEMA"
        elif r["rows"] == 0:
            status = "FAIL - EMPTY"
        elif r["date_parse_failures"] > 0:
            status = "REVIEW - DATE PARSING"
        elif r["missing_product_id"] > 0:
            status = "REVIEW - MISSING PRODUCT IDS"
        elif r["missing_quantity"] > 0:
            status = "REVIEW - MISSING QUANTITY"
        elif r["missing_price"] > 0:
            status = "REVIEW - MISSING PRICE"
        elif r["negative_quantity"] > 0:
            status = "REVIEW - NEGATIVE QUANTITY"
        elif r["negative_price"] > 0:
            status = "REVIEW - NEGATIVE PRICE"
        else:
            status = "PASS - BASIC QUALITY"

        r["data_quality_status"] = status
        reports.append(r)

        print(
            f"  rows={r['rows']:,} | products={r['unique_products']:,} | "
            f"dates={r['date_min']} -> {r['date_max']} | "
            f"product match={r['product_id_match_rate']:.2%}"
            if not pd.isna(r["product_id_match_rate"])
            else
            f"  rows={r['rows']:,} | products={r['unique_products']:,} | "
            f"dates={r['date_min']} -> {r['date_max']}"
        )

    except Exception as e:
        r["error"] = repr(e)
        reports.append(r)
        print("  ERROR:", repr(e))

report_df = pd.DataFrame(reports)

# Numeric columns
numeric_cols = [
    "rows","size_mb","unique_orders","unique_carts","unique_customers",
    "unique_products","date_parse_failures","missing_date","missing_product_id",
    "missing_quantity","missing_price","missing_discount","negative_quantity",
    "zero_quantity","negative_price","zero_price","negative_discount",
    "duplicate_rows","quantity_sum","gross_sales_value","discount_sum",
    "net_sales_estimate","product_id_match_checked","product_id_match",
    "product_id_unmatched","product_id_match_rate"
]
for c in numeric_cols:
    if c in report_df.columns:
        report_df[c] = pd.to_numeric(report_df[c], errors="coerce")

# Save detailed report
report_path = BASE / "dataset_validation_report_v3.csv"
report_df.to_csv(report_path, index=False)

# Save samples
sample_path = BASE / "validation_samples_v3.csv"
pd.DataFrame(samples).to_csv(sample_path, index=False)

# Save column report
columns_path = BASE / "sales_file_columns_v3.json"
columns_path.write_text(json.dumps(columns_report, indent=2), encoding="utf-8")

# Overall summary
found = report_df[report_df["rows"].fillna(0) > 0]
checked = found["product_id_match_checked"].sum()
matched = found["product_id_match"].sum()

summary = pd.DataFrame([{
    "product_master_file": "" if dim is None else dim.name,
    "product_master_unique_ids": len(master_ids),
    "expected_sales_files": len(EXPECTED),
    "sales_files_found": len(found),
    "sales_files_missing": len(EXPECTED) - len(found),
    "sales_rows_found": int(found["rows"].sum()),
    "unique_products_across_files_sum": int(found["unique_products"].sum()),
    "overall_product_id_match_rate": matched / checked if checked else np.nan,
    "overall_date_min": (
        found.loc[found["date_min"].notna() & (found["date_min"] != ""), "date_min"].min()
        if len(found) else ""
    ),
    "overall_date_max": (
        found.loc[found["date_max"].notna() & (found["date_max"] != ""), "date_max"].max()
        if len(found) else ""
    ),
    "total_quantity": float(found["quantity_sum"].sum()),
    "gross_sales_value_estimate": float(found["gross_sales_value"].sum()),
    "total_discount": float(found["discount_sum"].sum()),
    "net_sales_estimate": float(found["net_sales_estimate"].sum()),
}])

summary_path = BASE / "product_id_validation_v3.csv"
summary.to_csv(summary_path, index=False)

print("\n==========================================")
print("VALIDATION V3 COMPLETE")
print("==========================================")
print(f"Sales files found: {len(found)}/{len(EXPECTED)}")
print(f"Sales rows: {int(found['rows'].sum()):,}")
print(f"Overall product-ID match: "
      f"{summary.loc[0,'overall_product_id_match_rate']:.2%}"
      if not pd.isna(summary.loc[0,'overall_product_id_match_rate'])
      else "Overall product-ID match: unavailable")
print(f"Date range: {summary.loc[0,'overall_date_min']} -> {summary.loc[0,'overall_date_max']}")

print("\nCreated:")
print("  dataset_validation_report_v3.csv")
print("  product_id_validation_v3.csv")
print("  sales_file_columns_v3.json")
print("  validation_samples_v3.csv")

print("\nUPLOAD THESE 3 SMALL FILES:")
print("  1) dataset_validation_report_v3.csv")
print("  2) product_id_validation_v3.csv")
print("  3) sales_file_columns_v3.json")
