# DEVELOPMENT PLAN
## Demand & Decision Intelligence System

**Version:** 1.0  
**Status:** Development Roadmap  
**Objective:** Convert the approved requirements, architecture, and UI/UX into an executable implementation plan.

## 1. Development Objective

Build an MVP that takes validated retail sales/product data through a complete pipeline and presents actionable demand and inventory intelligence through a React dashboard.

Target end-to-end flow:

```text
Upload
 → Validate
 → Clean
 → Store
 → Aggregate Daily Demand
 → Forecast
 → Evaluate
 → Inventory Intelligence
 → Trends / Anomalies / Price Insights
 → Dashboard
 → RAG Assistant
```

The project synopsis defines CSV/Excel data ingestion, PostgreSQL storage, Prophet forecasting, inventory recommendations including reorder point and EOQ, trend/anomaly analysis, forecast evaluation, a React dashboard, and a RAG chatbot as core system capabilities. fileciteturn6file0L30-L45

## 2. Development Principles

1. Build the data foundation before ML.
2. Build backend APIs before connecting complex frontend states.
3. Implement a working vertical slice early.
4. Validate every stage before moving downstream.
5. Use real project data for validation; clearly label derived/simulated inventory.
6. Keep the MVP modular but avoid premature microservices.
7. Do not add features that are not required by the approved scope.
8. Prefer interpretable and testable logic before advanced models.
9. Keep raw data immutable.
10. Use time-based evaluation for forecasting.

## 3. Recommended Priority Levels

| Priority | Meaning |
|---|---|
| P0 | Mandatory for MVP |
| P1 | Important for MVP |
| P2 | Useful after core MVP |
| P3 | Future enhancement |

## 4. MVP Scope

### P0

- Project setup
- Authentication
- User roles
- PostgreSQL schema
- Sales/product upload
- Data validation
- Data cleaning
- Product master integration
- Daily product demand aggregation
- Baseline forecasting
- Prophet forecasting
- 7/14/30-day forecasts
- Time-based evaluation
- Inventory calculations
- Reorder/stockout/overstock intelligence
- Core dashboard
- Trends
- Basic anomaly detection
- Basic price/discount analysis
- Error/loading/empty states
- Basic RAG chatbot
- Testing
- Deployment

### P1

- Better filtering
- Detailed forecast comparison
- Upload history
- Admin status pages
- More detailed audit logging
- Additional visualization polish

### P2

- More external calendar/weather factors
- More advanced anomaly techniques
- Background worker/queue if required by load
- Additional model experimentation

### P3

- Multi-warehouse optimization
- Automated purchasing
- ERP/POS integrations
- Mobile application
- Real-time streaming
- Advanced causal price optimization
- Autonomous decision execution

## 5. Phase 0 — Project Setup

### Tasks

1. Create repository structure.
2. Initialize React/Vite frontend.
3. Initialize FastAPI backend.
4. Configure PostgreSQL.
5. Add environment configuration.
6. Configure Git branching/commit conventions.
7. Add linting/formatting.
8. Create `.env.example`.
9. Add base README and documentation links.
10. Create development database.

### Deliverable

A developer can clone the repository, configure environment variables, start frontend/backend/database, and access a health endpoint.

### Dependency

None.

## 6. Phase 1 — Database Foundation

### Tasks

Create core tables:

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

Tasks:

- Define primary/foreign keys.
- Add required constraints.
- Add indexes based on query patterns.
- Create migrations.
- Add seed/admin user for development.
- Test insert/read/update behavior.

### Deliverable

Stable PostgreSQL schema and migration process.

### Dependency

Phase 0.

## 7. Phase 2 — Authentication and Authorization

### Tasks

- Implement login.
- Password hashing.
- JWT generation and verification.
- Current-user endpoint.
- Role middleware/dependencies.
- Protected routes.
- Logout/session handling.
- Unauthorized/forbidden responses.

### Acceptance

- Unauthenticated users cannot access protected APIs.
- Viewer cannot upload.
- Owner/Manager can access business functions.
- Admin can access administration functions.

