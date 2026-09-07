# SYSTEM ARCHITECTURE DOCUMENT
## Demand & Decision Intelligence System

**Document Type:** System Architecture Document  
**Version:** 1.0  
**Status:** Proposed Architecture  
**Architecture Principle:** Practical, modular, secure, and scalable without over-engineering

---

## 1. Purpose

This document defines the recommended architecture for the Demand & Decision Intelligence System. The platform is an AI/ML-based decision-support system for Indian retail/FMCG use cases. It processes sales and product data, generates short-term demand forecasts, provides inventory recommendations, identifies trends and anomalies, analyzes price/discount relationships, and provides a focused RAG chatbot for natural-language questions over project data.

The architecture is designed for an academic MVP and can be extended later for larger datasets and real retail deployments.

## 2. Architecture Goals

The system shall:

1. Support CSV-based sales and product data ingestion.
2. Preserve raw uploaded data separately from processed data.
3. Validate and clean data before analytical processing.
4. Store structured data in PostgreSQL.
5. Aggregate transaction-level sales into daily product demand.
6. Generate 7-day, 14-day, and 30-day forecasts.
7. Support baseline forecasting and Prophet-based forecasting.
8. Evaluate forecasts using time-based validation.
9. Calculate safety stock, reorder point, and reorder quantity.
10. Provide trends, anomaly detection, and price/discount insights.
11. Expose functionality through REST APIs.
12. Provide a React dashboard.
13. Provide a controlled RAG chatbot over approved project data.
14. Use JWT authentication and role-based authorization.
15. Remain practical enough for a single application environment initially.
16. Allow later scaling without redesigning the core system.

# 3. High-Level Architecture

```text
                         ┌──────────────────────────┐
                         │       Web Browser         │
                         │      React Dashboard     │
                         └────────────┬─────────────┘
                                      │ HTTPS
                                      ▼
                         ┌──────────────────────────┐
                         │      FastAPI Backend      │
                         │  REST API + Auth + RBAC  │
                         └────────────┬─────────────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
             ▼                        ▼                        ▼
   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
   │ Data Processing  │      │ Forecasting &   │      │ Decision &      │
   │ / Validation     │      │ Evaluation      │      │ Analytics       │
   └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
            │                        │                        │
            └────────────────────────┼────────────────────────┘
                                     ▼
                         ┌──────────────────────────┐
                         │       PostgreSQL         │
                         │ Sales/Product/Results/   │
                         │ Inventory/Users/Metadata │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │ Raw File/Object Storage  │
                         │ Uploaded CSV + Artifacts │
                         └──────────────────────────┘

                         ┌──────────────────────────┐
                         │      RAG Chatbot         │
                         │ Retrieval + LLM Provider │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                              Approved project data
```

# 4. Recommended Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js | Dashboard and user interface |
| Build | Vite | Frontend development/build |
| Charts | Recharts | Forecast and analytics visualization |
| Backend | Python + FastAPI | REST APIs and application logic |
| API Server | Uvicorn | ASGI application server |
| Validation | Pydantic | API request/response validation |
| Database | PostgreSQL | Structured persistent storage |
| Data Processing | Pandas, NumPy | Cleaning, transformation and aggregation |
| ML | Scikit-learn | Baselines, metrics and analytical processing |
| Forecasting | Prophet | Time-series forecasting |
| Authentication | JWT | Stateless authentication |
| Password Security | bcrypt/Argon2-compatible hashing | Password protection |
| RAG | Retrieval layer + selected LLM provider | Natural-language project-data queries |
| Version Control | Git + GitHub | Source-code management |
| Deployment | Docker-compatible deployment | Reproducible deployment |
| Monitoring | Logs + health checks | Operational monitoring |

Exact package versions should be pinned before deployment.

# 5. Frontend Architecture

The frontend shall use React.js. Recommended structure:

```text
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   ├── charts/
│   ├── auth/
│   └── App.jsx
├── public/
└── package.json
```

## Main Screens

1. Login
2. Dashboard
3. Data Upload
4. Data Validation Status
5. Forecasting
6. Inventory Intelligence
7. Trends & Anomalies
8. Price/Discount Insights
9. Forecast Evaluation
10. RAG Chatbot

