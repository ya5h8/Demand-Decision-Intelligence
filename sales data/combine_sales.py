import pandas as pd
from pathlib import Path

folder = Path(__file__).parent

files = [
    "fact_sales_apr1.csv",
    "fact_sales_apr2.csv",
    "fact_sales_may1.csv",
    "fact_sales_may2.csv",
    "fact_sales_jun1.csv",
    "fact_sales_jun2.csv",
    "fact_sales_jul1.csv"
]

output = folder / "fact_sales_combined.csv"

first_file = True

for file in files:
    path = folder / file

    print(f"Reading: {file}")

    df = pd.read_csv(path)

    df.to_csv(
        output,
        mode="w" if first_file else "a",
        header=first_file,
        index=False
    )

    first_file = False

    print(f"Added {len(df):,} rows")

print("DONE!")