### Dependency

Database Foundation.

## 8. Phase 3 — Data Ingestion and Validation

### Tasks

Implement:

```text
POST /api/data/upload
GET  /api/data/uploads
GET  /api/data/uploads/{id}
GET  /api/data/validation/{id}
```

Validation:

- File type
- File size
- Required columns
- Date format
- Product IDs
- Quantity
- Prices
- Nulls
- Duplicate records
- Product master matching
- Date range
- Zero/negative values according to business rules

Store:

- Original file
- Upload metadata
- Validation result
- Error/warning counts

### Deliverable

A user can upload a dataset and understand whether it is ready for processing.

### Dependency

Authentication + database.

## 9. Phase 4 — Cleaning and Data Processing

Pipeline:

```text
Raw Data
 ↓
Validation
 ↓
Cleaning
 ↓
Product Master Join
 ↓
Daily Aggregation
 ↓
Processed Data
```

Target daily demand fields:

```text
date
product_id
city_name
total_quantity
average_selling_price
total_discount
```

Additional product attributes may be attached after the product master join.

### Important

Do not train Prophet on raw transaction-level data. Aggregate to an appropriate time/product grain first.

### Deliverable

Reliable `daily_product_demand` table/API.

### Dependency

Phase 3.

## 10. Phase 5 — Forecasting Engine

### Step 1: Baseline

Implement:

- Naive forecast
- Moving-average baseline where useful

### Step 2: Prophet

Implement:

- Training dataset creation
- Model fitting
- Forecast generation
- Confidence intervals
- 7-day horizon
- 14-day horizon
- 30-day horizon

### Step 3: Evaluation

Use time-based train/test splits.

Metrics:

- MAE
- RMSE where appropriate
- MAPE where valid

Store:

```text
model
model_version
training_period
evaluation_period
forecast_horizon
metrics
run_timestamp
dataset_version
```

### Deliverable

Forecast API and reproducible forecast results.

### Dependency

Phase 4.

## 11. Phase 6 — Inventory Intelligence

Implement:

- Safety stock
- Reorder point
- Reorder quantity
- Stockout risk
- Overstock risk
- EOQ where required

Core relationship:

```text
Reorder Point
= Average Demand × Lead Time + Safety Stock
```

Inputs should distinguish:

- Actual owner-provided inventory
- Model-derived/simulated inventory

### Deliverable

Inventory recommendation API and database records.

### Dependency

Daily demand + forecast + inventory data.

## 12. Phase 7 — Analytics

### Trends

Implement:

- Top-selling products
- Low-performing products
- Demand growth/decline
- Category performance
- City performance where applicable

### Anomalies

Implement:

- Demand spikes
- Demand drops
- Fast-selling signals
- Potential inventory mismatches

### Price Insights

Implement:

- Price vs demand summaries
- Discount vs demand summaries

Do not claim causation from simple correlation/observational analysis.

### Dependency

Processed demand + product data; inventory analytics also depends on inventory results.

## 13. Phase 8 — Backend API Completion

Finalize endpoints:

```text
/auth/*
/data/*
/products/*
/forecast/*
/inventory/*
/analytics/*
/chat/*
/health
```

Tasks:

- Request/response schemas
- Pagination
- Filtering
- Sorting
- Consistent error format
- Authentication dependencies
- Authorization
- API documentation
- Logging
- Health checks

### Deliverable

Stable backend contract for frontend integration.

### Dependency

Phases 2–7.

## 14. Phase 9 — Frontend Foundation

Implement:

- React application shell
- Routing
- Sidebar
- Top bar
- Authentication screens
- Protected routes
- API service layer
- Common components
- Responsive layout
- Design tokens

### Dependency

Phase 0 and authentication API.

## 15. Phase 10 — Frontend MVP Screens

Build in this order:

1. Login
2. Dashboard
3. Data Upload
4. Validation Results
5. Forecast
6. Inventory Intelligence
7. Trends & Anomalies
8. Price Insights
9. Forecast Evaluation
10. AI Assistant