## Dashboard

The dashboard should show total demand/sales KPIs, forecast summaries, actual-vs-forecast charts, reorder alerts, stockout/overstock risk, top/low-performing products, trends, anomalies, price/discount insights, forecast accuracy, and processing status.

# 6. Backend Architecture

FastAPI shall act as the main backend application layer.

```text
backend/
├── api/
│   ├── auth.py
│   ├── upload.py
│   ├── products.py
│   ├── sales.py
│   ├── forecast.py
│   ├── inventory.py
│   ├── analytics.py
│   ├── chatbot.py
│   └── health.py
├── services/
│   ├── ingestion_service.py
│   ├── validation_service.py
│   ├── forecasting_service.py
│   ├── inventory_service.py
│   ├── anomaly_service.py
│   └── rag_service.py
├── models/
├── schemas/
├── core/
├── db/
└── main.py
```

API routes should remain thin; business logic belongs in service modules.

# 7. API Architecture

REST APIs shall use HTTPS in deployed environments.

## Authentication

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Data

```text
POST /api/data/upload
GET  /api/data/uploads
GET  /api/data/uploads/{id}
GET  /api/data/validation/{id}
```

## Products

```text
GET /api/products
GET /api/products/{product_id}
```

## Forecasting

```text
POST /api/forecast/run
GET  /api/forecast
GET  /api/forecast/{product_id}
GET  /api/forecast/evaluation
```

## Inventory

```text
GET /api/inventory/summary
GET /api/inventory/alerts
GET /api/inventory/recommendations
```

## Analytics

```text
GET /api/analytics/trends
GET /api/analytics/anomalies
GET /api/analytics/price-insights
GET /api/analytics/top-products
```

## Chatbot and Health

```text
POST /api/chat/query
GET  /api/health
```

# 8. Authentication and Authorization

## Authentication Flow

```text
User → Login API → Validate credentials → Verify password hash
     → Generate JWT → Authenticated API requests
```

Passwords shall never be stored in plaintext.

## Roles and Permissions

| Capability | Admin | Owner/Manager | Viewer |
|---|:---:|:---:|:---:|
| Login | ✓ | ✓ | ✓ |
| Upload data | ✓ | ✓ | — |
| Review validation | ✓ | ✓ | — |
| Run processing | ✓ | ✓ | — |
| Run forecasting | ✓ | ✓ | — |
| View dashboard | ✓ | ✓ | ✓ |
| View inventory | ✓ | ✓ | ✓ |
| View trends/anomalies | ✓ | ✓ | ✓ |
| View evaluation | ✓ | ✓ | ✓ |
| Use chatbot | ✓ | ✓ | ✓ |
| Manage users | ✓ | — | — |
| System administration | ✓ | — | — |

Authorization shall be enforced on the backend; frontend controls alone are not sufficient.

# 9. Data Architecture

## 9.1 Data Sources

The primary foundation consists of transaction-level sales data and product master data. The architecture can later accept calendar/festival features, weather, commodity prices, additional historical sales, and actual inventory uploaded by the owner.

External data shall not be treated as available until validated and integrated.

## 9.2 Data Flow

```text
Raw CSV
   ↓
Upload
   ↓
Schema Validation
   ↓
Data Quality Checks
   ↓
Cleaning / Transformation
   ↓
Product Master Join
   ↓
Daily Product Demand
   ├── Forecasting
   ├── Trends / Anomalies
   └── Inventory Intelligence
```

# 10. Storage Architecture

## Raw Storage

Original uploaded files shall be preserved separately and treated as immutable.

```text
storage/
├── raw/
│   ├── sales/
│   ├── products/
│   └── inventory/
├── processed/
├── forecasts/
└── reports/
```

## PostgreSQL

PostgreSQL should store structured application and analytical data, including:

```text
users
roles
uploads
validation_results
products
sales
daily_product_demand
forecast_runs
forecasts
forecast_evaluations
inventory
inventory_recommendations
anomalies
analytics_results
chat_sessions
audit_logs
```

Large raw files should not be unnecessarily duplicated inside relational tables.

# 11. Core Processing Architecture

