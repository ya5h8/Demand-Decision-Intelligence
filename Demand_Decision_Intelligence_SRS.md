# Software Requirements Specification (SRS)

## Demand & Decision Intelligence System

**Version:** 1.0\
**Project Type:** Academic / Final-Year B.Tech Project\
**Domain:** Indian Retail / FMCG\
**Primary Users:** Retail Store Owner / Manager\
**Secondary User:** System Administrator / Project Administrator

------------------------------------------------------------------------

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification defines the functional and
non-functional requirements for the **Demand & Decision Intelligence
System**. The system is an AI/ML-based decision-support platform
designed to help retail users understand historical demand, forecast
short-term demand, identify inventory risks, detect trends and
anomalies, analyze price/discount relationships, and receive actionable
recommendations through a web dashboard and focused RAG chatbot.

The system is intended to support decisions; it will not autonomously
purchase inventory, change prices, or execute business transactions.

### 1.2 Scope

The system shall provide:

-   CSV-based retail sales data upload and validation.
-   Product-master management and product matching.
-   Data cleaning and transformation.
-   PostgreSQL-based storage.
-   Daily product/city demand aggregation.
-   Short-term demand forecasting for 7, 14, and 30 days where
    sufficient history exists.
-   Baseline and Prophet forecasting models.
-   Time-based forecast evaluation.
-   Inventory intelligence including safety stock, reorder point,
    reorder quantity, stockout risk, and overstock risk.
-   Product trends and performance analysis.
-   Basic anomaly detection.
-   Price and discount analysis.
-   Dashboard-based KPIs, forecasts, alerts, and recommendations.
-   Natural-language querying through a focused RAG chatbot over project
    data.
-   Owner-uploaded additional historical data without changing the core
    application architecture.

### 1.3 Out of Scope

The MVP shall not include:

-   Customer behavior or customer-level profiling.
-   Automated supplier purchasing or purchase-order execution.
-   Payment processing.
-   ERP/POS hardware integration.
-   Mobile application.
-   Multi-country deployment.
-   IoT-based inventory sensing.
-   Reinforcement learning.
-   Training an LLM from scratch.
-   Autonomous business decisions.
-   Guaranteed causal measurement of promotions.
-   Full supply-chain optimization.
-   Multi-warehouse optimization.

------------------------------------------------------------------------

## 2. Product Overview

### 2.1 System Architecture

The system shall use the following logical architecture:

**React.js Frontend → FastAPI Backend → Authentication/Business Logic →
PostgreSQL → ML/Data Processing Services**

The RAG chatbot shall access approved project data through controlled
backend services and shall not directly expose database credentials to
the client.

### 2.2 Technology Baseline

  Layer            Technology
  ---------------- --------------------------------------------------------
  Frontend         React.js, Vite, Recharts
  Backend          Python, FastAPI, Uvicorn, Pydantic
  Database         PostgreSQL
  ML/Data          Pandas, NumPy, scikit-learn, Prophet
  Authentication   JWT-based authentication
  Chatbot          RAG architecture using a selected LLM/vector component

Exact dependency versions shall be pinned before deployment.

------------------------------------------------------------------------

# 3. User Roles and Permissions

## 3.1 Roles

### R-01 Store Owner / Manager

The primary business user. This role can upload business data, view
dashboards, run forecasts, inspect inventory decisions, view
trends/anomalies, and query the chatbot.

### R-02 Administrator / Project Administrator

The system-management role. This role can manage users, inspect
system/data-processing status, configure supported system parameters,
and access administrative functions.

## 3.2 Permission Matrix

  Function                         Owner/Manager   Administrator
  ------------------------------ --------------- ---------------
  Login/logout                               Yes             Yes
  View dashboard                             Yes             Yes
  Upload sales data                          Yes             Yes
  Upload product master                      Yes             Yes
  View validation results                    Yes             Yes
  Run demand processing                      Yes             Yes
  View forecasts                             Yes             Yes
  View forecast evaluation                   Yes             Yes
  View inventory intelligence                Yes             Yes
  View trends/anomalies                      Yes             Yes
  View price/discount analysis               Yes             Yes
  Use RAG chatbot                            Yes             Yes
  Manage users                                No             Yes
  View system logs                            No             Yes
  Configure system parameters                 No             Yes
  Delete/archive datasets             Restricted             Yes