For every screen implement:

- Loading
- Success
- Error
- Empty
- Permission-denied state where relevant

### Dependency

Backend API contracts should be stable enough for each screen.

## 16. Phase 11 — RAG Chatbot

Implement:

```text
User Question
 ↓
Chat API
 ↓
Retrieve approved project data/context
 ↓
Build context
 ↓
LLM
 ↓
Grounded response
```

Initial supported questions should focus on:

- Forecasts
- Inventory recommendations
- Trends
- Anomalies
- Evaluation
- Product/category performance

The chatbot should say when information is unavailable rather than inventing an answer.

### Dependency

Analytics and forecast/inventory APIs or approved retrieval layer.

## 17. Phase 12 — Integration

Complete end-to-end integration:

```text
React
 ↕
FastAPI
 ↕
PostgreSQL
 ↕
Processing / ML Services
```

Test complete owner journey:

```text
Login
 → Upload
 → Validate
 → Process
 → Forecast
 → Review Inventory
 → Review Analytics
 → Ask Assistant
```

## 18. Phase 13 — Testing

### Unit Testing

Test:

- Validation functions
- Cleaning functions
- Aggregation
- Forecast metrics
- Inventory formulas
- Risk classification
- Authorization rules

### API Testing

Test:

- Authentication
- Authorization
- Upload endpoints
- Forecast endpoints
- Inventory endpoints
- Analytics endpoints
- Chat endpoint
- Health endpoint

### Frontend Testing

Test:

- Routing
- Forms
- Filters
- Tables
- Loading states
- Error states
- Responsive behavior
- Permission-based UI

### Integration Testing

Verify:

```text
Upload → Validate → Process → DB → Forecast → API → UI
```

### Performance Testing

Measure:

- Upload processing time
- API response time
- Forecast execution time
- Dashboard load time

## 19. Phase 14 — Bug Fixing and Hardening

Classify bugs:

### Critical
System cannot start, data corruption, authentication bypass, major incorrect business calculation.

### High
Core MVP function fails.

### Medium
Incorrect UI behavior or non-critical analytical issue.

### Low
Visual polish or minor usability issue.

Fix in order:

```text
Critical → High → Medium → Low
```

Every fixed bug should receive a regression test where practical.

## 20. Phase 15 — Security Review

Verify:

- No secrets in Git.
- Passwords are hashed.
- JWT verification works.
- Authorization is enforced server-side.
- File uploads are restricted.
- Inputs are validated.
- SQL injection protections are in place.
- Error responses do not expose stack traces.
- HTTPS is used in deployed environments.
- Sensitive logs are avoided.
- Database permissions follow least privilege.

## 21. Phase 16 — Deployment

Recommended MVP deployment:

```text
React Frontend
      ↓ HTTPS
FastAPI Backend
      ↓
PostgreSQL
      ↓
File/Object Storage
```

Deployment tasks:

1. Build frontend.
2. Build backend.
3. Configure production environment.
4. Configure PostgreSQL.
5. Configure storage.
6. Run migrations.
7. Create admin account securely.
8. Configure HTTPS/domain.
9. Configure health checks.
10. Deploy.
11. Run smoke tests.
12. Verify logs.

## 22. Monitoring

MVP monitoring:

- Application logs
- API error logs
- Upload failures
- Forecast failures
- Health endpoint
- Database connectivity
- Basic resource monitoring

Do not add a complex observability platform unless deployment requirements justify it.

## 23. Milestones

| Milestone | Outcome |
|---|---|
| M1 | Repository, environment and database ready |
| M2 | Authentication and roles working |
| M3 | Upload and validation working |
| M4 | Cleaned daily demand available |
| M5 | Forecasting and evaluation working |
| M6 | Inventory intelligence working |
| M7 | Analytics working |
| M8 | Dashboard MVP working |
| M9 | RAG assistant integrated |
| M10 | End-to-end testing complete |
| M11 | Security/performance hardening complete |
| M12 | Deployment and final acceptance |