## Upload

```text
React Upload → FastAPI → File/type/size check → Schema validation
→ Data-quality validation → Raw storage → Upload metadata → Status
```

## Processing

```text
Validated Sales + Product Master
        ↓
Cleaning
        ↓
Join Product Information
        ↓
Aggregate by Date/Product/City
        ↓
Daily Product Demand
        ↓
PostgreSQL
```

## Forecasting

```text
Daily Product Demand
        ↓
Time-based train/test split
        ↓
Baseline model
        ↓
Prophet
        ↓
Evaluation
        ↓
7 / 14 / 30 day forecast
        ↓
Store results
        ↓
Dashboard
```

Forecasting should use aggregated daily demand rather than raw transaction rows.

# 12. Inventory Intelligence

Inventory intelligence is a decision-support layer supporting demand estimate, lead time, safety stock, reorder point, reorder quantity, stockout risk, and overstock risk.

Basic relationship:

**Reorder Point = Average Demand × Lead Time + Safety Stock**

The system must distinguish between actual inventory supplied by an owner and model-derived/simulated inventory used for demonstration. Simulated inventory must never be presented as historical actual inventory.

# 13. Forecasting Architecture

The MVP should support:

- Naive and/or moving-average baseline
- Prophet forecasting
- 7-day, 14-day and 30-day horizons
- Time-based evaluation
- MAE, RMSE and appropriate percentage-based metrics where valid

Each forecast run should store model name/version, training period, evaluation period, horizon, metrics, run timestamp, and source-data version.

# 14. Trends and Anomalies

The analytics layer shall calculate:

### Trends
- Best-selling products
- Low-performing products
- Demand growth/decline
- Category performance
- City performance
- Product-level changes

### Anomalies
- Demand spikes
- Demand drops
- Fast-selling products
- Potential inventory mismatch

Anomaly outputs should provide enough context to explain why an item was flagged.

# 15. Price and Discount Analysis

The system shall analyze relationships between selling price, MRP, discount and demand quantity.

Initial analysis should describe observed relationships and should not claim causal effects unless a suitable causal methodology is implemented.

# 16. RAG Chatbot Architecture

```text
User Question
      ↓
Chat API
      ↓
Query Understanding
      ↓
Retrieve approved project data/results
      ↓
Context Construction
      ↓
LLM Provider
      ↓
Grounded Answer
      ↓
React Chat Interface
```

The chatbot should answer supported project-data questions such as forecasted demand, reorder needs, stockout risk, anomalies, forecast accuracy and category trends. It should clearly state when the requested information is unavailable.

The chatbot does not require custom LLM training.

# 17. Security Architecture

The system shall:

- Use HTTPS in deployed environments.
- Hash passwords using a strong password hashing algorithm.
- Use JWT for authenticated API access.
- Enforce role-based authorization server-side.
- Validate all API inputs.
- Restrict upload file types and sizes.
- Avoid exposing stack traces to users.
- Store secrets in environment variables or a secret manager.
- Never commit passwords, API keys, database credentials or JWT secrets to Git.
- Apply least-privilege database access.
- Use parameterized queries/ORM operations.
- Maintain appropriate database backups.
- Record important administrative/security actions.

Uploaded files should receive unique identifiers and must not be interpreted as executable code.

# 18. Error Handling

APIs should return consistent structured errors.

```json
{
  "success": false,
  "error_code": "INVALID_FILE_SCHEMA",
  "message": "The uploaded sales file is missing the required product_id column."
}
```

Error categories include authentication, authorization, validation, file, data quality, processing, forecasting, database, external service and unexpected system errors.

User-facing messages should be actionable without exposing internal implementation details.

# 19. Edge Cases

The architecture shall account for:

1. Empty files.
2. Missing required columns.
3. Duplicate records.
4. Unknown product IDs.
5. Null or invalid dates.
6. Zero quantity.
7. Zero selling price.
8. Unsupported negative quantity.
9. Negative prices.
10. Missing product information.
11. Very large CSV files.
12. Insufficient history for forecasting.
13. Intermittent-demand products.
14. Products with no recent sales.
15. Negative or invalid forecast output.
16. Missing inventory information.
17. No reorder requirement.
18. No anomaly detected.
19. No evaluation period.
20. Duplicate uploads.
21. Unauthorized requests.
22. Expired JWT.
23. Unsupported chatbot questions.
24. Temporary database/service failures.