Authorization shall be enforced on the backend for every protected
operation; hiding a frontend button shall not be considered
authorization.

------------------------------------------------------------------------

# 4. Functional Requirements

## 4.1 Authentication

**FR-AUTH-01:** The system shall provide a login interface requiring a
valid username/email and password.

**FR-AUTH-02:** The backend shall verify credentials before issuing an
authentication token.

**FR-AUTH-03:** The system shall issue a JWT token only after successful
authentication.

**FR-AUTH-04:** Protected API endpoints shall reject requests without a
valid authentication token.

**FR-AUTH-05:** The system shall support logout by clearing the client
authentication state and invalidating/expiring the active session
according to the implemented token strategy.

**FR-AUTH-06:** Failed authentication shall return a generic error
message and shall not reveal whether the username or password was
incorrect.

**FR-AUTH-07:** Passwords shall never be stored in plaintext.

### Acceptance Criteria

-   Valid credentials result in authenticated access.
-   Invalid credentials cannot access protected resources.
-   Expired/invalid JWTs are rejected.
-   Password values are not returned by any API.

------------------------------------------------------------------------

## 4.2 Authorization

**FR-AUTHZ-01:** Every protected API endpoint shall verify the
authenticated user's role.

**FR-AUTHZ-02:** Administrator-only operations shall return HTTP 403 for
non-administrator users.

**FR-AUTHZ-03:** Users shall not be able to access another user's
restricted data solely by changing an ID in a request.

**FR-AUTHZ-04:** The frontend shall display functions appropriate to the
user's role.

### Acceptance Criteria

A non-admin request to an admin-only endpoint must fail with 403, while
an authorized admin request succeeds.

------------------------------------------------------------------------

## 4.3 Data Upload

**FR-DATA-01:** The system shall allow authorized users to upload CSV
files.

**FR-DATA-02:** The system shall identify the uploaded dataset type,
such as sales data, product master, or inventory data, either through
the upload selection or schema detection.

**FR-DATA-03:** The system shall validate file extension, MIME type
where available, file size, headers, data types, and required fields
before processing.

**FR-DATA-04:** The system shall preserve the original uploaded file or
an immutable raw-data copy for traceability.

**FR-DATA-05:** The system shall assign a dataset identifier and
processing status to every upload.

**FR-DATA-06:** The system shall show upload status as pending,
processing, completed, or failed.

**FR-DATA-07:** The system shall report validation errors at file and
row/field level where practical.

**FR-DATA-08:** A failed upload shall not partially overwrite a
previously valid dataset.

**FR-DATA-09:** Large sales files shall be processed in chunks/streaming
batches rather than requiring the entire raw dataset to remain in
application memory.

### Required Sales Fields

At minimum, a sales upload shall contain:

-   Date
-   Product ID
-   Quantity
-   Selling price

Where available, the system may also use city, order ID, discount,
landing price, category, and brand information.

### Acceptance Criteria

-   Valid CSV data passes validation and receives a dataset ID.
-   Missing required columns cause rejection.
-   Invalid rows are reported clearly.
-   A failed upload leaves the last valid dataset unchanged.

------------------------------------------------------------------------

## 4.4 Product Master

**FR-PROD-01:** The system shall maintain a product master containing a
unique product ID for each product.

**FR-PROD-02:** Product master records shall support product name, unit,
product type, brand, manufacturer, and category hierarchy when
available.

**FR-PROD-03:** The system shall validate uniqueness of product IDs.

**FR-PROD-04:** Sales records shall be matched to product master records
using product ID.

**FR-PROD-05:** Unmatched product IDs shall be reported and shall not be
silently discarded.

