# DECISIONS.md

# Why We Did It That Way

## D-001 --- Flipkart Data as Initial Foundation

**Decision:** Use the validated Flipkart Supermart/Indian grocery
transaction data as the initial sales foundation.

**Why:** It is Indian grocery-focused and provides large-scale
transaction, quantity, price and city information.

**Limitation:** Current available history is only part of 2022.

## D-002 --- Separate Product Master

**Decision:** Keep `dim_product.csv` as the product master and join
attributes when required.

**Why:** It preserves the source master and avoids unnecessary
duplication.

## D-003 --- Do Not Claim Learned Annual Seasonality

**Decision:** Do not claim Diwali/yearly seasonality is learned from the
current dataset.

**Why:** The available history is too short and does not contain a
complete annual cycle.

## D-004 --- Support Owner Historical Uploads

**Decision:** The hosted system will allow owners to upload additional
historical sales data.

**Why:** A real owner may have 1--5 years of history, allowing the
system to use a longer time horizon.

## D-005 --- Do Not Randomly Merge Unrelated Retail Datasets

**Decision:** Do not merge unrelated datasets simply to increase
history.

**Why:** Different businesses may have incompatible products, SKUs,
prices, locations and demand patterns.

## D-006 --- SnapBizz as a Potential Supplement

**Decision:** Investigate SnapBizz as a potential long-term Indian FMCG
source.

**Status:** Pending access/academic permission, schema and quality
verification.

**Rule:** Do not use it in the project dataset until access and data
terms are confirmed.

## D-007 --- Model-Derived Inventory Initially

**Decision:** Use a clearly labelled inventory simulation initially.

**Why:** The sales data does not provide verified historical inventory
movements.

## D-008 --- Actual Inventory Upload

**Decision:** Support actual inventory uploads later.

**Why:** Actual opening stock, receipts and closing stock are more
reliable than simulation when available.

## D-009 --- Aggregate Before Forecasting

**Decision:** Do not train the first forecasting model directly on raw
transaction rows.

**Why:** Tens of millions of transactions are not the appropriate final
time-series grain. Initial forecasting grain:
`date + product_id + city_name`, with aggregated demand and relevant
price/discount features.

## D-010 --- Time-Based Evaluation

**Decision:** Use chronological train/validation/test splits.

**Why:** Random splits can leak future information into training and
produce unrealistic results.

## D-011 --- Start With Interpretable Forecasting

**Decision:** Start with simple baselines and Prophet before more
complex ML.

**Why:** This establishes a benchmark and makes model improvements
measurable and explainable.

## D-012 --- Add Calendar and Weather Later

**Decision:** Add festival/calendar and weather features after the core
pipeline is stable.

**Why:** This reduces complexity and allows each feature group to be
evaluated independently.

## D-013 --- Price Sensitivity Is Not Automatically Causal

**Decision:** Describe price/discount relationships as estimated or
associated effects unless stronger causal methods are implemented.

**Why:** Historical sales contain confounding factors such as
promotions, seasonality and availability.

## D-014 --- RAG Instead of Training a New LLM

**Decision:** Use retrieval-augmented generation for the chatbot.

**Why:** The chatbot needs access to project data, not a newly trained
foundation model.

## D-015 --- Preserve Raw Data

**Decision:** Never modify original source files.

**Why:** Raw data preservation supports reproducibility, auditing and
debugging.

## D-016 --- Separate Demo and Owner Data

**Decision:** Keep academic/demo data separate from real owner-uploaded
data.

**Why:** This prevents accidental mixing of businesses and makes model
provenance clear.