The system should fail safely and provide a useful error/status message.

# 20. Performance Architecture

The MVP should optimize the data pipeline without introducing unnecessary distributed infrastructure.

### Data Processing

- Process large CSVs in chunks when required.
- Aggregate before forecasting.
- Avoid unnecessary DataFrame copies.
- Use appropriate PostgreSQL indexes.

### Suggested Indexes

```text
sales(date)
sales(product_id)
sales(city_name)
daily_product_demand(date, product_id)
forecast(product_id, forecast_date)
inventory(product_id)
```

### Initial Performance Targets

- Normal dashboard APIs: approximately ≤2 seconds under normal MVP load.
- Simple authentication requests: approximately ≤1 second under normal MVP load.
- Long-running processing/forecasting should not block normal API requests.

These targets should be confirmed through load testing before production claims are made.

# 21. Background Processing

Long-running data processing and forecasting should execute as background jobs where required.

```text
API Request
    ↓
Create Job
    ↓
Background Worker
    ↓
Process Dataset
    ↓
Store Results
    ↓
Update Job Status
```

For the MVP, a simple background-job mechanism is sufficient. Celery/Redis or another dedicated queue should only be introduced when actual workload justifies it.

# 22. Deployment Architecture

A practical initial deployment is:

```text
                 Internet
                    ↓
               HTTPS / Domain
                    ↓
          ┌─────────┴─────────┐
          ↓                   ↓
     React Frontend      FastAPI Backend
                               ↓
                          PostgreSQL
                               ↓
                       File/Object Storage
```

Docker may be used for reproducible environments.

Initial services:

```text
frontend
backend
postgres
storage
```

For an academic MVP, these can run on a suitable cloud/VM or managed platform. A microservice deployment is unnecessary at this stage.

# 23. Environment Configuration

Separate development, testing and production configurations should be maintained.

Sensitive configuration includes:

```text
DATABASE_URL
JWT_SECRET
LLM_API_KEY
STORAGE credentials
```

Secrets must not be committed to source control.

# 24. Monitoring and Logging

The MVP should provide:

### Logs

- Authentication events
- Upload events
- Validation failures
- Processing jobs
- Forecast runs
- API errors
- Important administrative actions

### Health Check

```text
GET /api/health
```

The endpoint should verify application availability and, where appropriate, database connectivity.

Production monitoring may later add API response time, error rate, CPU/memory usage, database utilization, processing duration, forecast duration and job failure rate.

A full observability platform is not required for the MVP.

# 25. Scalability Strategy

## Stage 1 — Academic MVP

```text
React + FastAPI + PostgreSQL + File/Object Storage
```

## Stage 2 — Larger Data

Add chunked processing, background workers, object storage, connection pooling and database optimization.

## Stage 3 — Higher User Load

Add multiple FastAPI instances, a load balancer, dedicated workers, managed PostgreSQL, centralized logging and selective caching.

The system should not begin with Kubernetes, Kafka, microservices or a distributed warehouse unless measured requirements justify them.

# 26. Backup and Recovery

The system should:

1. Preserve raw uploaded datasets.
2. Back up PostgreSQL data regularly in production.
3. Store important generated artifacts separately where required.
4. Maintain upload and processing metadata.
5. Provide a documented restoration process.
6. Avoid destructive modification of original raw data.

# 27. Data Lineage

Every analytical result should be traceable through:

```text
Raw Upload
    ↓
Validation Result
    ↓
Cleaned Data
    ↓
Daily Demand
    ↓
Forecast Run
    ↓
Forecast Evaluation
    ↓
Inventory Recommendation
    ↓
Dashboard / Chatbot
```

Forecast metadata should identify the data/version used to produce the result.

# 28. Architecture Boundaries