**FR-PROD-06:** Product master updates shall preserve data lineage
between source and processed records.

### Acceptance Criteria

Every processed product shall either match the product master or be
explicitly classified as unmatched according to the configured data
policy.

------------------------------------------------------------------------

## 4.5 Data Cleaning and Transformation

**FR-CLEAN-01:** The system shall standardize date values into a
consistent date/time representation.

**FR-CLEAN-02:** The system shall validate quantity and price numeric
fields.

**FR-CLEAN-03:** Duplicate records shall be detected according to the
configured duplicate definition.

**FR-CLEAN-04:** Missing required values shall be reported and handled
according to predefined cleaning rules.

**FR-CLEAN-05:** Negative quantities shall be rejected or separately
classified as returns/adjustments when the source explicitly identifies
them.

**FR-CLEAN-06:** Zero quantity and zero-price records shall be flagged
rather than silently removed.

**FR-CLEAN-07:** Cleaning operations shall produce processing
statistics, including input rows, accepted rows, rejected rows,
duplicates, missing values, and anomalies.

**FR-CLEAN-08:** Raw data shall remain unchanged by cleaning operations.

------------------------------------------------------------------------

## 4.6 Demand Aggregation

**FR-DEMAND-01:** The system shall aggregate cleaned sales into daily
demand records.

**FR-DEMAND-02:** Demand aggregation shall support at least product and
date dimensions.

**FR-DEMAND-03:** Where city information exists, the system shall
support product-city-date aggregation.

**FR-DEMAND-04:** The system shall calculate total quantity sold for
each aggregation period.

**FR-DEMAND-05:** The system may calculate average selling price and
total discount for each aggregation period when source fields are
available.

**FR-DEMAND-06:** The system shall distinguish observed sales demand
from model-derived values.

------------------------------------------------------------------------

## 4.7 Demand Forecasting

**FR-FORECAST-01:** The system shall generate short-term demand
forecasts for eligible products.

**FR-FORECAST-02:** The system shall support 7-day, 14-day, and 30-day
forecast horizons.

**FR-FORECAST-03:** The system shall use time-ordered historical data
and shall not randomly shuffle observations when training/evaluating
forecasting models.

**FR-FORECAST-04:** The system shall provide at least one baseline
forecasting method and a Prophet-based model where data sufficiency
permits.

**FR-FORECAST-05:** The system shall record model name, training period,
forecast horizon, execution time, and evaluation metrics with each
forecast run.

**FR-FORECAST-06:** The system shall not claim annual seasonality when
the available historical period is insufficient to support it.

**FR-FORECAST-07:** Products with insufficient historical observations
shall be marked as insufficient-data rather than producing misleading
forecasts.

**FR-FORECAST-08:** Forecast results shall include forecast date and
predicted demand.

**FR-FORECAST-09:** Where supported by the model, the system shall store
prediction intervals/confidence bounds.

**FR-FORECAST-10:** Users shall be able to select a product and forecast
horizon from the dashboard.

### Acceptance Criteria

A forecast run for an eligible product produces dated predictions for
the selected horizon and stores model metadata. An ineligible product
produces a clear insufficient-data message instead of a fabricated
forecast.

------------------------------------------------------------------------

## 4.8 Forecast Evaluation

**FR-EVAL-01:** The system shall evaluate forecasts using a time-based
holdout/test period.

**FR-EVAL-02:** The system shall calculate MAE and RMSE where
applicable.

**FR-EVAL-03:** The system may calculate an appropriate percentage-based
metric only when its assumptions are satisfied.

**FR-EVAL-04:** The system shall compare the selected ML/model forecast
against a baseline where both are available.

**FR-EVAL-05:** Evaluation results shall be stored with model version
and evaluation period.

**FR-EVAL-06:** The dashboard shall present evaluation metrics in
understandable form.

------------------------------------------------------------------------

## 4.9 Inventory Intelligence

**FR-INV-01:** The system shall provide inventory decision metrics based
on observed demand and configured/model-derived inventory assumptions.

