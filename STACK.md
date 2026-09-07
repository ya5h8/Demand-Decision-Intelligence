# STACK.md

# Versions and Dependencies

> These are baseline target versions. Exact versions must be pinned in
> the final dependency files before deployment.

## Frontend

-   React 19.x --- UI/dashboard
-   Vite --- frontend build tooling
-   Recharts (or equivalent) --- analytics visualizations

## Backend

-   Python 3.11+ --- backend, data processing and ML
-   FastAPI --- REST API
-   Uvicorn --- ASGI server
-   Pydantic --- request/data validation

## Database

-   PostgreSQL 16+ --- persistent relational storage

Core data areas: `products`, `sales`, `daily_product_demand`,
`inventory`, `forecasts`, `forecast_evaluations`, `anomalies`,
`recommendations`, `users`, `upload_jobs`.

## Data / ML

-   Pandas --- cleaning, transformation and aggregation
-   NumPy --- numerical operations
-   Scikit-learn --- preprocessing, selected ML models and evaluation
-   Prophet --- interpretable time-series forecasting

## Authentication

-   JWT --- API authentication
-   PyJWT --- JWT implementation
-   Secure password hashing

## Chatbot / RAG

``` text
Question → Query understanding → Retrieve project data → Build context → LLM response
```

The exact LLM and vector-store provider will be selected during
implementation based on cost, availability and deployment requirements.

## Data Formats

-   CSV --- source and upload data
-   JSON --- API communication
-   PostgreSQL --- persistent structured data

## Dependency Policy

-   Pin exact versions before production deployment.
-   Keep development dependencies separate where practical.
-   Never commit secrets or API keys.
-   Record major dependency changes in `DECISIONS.md`.