| Component | Responsibility |
|---|---|
| React | Presentation and user interaction |
| FastAPI | APIs, authentication and orchestration |
| Validation Service | Data-quality checks |
| Processing Service | Cleaning and aggregation |
| Forecast Service | Forecast generation/evaluation |
| Inventory Service | Inventory calculations |
| Analytics Service | Trends, anomalies and price insights |
| RAG Service | Retrieval and natural-language response |
| PostgreSQL | Structured persistent data |
| File Storage | Raw files and selected artifacts |

This separation provides maintainability without requiring separate deployable microservices.

# 29. Recommended Repository Structure

```text
Demand-Decision-Intelligence/
│
├── frontend/
├── backend/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── schemas/
│   ├── db/
│   └── core/
│
├── dataset/
│   ├── raw/
│   │   ├── sales/
│   │   └── products/
│   ├── combined/
│   ├── cleaned/
│   ├── processed/
│   ├── inventory/
│   └── external/
│
├── models/
│   ├── forecasting/
│   └── evaluation/
│
├── docs/
│   ├── PRD.md
│   ├── CRD.md
│   ├── SRS.md
│   └── ARCHITECTURE.md
│
├── tests/
├── docker/
├── .env.example
└── README.md
```

# 30. Architecture Acceptance Criteria

### A-01
React communicates with FastAPI through documented REST APIs.

### A-02
Protected APIs reject unauthenticated requests.

### A-03
Role-based permissions prevent unauthorized operations.

### A-04
Uploaded files are validated before processing.

### A-05
Original raw data is preserved.

### A-06
Validated sales data can be transformed into daily product demand.

### A-07
Forecasting can generate 7-, 14-, and 30-day outputs.

### A-08
Forecast results contain model and evaluation metadata.

### A-09
Inventory recommendations can be calculated from demand and available inventory inputs.

### A-10
Dashboard APIs provide the required dashboard data.

### A-11
Analytics APIs return trend and anomaly results.

### A-12
The chatbot uses approved project data/context for supported questions.

### A-13
API errors return structured responses.

### A-14
Sensitive credentials are absent from source code.

### A-15
The application exposes a health-check endpoint.

### A-16
Large transaction datasets can be processed using aggregation/chunking without forecasting directly on every raw transaction.

### A-17
The architecture can later introduce background workers and multiple backend instances without changing the core domain structure.

# 31. Key Architectural Decisions

| Decision | Rationale |
|---|---|
| React.js | Suitable for an interactive analytics dashboard |
| FastAPI | Lightweight, Python-native and well suited to ML APIs |
| PostgreSQL | Reliable relational storage for structured retail data |
| Prophet | Practical interpretable time-series model for the MVP |
| Baseline models | Provide a benchmark for evaluating Prophet |
| REST API | Simple frontend-backend integration |
| JWT | Practical stateless authentication |
| Modular monolith | Avoids premature microservice complexity |
| Raw + processed storage | Preserves traceability and reproducibility |
| Aggregate before forecasting | Reduces processing cost and matches forecasting granularity |
| Background processing only when needed | Avoids unnecessary infrastructure |
| RAG instead of LLM training | Enables grounded natural-language access without model training |
| Time-based evaluation | Appropriate for forecasting |
| Actual inventory preferred | Prevents simulated inventory being mistaken for historical facts |

# 32. Non-Goals / Avoided Over-Engineering

The initial architecture does not require:

- Microservices
- Kubernetes
- Kafka
- Dedicated data warehouse
- Real-time streaming infrastructure
- Mobile application
- IoT integration
- Automated supplier purchasing
- Payment processing
- Full ERP integration
- Multi-country infrastructure
- Multi-warehouse optimization
- Reinforcement learning
- Custom LLM training
- Autonomous business decisions

These should only be considered if future requirements justify them.

# 33. Final Recommendation

The recommended architecture is a **modular monolithic system** consisting of:

**React.js frontend → FastAPI backend → PostgreSQL + file/object storage**, with Python-based data processing, forecasting, inventory intelligence, analytics, and a controlled RAG chatbot.

This architecture is appropriate for the current project because it is simple to develop, easy to test, practical to deploy, compatible with the selected Python ML stack, and straightforward to extend later.

The architecture should prioritize **data correctness, traceability, forecast evaluation, inventory decision support, security, and maintainability** over infrastructure complexity.