**FR-INV-02:** The system shall calculate safety stock using the
configured methodology.

**FR-INV-03:** The system shall calculate reorder point using the
defined demand, lead-time, and safety-stock inputs.

**FR-INV-04:** The system shall calculate reorder quantity using the
configured reorder/EOQ methodology where required inputs exist.

**FR-INV-05:** The system shall identify stockout risk.

**FR-INV-06:** The system shall identify overstock risk.

**FR-INV-07:** Model-derived or simulated inventory shall be explicitly
labeled as derived/simulated.

**FR-INV-08:** Actual owner-uploaded inventory shall take precedence
over simulated inventory for inventory calculations when valid actual
data is available.

**FR-INV-09:** Inventory recommendations shall show the major inputs
used to derive the recommendation.

**FR-INV-10:** The system shall not automatically place an order with a
supplier.

### Acceptance Criteria

For a product with valid demand, lead time, and stock inputs, the system
calculates a reorder point and displays whether current/estimated stock
indicates reorder, normal, stockout-risk, or overstock-risk status.

------------------------------------------------------------------------

## 4.10 Trends and Product Performance

**FR-TREND-01:** The system shall identify top-selling products by
quantity for a selected period.

**FR-TREND-02:** The system shall identify low-performing products using
configured metrics.

**FR-TREND-03:** The system shall calculate product growth/change over
comparable periods when sufficient data exists.

**FR-TREND-04:** The system shall present category/brand trends when
corresponding product-master fields exist.

**FR-TREND-05:** Trend results shall display the selected time period
and metric used.

------------------------------------------------------------------------

## 4.11 Anomaly Detection

**FR-ANOM-01:** The system shall detect unusual demand spikes or drops
using a defined statistical/ML method.

**FR-ANOM-02:** The system shall identify unusually fast-selling
products based on configurable thresholds or model output.

**FR-ANOM-03:** Where inventory data is available, the system shall flag
potential demand-inventory mismatches.

**FR-ANOM-04:** Each anomaly shall contain product, date/period, metric,
severity, and reason/value information where available.

**FR-ANOM-05:** The system shall not label normal variation as an
anomaly solely because it is different from another product.

------------------------------------------------------------------------

## 4.12 Price and Discount Analysis

**FR-PRICE-01:** The system shall display selling-price and discount
information when available in the source data.

**FR-PRICE-02:** The system shall support comparison of demand across
price/discount periods.

**FR-PRICE-03:** The system shall clearly distinguish
correlation/association from causal conclusions.

**FR-PRICE-04:** If price or discount data is unavailable, the
corresponding analysis shall be disabled with a clear explanation.

------------------------------------------------------------------------

## 4.13 Dashboard

**FR-DASH-01:** The dashboard shall display key business KPIs.

**FR-DASH-02:** KPIs shall include relevant measures such as total
demand, top products, forecast status, inventory risk, and detected
alerts.

**FR-DASH-03:** Users shall be able to filter dashboard results by
available dimensions such as date, product, category, brand, and city.

**FR-DASH-04:** The dashboard shall provide actual-versus-forecast
visualization.

**FR-DASH-05:** The dashboard shall display inventory recommendations
and risk alerts.

**FR-DASH-06:** The dashboard shall provide access to forecast
evaluation metrics.

**FR-DASH-07:** Empty datasets shall produce an informative empty state
instead of broken charts.

**FR-DASH-08:** Dashboard values shall identify their time period and
units.

------------------------------------------------------------------------

## 4.14 RAG Chatbot

**FR-RAG-01:** The system shall provide a natural-language interface for
questions about available project data and analytics.

**FR-RAG-02:** The chatbot shall retrieve relevant approved data/context
before generating an answer.

**FR-RAG-03:** The chatbot shall answer only within the data and
capabilities available to it.

**FR-RAG-04:** If the requested information is unavailable, the chatbot
shall explicitly state that the data is unavailable rather than
inventing an answer.