## 24. Critical Dependencies

```text
Setup
 ↓
Database
 ↓
Authentication
 ↓
Upload/Validation
 ↓
Cleaning/Aggregation
 ↓
Forecasting
 ↓
Inventory + Analytics
 ↓
APIs
 ↓
Frontend
 ↓
RAG
 ↓
Testing
 ↓
Deployment
```

Frontend development can start in parallel using mocked API responses after API contracts are defined.

## 25. Parallel Workstreams

### Backend Team

- API
- Authentication
- Data processing
- Business logic

### ML/Data Team

- Data validation
- Aggregation
- Forecasting
- Evaluation
- Inventory calculations
- Analytics

### Frontend Team

- Design system
- Dashboard
- Upload
- Forecast
- Inventory
- Analytics
- Chatbot

### QA/Integration

- Test cases
- API testing
- End-to-end testing
- Regression
- Deployment verification

## 26. Definition of Done

A feature is Done only when:

1. Requirement is implemented.
2. API/data contract is documented where applicable.
3. Validation is implemented.
4. Error handling is implemented.
5. Loading/empty states exist where applicable.
6. Authorization is verified.
7. Unit/integration tests pass.
8. No critical/high known defect remains.
9. UI is responsive where applicable.
10. Feature works with representative project data.
11. Logs do not expose secrets or sensitive information.
12. Documentation is updated.

## 27. MVP Definition of Done

The MVP is complete when a valid user can:

1. Log in.
2. Upload supported sales/product/inventory data.
3. Receive validation results.
4. Process valid data.
5. View daily demand.
6. Generate 7/14/30-day forecasts.
7. Review forecast evaluation.
8. View inventory recommendations.
9. Identify stockout/overstock/reorder risks.
10. Review trends and anomalies.
11. Review basic price/discount insights.
12. View all major outputs in the dashboard.
13. Ask supported business questions through the RAG assistant.
14. Receive safe errors when data is missing or invalid.
15. Complete the full workflow without developer intervention.

## 28. Release Gate

Do not release the MVP until:

- Core requirements pass acceptance testing.
- Authentication/authorization tests pass.
- Forecast calculations are verified.
- Inventory formulas are verified.
- Data validation is verified.
- Dashboard displays backend results correctly.
- RAG responses are tested against known questions.
- No critical security issue remains.
- No critical/high data-integrity issue remains.
- Production environment passes smoke testing.

## 29. First Development Sprint

The team should begin with these concrete tasks:

### Day 1–2
- Create repository structure.
- Initialize React/Vite.
- Initialize FastAPI.
- Configure PostgreSQL.
- Create `.env.example`.
- Add health endpoint.

### Day 3–4
- Create database migrations.
- Implement users/roles.
- Implement password hashing and JWT.
- Implement protected API dependency.

### Day 5–7
- Implement upload endpoint.
- Implement CSV validation.
- Store upload metadata.
- Build upload UI.
- Display validation results.

### Sprint Exit Criteria

The first sprint succeeds when:

```text
Developer starts system
        ↓
Login
        ↓
Upload sales/product file
        ↓
Backend validates file
        ↓
Validation result stored in PostgreSQL
        ↓
Frontend displays result
```

This vertical slice should be completed before expanding into forecasting.

## 30. Final Development Strategy

The recommended sequence is:

**Foundation → Data → Forecasting → Decisions → Analytics → UI → RAG → Testing → Deployment**

This keeps the team from building a dashboard before reliable data exists and prevents ML work from being disconnected from the actual business workflow.

The project synopsis expects the overall flow to collect data, clean/validate it, train the forecasting model, generate forecasts, provide recommendations, detect anomalies, answer business queries through RAG, and display KPIs/alerts/insights through an interactive dashboard. fileciteturn6file2L169-L180

The expected outcomes also explicitly include reorder recommendations, EOQ, stockout/overstock warnings, trend analysis, anomaly detection, forecast evaluation, dashboard KPIs, and natural-language business insights. fileciteturn6file3L192-L213
