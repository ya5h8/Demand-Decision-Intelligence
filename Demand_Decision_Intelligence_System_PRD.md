# Product Requirements Document (PRD)

## Demand & Decision Intelligence System

**Project Type:** Academic / B.Tech Final-Year Project
**Domain:** Indian Retail & FMCG
**Primary Focus:** Demand Forecasting + Inventory Decision Intelligence
**Target Users:** Retail Store Owners / Managers
**Technology:** React.js, FastAPI, Python, PostgreSQL, Prophet, Scikit-learn
**Status:** MVP Definition

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [Product Goals](#4-product-goals)
5. [Core Product Features](#5-core-product-features)
6. [Product Master](#6-product-master)
7. [Demand Forecasting](#7-demand-forecasting)
8. [Forecast Evaluation](#8-forecast-evaluation)
9. [Inventory Decision Intelligence](#9-inventory-decision-intelligence)
10. [Trend Analysis](#10-trend-analysis)
11. [Anomaly Detection](#11-anomaly-detection)
12. [Price & Discount Insights](#12-price--discount-insights)
13. [Dashboard](#13-dashboard)
14. [RAG Chatbot](#14-rag-chatbot)
15. [Adaptive Data Upload](#15-adaptive-data-upload)
16. [MVP Scope](#16-mvp-scope)
17. [MVP Explicitly Does NOT Include](#17-mvp-explicitly-does-not-include)
18. [User Stories](#18-user-stories)
19. [Success Metrics](#19-success-metrics)
20. [Assumptions](#20-assumptions)
21. [Risks & Mitigation](#21-risks--mitigation)
22. [Acceptance Criteria](#22-acceptance-criteria)
23. [MVP Definition of Done](#23-mvp-definition-of-done)

---

## 1. Product Overview

The **Demand & Decision Intelligence System** is a web-based AI/ML decision-support platform designed for Indian retail businesses.

The system converts historical sales and product data into **demand forecasts, inventory recommendations, trend insights, anomaly alerts, and actionable business recommendations**.

Instead of requiring a retailer to manually analyze large transaction datasets, the system provides a single platform where the owner can upload sales data and receive data-driven decisions.

### Core flow

```text
Owner Uploads Sales Data
          ↓
Data Validation & Cleaning
          ↓
Demand Analysis
          ↓
Demand Forecast
          ↓
Inventory Analysis
          ↓
Business Recommendations
          ↓
Dashboard + Chatbot
```

---

## 2. Problem Statement

Indian retail stores generate large amounts of sales data, but many small and medium-sized retailers still rely heavily on manual analysis and intuition for inventory and demand decisions.

This creates problems such as:

* Difficulty predicting future product demand
* Overstocking slow-moving products
* Stockouts of fast-moving products
* Difficulty identifying demand trends
* Difficulty understanding price/discount relationships
* Manual analysis of large sales datasets
* Limited visibility into unusual sales spikes or drops
* Lack of actionable recommendations from historical data

Existing forecasting systems may also require long and structured historical datasets that smaller retailers do not always have.

The proposed system addresses this by providing an **adaptive, data-driven decision-support platform** where retailers can upload their historical data and progressively improve the forecasting process as more suitable historical data becomes available.

---

## 3. Target Users

### Primary User

#### Retail Store Owner / Manager

A person responsible for:

* inventory decisions
* product purchasing
* pricing/discount decisions
* monitoring sales
* identifying fast/slow-moving products
* planning replenishment

### Secondary Users

#### Project/Admin User

Responsible for:

* uploading datasets
* monitoring data quality
* managing system configuration
* reviewing model performance

The MVP should remain focused primarily on the **retail owner/manager**.

---

## 4. Product Goals

### Primary Goals

1. Provide reliable short-term demand forecasts from historical sales.
2. Convert forecasts into practical inventory decisions.
3. Identify important product and category trends.
4. Detect unusual sales patterns.
5. Provide price/discount-related demand insights where data supports them.
6. Allow owners to upload their own historical sales data.
7. Provide clear, understandable recommendations instead of only displaying ML predictions.
8. Evaluate forecasting performance using appropriate time-based validation.

### Secondary Goal

Create an architecture that can become more accurate when the retailer provides additional high-quality historical data.

---

## 5. Core Product Features

### 5.1 Data Upload & Validation

The owner can upload CSV/Excel sales data.

#### Minimum required fields

```text
date
product_id / SKU
quantity
selling_price
```

#### Optional fields

```text
order_id
city_name
MRP
discount
promotion
category
brand
```

The system should automatically validate:

* required columns
* data types
* dates
* missing values
* duplicate records
* product IDs
* quantity values
* price values
* historical date coverage

The user should receive a validation summary before the data is used.

---

## 6. Product Master

The system maintains product information separately from transaction data.

Product attributes may include:

```text
product_id
product_name
unit
product_type
brand_name
manufacturer_name
category
subcategory
```

This allows sales transactions to be analyzed at:

* SKU/product level
* brand level
* subcategory level
* category level

---

## 7. Demand Forecasting

The system forecasts future demand based on historical sales.

### MVP forecast horizons

* 7 days
* 14 days
* 30 days

The initial model pipeline should contain:

```text
Baseline
   ↓
Moving Average / Naive Forecast
   ↓
Prophet
   ↓
Evaluation
```

The system should initially focus on **trend and weekly seasonality** because the current project dataset covers only approximately April–July 2022.

The system must not claim that it has learned annual or Diwali seasonality from this limited history.

---

## 8. Forecast Evaluation

The system should compare predicted demand against actual demand using a time-based holdout.

Possible metrics:

* MAE
* RMSE
* MAPE / suitable alternative when zeros make MAPE inappropriate

The dashboard should show:

```text
Forecast Model
Forecast Horizon
MAE
RMSE
Accuracy / Error Summary
```

The purpose is to demonstrate whether the forecasting model performs better than the baseline.

---

## 9. Inventory Decision Intelligence

The system converts forecast demand into inventory recommendations.

### MVP outputs

* Safety stock
* Reorder point
* Reorder quantity
* Stockout risk
* Overstock risk

Example:

```text
Product: Product A

Forecast demand: 180 units
Current stock: 120 units
Reorder point: 150 units

⚠ High Stockout Risk

Recommended order: 100 units
```

### Important data assumption

The current project sales dataset does not contain verified historical inventory movements.

Therefore, the initial inventory layer uses **model-derived/constructed inventory simulation**.

It must be clearly labelled as such.

If the owner later uploads actual inventory data, the system should use that information.

---

## 10. Trend Analysis

The dashboard should identify:

* Top-selling products
* Slow-moving products
* Growing products
* Declining products
* Category performance
* Sales/demand trends

The MVP should focus on **actionable trends**, rather than building a large collection of visualizations.

---

## 11. Anomaly Detection

The system identifies unusual demand patterns such as:

* unexpected demand spikes
* unexpected demand drops
* unusually fast-selling products
* potential inventory-demand mismatches

Example:

> ⚠️ Product A demand is significantly higher than its recent normal level.

The system should show the relevant date/product and magnitude of the anomaly where possible.

---

## 12. Price & Discount Insights

Where sufficient price and quantity variation exists, the system can analyze relationships between:

```text
Selling Price
Discount
       ↓
Demand
```

Possible insights:

* products showing higher demand during discounts
* products with relatively low price sensitivity
* products with strong demand changes associated with price changes

These should be described as **estimated/observed relationships**, not automatically as causal effects.

---

## 13. Dashboard

The MVP dashboard should contain:

### KPI section

* Total demand/sales
* Number of products
* Forecast horizon
* Inventory risk count

### Forecast section

* Actual vs forecast
* Product forecast
* Forecast horizon selection

### Inventory section

* Stockout risks
* Overstock risks
* Reorder recommendations

### Analytics section

* Top products
* Product/category trends
* Anomaly alerts

### Recommendation section

Human-readable business actions.

---

## 14. RAG Chatbot

The system will include a focused RAG chatbot that allows the owner to ask questions about available project data.

Examples:

> "Which products are likely to stock out?"
>
> "What is the forecast for Product X?"
>
> "Which products are selling fastest?"
>
> "Why is Product X recommended for reorder?"
>
> "Which category has declining demand?"

The chatbot retrieves relevant project data before generating an answer.

### MVP limitation

The chatbot is not responsible for general-purpose conversations. Its primary purpose is **answering questions about the retailer's available data and system-generated insights**.

---

## 15. Adaptive Data Upload

A key product characteristic is that the initial demonstration dataset is not treated as the permanent data source.

```text
Initial Data
     ↓
Forecast
     ↓
Owner uploads additional history
     ↓
Validation
     ↓
Data integration
     ↓
Model update/retraining
     ↓
New forecast
```

If the owner provides 12+ months of suitable history, the system can evaluate annual patterns.

With multiple years, recurring seasonal/festival effects can be evaluated more reliably.

---

## 16. MVP Scope

The MVP should contain only the functionality necessary to demonstrate the complete decision-intelligence workflow.

### ✅ Included

**Data**

* CSV sales upload
* Data validation
* Data cleaning
* Product master integration
* PostgreSQL storage
* Daily demand aggregation

**Forecasting**

* Baseline forecast
* Prophet forecasting
* 7/14/30-day forecast
* Time-based evaluation

**Inventory**

* Model-derived inventory
* Safety stock
* Reorder point
* Reorder quantity
* Stockout risk
* Overstock risk

**Analytics**

* Top products
* Product/category trends
* Basic anomaly detection
* Price/discount analysis

**UI**

* Dashboard
* Upload page
* Forecast page
* Inventory page
* Recommendations
* Basic RAG chatbot

---

## 17. MVP Explicitly Does NOT Include

To keep the project focused, the following are outside MVP:

* Customer behavior/personality analysis
* Customer recommendation engine
* Automated purchasing from suppliers
* Payment processing
* ERP integration
* POS hardware integration
* Mobile application
* Multi-country forecasting
* Real-time IoT inventory tracking
* Advanced reinforcement learning
* Training an LLM from scratch
* Fully autonomous business decisions
* Guaranteed price optimization
* Guaranteed causal measurement of promotions
* Full-scale supply-chain optimization
* Complex multi-warehouse optimization

---

## 18. User Stories

### Data Upload

**US-01**

> As a retailer, I want to upload my sales data so that the system can analyze my business.

**Acceptance:** The system accepts a valid CSV/Excel file and begins validation.

**US-02**

> As a retailer, I want to know whether my uploaded data is valid before using it.

**Acceptance:** The system reports valid records, invalid records, missing fields, duplicates and other important issues.

### Forecasting

**US-03**

> As a retailer, I want to forecast future product demand so that I can plan inventory.

**Acceptance:** The system generates a 7/14/30-day forecast for a supported product/time series.

**US-04**

> As a retailer, I want to know how reliable the forecast is.

**Acceptance:** The system displays forecast evaluation metrics based on a chronological holdout.

### Inventory

**US-05**

> As a retailer, I want to know which products are at risk of stockout.

**Acceptance:** The system identifies products whose projected demand creates a stockout risk under the configured inventory assumptions.

**US-06**

> As a retailer, I want to know how much I should reorder.

**Acceptance:** The system calculates a reorder recommendation using demand, lead time and inventory parameters.

### Analytics

**US-07**

> As a retailer, I want to identify my best and worst-selling products.

**Acceptance:** The dashboard ranks products using the selected time period.

**US-08**

> As a retailer, I want to identify unusual demand spikes or drops.

**Acceptance:** The system flags statistically/model-defined anomalies and provides the affected product/date.

### Chatbot

**US-09**

> As a retailer, I want to ask questions about my sales and inventory in natural language.

**Acceptance:** The chatbot retrieves relevant project data and provides an understandable answer.

### Historical Data

**US-10**

> As a retailer, I want to upload additional historical data so that the forecasting system can use a longer history.

**Acceptance:** Valid additional historical records can be validated and incorporated without corrupting existing data.

---

## 19. Success Metrics

The MVP should measure both **technical performance** and **business usefulness**.

### Forecasting

Primary:

* MAE
* RMSE
* suitable percentage error metric where applicable
* comparison against baseline

Success condition:

> The selected forecasting model should demonstrate measurable improvement over the chosen baseline on the time-based test period, or clearly document why the baseline is retained.

### Data Quality

Track:

* % valid records
* % missing critical fields
* duplicate rate
* product-ID match rate
* invalid-value rate

### Inventory

Track:

* stockout-risk identification
* reorder recommendation coverage
* inventory-risk detection rate in simulation
* forecast-to-inventory decision consistency

### System

Track:

* successful upload rate
* API response time for normal dashboard queries
* forecast generation completion
* dashboard usability
* chatbot answer relevance

---

## 20. Assumptions

1. Historical sales data is representative enough for the initial forecasting task.
2. Uploaded data contains consistent product identifiers.
3. Date and quantity information are sufficiently reliable.
4. Selling price is available for price-related analysis.
5. Inventory parameters such as lead time can initially be configured or assumed.
6. Initial inventory is model-derived unless actual inventory is supplied.
7. More historical data can improve seasonal modelling when it is relevant and high quality.
8. External calendar/weather data will be integrated later.
9. The current dataset does not provide sufficient evidence for learned annual/Diwali seasonality.
10. Forecasting is a decision-support function, not a guarantee of future demand.

---

## 21. Risks & Mitigation

| Risk                          | Impact | Mitigation                                           |
| ----------------------------- | ------ | ----------------------------------------------------- |
| Limited historical data       | High   | Clearly limit seasonal claims; support owner uploads |
| Poor uploaded data            | High   | Strong validation pipeline                           |
| Missing inventory history     | High   | Use clearly labelled model-derived inventory         |
| Product ID mismatch           | High   | Product master validation/mapping                    |
| Zero/negative values          | Medium | Investigate based on business meaning                |
| Forecast error                | High   | Baselines + time-based evaluation                    |
| Data leakage                  | High   | Chronological train/test split                       |
| Unreliable external factors   | Medium | Validate sources before modelling                    |
| Price/discount confounding    | Medium | Present relationships cautiously                     |
| Very large transaction files  | Medium | PostgreSQL, chunking and aggregation                 |
| Over-complex MVP              | Medium | Keep initial feature set focused                     |
| LLM hallucination             | Medium | RAG retrieval + grounded responses                   |

---

## 22. Acceptance Criteria

The MVP is considered complete when all of the following are satisfied:

### Data

- [ ] User can upload a supported sales file.
- [ ] Required columns are validated.
- [ ] Invalid/missing records are reported.
- [ ] Duplicate records are identified.
- [ ] Product IDs can be matched to the product master where applicable.
- [ ] Clean data can be stored in PostgreSQL.
- [ ] Daily product demand can be generated.

### Forecasting

- [ ] A baseline forecast exists.
- [ ] Prophet forecasting works on supported time series.
- [ ] 7/14/30-day forecasts can be generated.
- [ ] Forecast results are displayed in the dashboard.
- [ ] Forecasts are evaluated using chronological data splitting.
- [ ] Evaluation metrics are displayed.

### Inventory

- [ ] Inventory assumptions can be configured.
- [ ] Safety stock can be calculated.
- [ ] Reorder point can be calculated.
- [ ] Reorder quantity can be calculated.
- [ ] Stockout risk can be identified.
- [ ] Overstock risk can be identified.
- [ ] Simulated inventory is clearly labelled as model-derived.

### Analytics

- [ ] Top products can be identified.
- [ ] Product/category trends can be displayed.
- [ ] Basic anomalies can be identified.
- [ ] Price/discount relationships can be analysed where data supports them.

### Dashboard

- [ ] Owner can navigate the major MVP modules.
- [ ] Forecast and inventory information is understandable.
- [ ] Recommendations are presented in business-friendly language.

### Chatbot

- [ ] User can ask questions about available project data.
- [ ] Chatbot retrieves relevant data.
- [ ] Responses are grounded in available project information.
- [ ] Chatbot does not present unsupported assumptions as facts.

### Data Expansion

- [ ] Additional valid historical sales data can be uploaded.
- [ ] Existing data is not accidentally overwritten.
- [ ] The system can update/retrain the forecasting workflow using expanded history.

---

## 23. MVP Definition of Done

The MVP is **not** a system that predicts everything perfectly.

The MVP is successful if it demonstrates this complete loop:

```text
                    OWNER
                      │
                      ▼
               Upload Sales Data
                      │
                      ▼
             Validate & Clean Data
                      │
                      ▼
              Daily Demand Dataset
                      │
                      ▼
                Demand Forecast
                      │
                      ▼
             Forecast Evaluation
                      │
                      ▼
            Inventory Intelligence
                      │
              ┌───────┴───────┐
              ▼               ▼
         Risk Detection   Reorder Decision
              │               │
              └───────┬───────┘
                      ▼
             Business Recommendation
                      │
                      ▼
                 Dashboard
                      │
                      ▼
                 RAG Chatbot
```

**The central product promise is:**

> **Turn retail sales data into understandable forecasts and actionable inventory decisions, while allowing the system to improve its historical foundation as the retailer provides more suitable data.**