**FR-RAG-05:** The chatbot shall not expose passwords, JWTs, database
credentials, or restricted administrative data.

**FR-RAG-06:** The chatbot shall support questions such as top products,
forecast values, inventory risks, trends, and available recommendations.

**FR-RAG-07:** Chatbot responses shall identify the relevant
product/time period when applicable.

------------------------------------------------------------------------

# 5. Data Requirements

## 5.1 Sales Data

Required logical fields:

  ------------------------------------------------------------------------
  Field                                     Required Rule
  --------------------- ---------------------------- ---------------------
  date                                           Yes Valid date

  product_id                                     Yes Non-empty identifier

  quantity                                       Yes Numeric; negative
                                                     only if explicitly
                                                     supported as returns

  selling_price                                  Yes Numeric; zero values
                                                     flagged

  city_name                                 Optional Valid text

  order_id                                  Optional Source transaction
                                                     identifier

  discount                                  Optional Numeric

  landing_price                             Optional Numeric
  ------------------------------------------------------------------------

## 5.2 Product Master

Required logical field: `product_id`.

Recommended fields:

`product_name, unit, product_type, brand_name, manufacturer_name, l0_category, l1_category, l2_category`.

## 5.3 Inventory Data

Where actual inventory is uploaded, the system shall support:

`date, product_id, opening_stock, stock_received, closing_stock`.

The system shall validate the stock relationship when sufficient
sales/receipt information is available.

## 5.4 Calendar Data

The system may later support structured calendar features including:

`date, festival_name, festival_type, is_festival, is_public_holiday, is_weekend, days_to_festival, festival_window, season`.

## 5.5 Weather Data

The system may later support city/date weather features including:

`date, city_name, temperature_avg, temperature_min, temperature_max, rainfall_mm, humidity, weather_condition`.

These external datasets are optional inputs and shall not be assumed to
exist for the core MVP.

------------------------------------------------------------------------

# 6. Business Rules

**BR-01:** Raw uploaded data shall be preserved and shall not be
overwritten by cleaning.

**BR-02:** Every processed dataset shall be traceable to its source
upload.

**BR-03:** Product IDs shall be the primary matching key between sales
and product master unless an explicitly configured mapping is provided.

**BR-04:** Forecasting shall use chronological data splits.

**BR-05:** Annual seasonality shall not be claimed without adequate
historical evidence.

**BR-06:** Inventory values generated by the system shall be labeled
model-derived/simulated unless supplied as actual inventory by the
owner.

**BR-07:** Actual valid inventory data shall override simulated
inventory for decision calculations.

**BR-08:** Forecasts shall not be generated for products that fail
minimum data-sufficiency rules.

**BR-09:** Zero and negative values shall follow explicit validation
policies and shall never be silently transformed.

**BR-10:** Recommendations shall be advisory and shall require user
action for execution.

**BR-11:** Price/discount analysis shall not be described as causal
unless an appropriate causal methodology has been implemented.

**BR-12:** Missing optional data shall disable only dependent
functionality and shall not cause the complete system to fail.

------------------------------------------------------------------------

# 7. Validation Requirements

The system shall validate:

1.  File format and size.
2.  Required columns.
3.  Column names/types.
4.  Date parseability.
5.  Product ID presence.
6.  Quantity numeric validity.
7.  Price numeric validity.
8.  Duplicate records.
9.  Missing values.
10. Negative quantities.
11. Zero quantity/price records.
12. Product-master uniqueness.
13. Sales/product matching.
14. Inventory consistency where applicable.
15. Sufficient historical observations for forecasting.
16. Valid forecast horizon.
17. User input ranges and filter values.

Validation results shall be visible to authorized users before or after
processing, as appropriate.

------------------------------------------------------------------------

# 8. Error Handling

**ERR-01:** API errors shall return structured JSON responses containing
an error code/message suitable for the client.

**ERR-02:** User-facing messages shall be understandable and shall not
expose stack traces or sensitive implementation details.

**ERR-03:** Validation errors shall identify the affected field/row when
practical.

**ERR-04:** Unauthorized requests shall return HTTP 401.

**ERR-05:** Forbidden operations shall return HTTP 403.

**ERR-06:** Missing resources shall return HTTP 404.

**ERR-07:** Invalid request data shall return HTTP 400 or 422 according
to the API validation convention.

**ERR-08:** Unexpected server failures shall return HTTP 500 and be
logged securely.

**ERR-09:** Forecast failures for one product shall not corrupt
forecasts already completed for other products.

**ERR-10:** If a chart/API has no data, the UI shall display a clear
empty state rather than a misleading zero.

------------------------------------------------------------------------

# 9. Edge Cases

The system shall handle at least the following:

-   Empty CSV file.
-   CSV with only headers.
-   Missing required columns.
-   Duplicate product IDs.
-   Product ID present in sales but absent from product master.
-   Duplicate sales rows.
-   Null dates.
-   Invalid dates.
-   Future-dated sales records.
-   Negative quantities.
-   Zero quantities.
-   Zero selling prices.
-   Extremely large quantity/price values.
-   Product with only one or very few observations.
-   Product with no recent sales.
-   Intermittent demand.
-   Constant demand.
-   All-zero demand for a selected period.
-   No inventory data.
-   Inventory lower than zero after calculation.
-   Missing lead time.
-   Missing safety-stock inputs.
-   Forecast horizon longer than available supported period.
-   No data for selected filters.
-   Multiple uploaded versions of the same dataset.
-   Interrupted upload/processing.
-   Database unavailable during processing.
-   Expired authentication token.
-   Unauthorized access to another user's resource.
-   Chatbot question outside available data.
-   Chatbot retrieval returning no relevant context.

For each case, the system shall fail safely, report the condition
clearly, and avoid producing misleading business recommendations.

------------------------------------------------------------------------

# 10. Security Requirements

**SEC-01:** All authenticated endpoints shall require valid
authentication.

**SEC-02:** Passwords shall be securely hashed using a modern
password-hashing algorithm.

**SEC-03:** JWT secrets/signing keys shall be stored outside source
code, such as environment variables or a secure secret store.

**SEC-04:** Database credentials shall never be exposed to the frontend.

**SEC-05:** SQL queries shall use parameterized/database-safe mechanisms
to prevent SQL injection.

**SEC-06:** Uploaded files shall be validated before processing and
shall not be executed as code.

**SEC-07:** File upload size shall be limited.

**SEC-08:** Sensitive values shall not be written to application logs.

**SEC-09:** Administrative endpoints shall enforce role-based
authorization.

**SEC-10:** The application shall apply appropriate CORS configuration
and shall not allow unrestricted origins in production.

**SEC-11:** The chatbot shall apply access controls before retrieving
restricted data.

**SEC-12:** Error responses shall not expose database schema,
credentials, stack traces, filesystem paths, or internal secrets.

**SEC-13:** Production traffic shall use HTTPS.

**SEC-14:** The system shall maintain audit information for important
administrative and data-processing operations where feasible.

------------------------------------------------------------------------

# 11. Performance and Reliability Requirements

**PERF-01:** Normal dashboard API requests shall target a response time
of **≤ 3 seconds** under the defined MVP test load, excluding
long-running ML jobs.

**PERF-02:** Long-running upload, cleaning, aggregation, and forecasting
jobs shall execute asynchronously or through a background-job mechanism
where required.

**PERF-03:** The UI shall provide processing status for long-running
jobs.

**PERF-04:** Large CSV processing shall use memory-efficient/chunked
processing.

**PERF-05:** PostgreSQL indexes shall be created for frequently
filtered/joined fields such as product ID and date.

**PERF-06:** Forecasting shall operate on aggregated daily demand rather
than raw transaction rows.

**PERF-07:** The system shall prevent duplicate processing caused by
accidental repeated requests where an idempotency strategy is
applicable.

**PERF-08:** A failed ML job shall not corrupt stored historical data.

**PERF-09:** The MVP shall be tested using representative project-scale
data before final demonstration/deployment.

### Reliability Target

For the academic MVP, normal application operations should complete
without unhandled errors during the defined demonstration/test workload.
Exact production SLA is outside the MVP scope.

------------------------------------------------------------------------

# 12. API Requirements

The backend shall expose logically separated APIs for:

-   Authentication.
-   Users/roles.
-   Dataset upload and validation.
-   Product master.
-   Data-processing status.
-   Demand aggregation.
-   Forecasting.
-   Forecast evaluation.
-   Inventory intelligence.
-   Trends/anomalies.
-   Price/discount analysis.
-   Dashboard KPIs.
-   RAG chatbot.

Each protected API shall document:

-   HTTP method.
-   Endpoint.
-   Authentication requirement.
-   Required role.
-   Request schema.
-   Response schema.
-   Validation rules.
-   Error codes.

------------------------------------------------------------------------

# 13. UI Requirements

The React application shall provide, at minimum:

1.  Login page.
2.  Dashboard.
3.  Data upload page.
4.  Data validation/status view.
5.  Forecast page.
6.  Inventory intelligence page.
7.  Trends/anomalies page.
8.  Forecast evaluation view.
9.  RAG chatbot interface.
10. Administrator functions where applicable.

The UI shall provide loading, success, error, and empty states for
data-driven components.

------------------------------------------------------------------------

# 14. Acceptance Criteria

## AC-01 Authentication

-   A valid user can log in.
-   Invalid credentials are rejected.
-   Protected endpoints reject unauthenticated requests.
-   Role restrictions are enforced server-side.

## AC-02 Data Upload

-   A valid sales CSV is accepted.
-   Invalid schema is rejected with clear validation errors.
-   Raw data remains preserved.
-   Processing status is visible.

## AC-03 Product Integration

-   Product master IDs are validated for uniqueness.
-   Sales records are matched against product master IDs.
-   Unmatched IDs are reported.

## AC-04 Data Processing

-   Cleaned data is generated without modifying raw data.
-   Daily product demand is generated correctly from valid sales
    records.
-   Processing statistics are available.

## AC-05 Forecasting

-   An eligible product can receive 7/14/30-day forecasts.
-   Forecasts are generated chronologically.
-   Insufficient-history products receive an appropriate warning.
-   Model metadata is stored.

## AC-06 Evaluation

-   A time-based test period is used.
-   MAE/RMSE are calculated where applicable.
-   Baseline comparison is available.

## AC-07 Inventory

-   Safety stock/reorder point/reorder quantity are calculated when
    required inputs exist.
-   Stockout/overstock risk is identified.
-   Derived inventory is clearly labeled.
-   Actual inventory can replace derived inventory when valid data is
    uploaded.

## AC-08 Analytics

-   Top products and product trends are displayed.
-   Demand anomalies are detected and explained with relevant metrics.
-   Price/discount analysis is available when source data supports it.

## AC-09 Dashboard

-   KPIs load correctly.
-   Actual vs forecast is displayed.
-   Inventory risks and recommendations are visible.
-   Filters update displayed results correctly.
-   Empty states are handled.

## AC-10 RAG Chatbot

-   The chatbot answers supported data questions using retrieved project
    data.
-   Unsupported/unavailable questions receive an explicit limitation
    response.
-   Restricted information is not exposed.

## AC-11 Security

-   Passwords are not stored in plaintext.
-   Secrets are not committed to source code.
-   Unauthorized roles cannot access restricted APIs.
-   SQL injection and unsafe file-processing paths are mitigated through
    secure implementation.

## AC-12 Performance

-   Dashboard requests meet the MVP response target under the agreed
    test load.
-   Large data processing does not require loading the entire raw file
    into memory.
-   Long-running operations provide status feedback.

------------------------------------------------------------------------

# 15. Data Lineage and Traceability

Every processed analytical result should be traceable to:

**Source upload → Raw dataset → Validation → Cleaning → Product matching
→ Daily aggregation → Model/analytics run → Result →
Dashboard/recommendation**

The system shall retain sufficient metadata to identify the source
dataset and processing/model version used for important analytical
results.

------------------------------------------------------------------------

# 16. Assumptions

1.  Users have valid CSV data or access to the project's approved
    dataset.
2.  Product IDs are sufficiently consistent to support product matching.
3.  The initial system focuses on short-term demand rather than
    long-term annual forecasting.
4.  Calendar and weather data are optional future inputs for the MVP
    foundation.
5.  Inventory generated before actual inventory upload is
    model-derived/simulated and shall be labeled accordingly.
6.  Forecast quality depends on data quality, history length, product
    demand characteristics, and available external variables.
7.  The system provides recommendations for decision support and does
    not execute purchases.

------------------------------------------------------------------------

# 17. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                    Impact                  Mitigation
  ----------------------- ----------------------- -----------------------
  Insufficient history    Weak                    Use baseline models,
                          forecast/seasonality    short horizons, and
                                                  data-sufficiency checks

  Missing product matches Incorrect aggregation   Report unmatched IDs
                                                  and preserve mapping
                                                  statistics

  Poor data quality       Incorrect decisions     Validate and clean
                                                  before analytics

  Sparse/intermittent     Forecast instability    Use suitability checks
  demand                                          and appropriate
                                                  baselines

  Simulated inventory     Business                Explicitly label
  mistaken for real       misinterpretation       derived inventory

  Large files             Memory/performance      Chunked processing and
                          issues                  database aggregation

  Unauthorized access     Data exposure           JWT + RBAC + backend
                                                  authorization

  Chatbot hallucination   Incorrect advice        Retrieval grounding,
                                                  scope limits, and
                                                  unavailable-data
                                                  responses

  External data           Missing context         Make calendar/weather
  unavailable             features                optional and modular

  Model overconfidence    Bad decisions           Show evaluation metrics
                                                  and prediction
                                                  uncertainty where
                                                  available
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 18. Definition of Done

The MVP shall be considered complete when an authorized retail user can:

1.  Log in securely.
2.  Upload valid sales/product/inventory CSV data.
3.  View validation and processing results.
4.  Generate daily demand data.
5.  Generate eligible 7/14/30-day forecasts.
6.  View forecast evaluation against a baseline.
7.  View inventory risk and reorder recommendations.
8.  View product trends and anomalies.
9.  Inspect price/discount relationships when supported by data.
10. View all major outputs through the dashboard.
11. Ask supported business questions through the RAG chatbot.
12. Receive clear errors/empty states for unsupported or insufficient
    data.
13. Operate without exposing restricted data or credentials.

------------------------------------------------------------------------

# 19. Requirement Traceability Summary

  Requirement Area   Primary IDs          Validation Evidence
  ------------------ -------------------- -----------------------------------
  Authentication     FR-AUTH-01--07       Login/API/security tests
  Authorization      FR-AUTHZ-01--04      RBAC/API tests
  Upload             FR-DATA-01--09       Upload/validation tests
  Product Master     FR-PROD-01--06       Matching/data tests
  Cleaning           FR-CLEAN-01--08      Data-quality tests
  Demand             FR-DEMAND-01--06     Aggregation tests
  Forecasting        FR-FORECAST-01--10   Forecast/model tests
  Evaluation         FR-EVAL-01--06       Metric/time-split tests
  Inventory          FR-INV-01--10        Formula/business-rule tests
  Trends             FR-TREND-01--05      Analytics tests
  Anomalies          FR-ANOM-01--05       Detection tests
  Price/Discount     FR-PRICE-01--04      Analytics tests
  Dashboard          FR-DASH-01--08       UI/API tests
  RAG                FR-RAG-01--07        Retrieval/response/security tests
  Security           SEC-01--14           Security tests
  Performance        PERF-01--09          Load/performance tests

------------------------------------------------------------------------

**Document Status:** Draft for implementation and academic review\
**Version:** 1.0
