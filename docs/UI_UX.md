# UI/UX DESIGN DOCUMENT
## Demand & Decision Intelligence System

**Version:** 1.0  
**Status:** Implementation Ready  
**Design Direction:** Simple, modern, data-first, responsive

## 1. Purpose

This document defines the UI/UX structure for the Demand & Decision Intelligence System. The interface shall help retail/business users move from uploaded data to forecasts, inventory decisions, trends, anomalies, and business insights with minimal complexity.

The proposed system uses a React.js dashboard and presents demand forecasts, inventory status, alerts, trends, KPIs, and RAG-based natural-language insights.

## 2. UX Goals

1. Make the current business status understandable at a glance.
2. Make data upload and validation simple.
3. Make forecast results easy to interpret.
4. Turn forecasts into clear inventory actions.
5. Surface important risks without overwhelming the user.
6. Allow users to drill down from KPI → product → detailed insight.
7. Keep AI-generated insights grounded in available project data.
8. Work well on desktop, tablet, and mobile-width screens.

## 3. Primary Users

### Owner / Manager
Needs to understand demand, inventory risk, forecasts, and recommended actions.

### Admin
Needs to manage data, users, processing, and system status.

### Viewer
Optional read-only role for dashboards, forecasts, and analytics.

## 4. Core User Journey

```text
Login
  ↓
Dashboard
  ↓
Check KPIs and Alerts
  ↓
Upload / Validate Data when needed
  ↓
Run / Review Forecast
  ↓
Review Inventory Recommendations
  ↓
Investigate Trends / Anomalies
  ↓
Ask RAG Chatbot Questions
  ↓
Take Business Action
```

The user should normally reach the most important decision information within two navigation steps from the dashboard.

## 5. Information Architecture

```text
App
├── Login
└── Main Dashboard
    ├── Overview
    ├── Data Upload
    ├── Forecast
    ├── Inventory Intelligence
    ├── Trends & Anomalies
    ├── Price Insights
    ├── Forecast Evaluation
    └── AI Assistant
```

Admin-only area:

```text
Admin
├── Users
├── Upload History
└── System / Processing Status
```

## 6. Navigation

### Desktop

Use a persistent left sidebar:

- Dashboard
- Data Upload
- Forecast
- Inventory
- Trends & Anomalies
- Price Insights
- Evaluation
- AI Assistant

Bottom/sidebar utility:

- User profile
- Role
- Logout

### Mobile

Use:

- Top app bar
- Menu/drawer
- Page title
- Primary action button
- Bottom spacing for touch controls

Do not display every desktop navigation item simultaneously on narrow screens.

## 7. Global Layout

Recommended structure:

```text
┌─────────────────────────────────────────────┐
│ Top Bar: Logo | Page Title | User | Actions│
├──────────────┬──────────────────────────────┤
│ Sidebar      │                              │
│ Navigation   │ Main Content                 │
│              │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

Content should use a centered responsive container with consistent horizontal padding.

## 8. Screen Specifications

### 8.1 Login

Elements:

- Product name
- Short value statement
- Email/username field
- Password field
- Show/hide password control
- Login button
- Authentication error message

States:

- Default
- Submitting
- Invalid credentials
- Server unavailable
- Session expired

Acceptance:

- Empty required fields cannot be submitted.
- Invalid credentials show a non-sensitive error.
- Successful authentication routes to Dashboard.

### 8.2 Dashboard

Primary KPI cards:

- Total Demand / Sales
- Forecasted Demand
- Products Requiring Reorder
- Stockout Risk
- Overstock Risk
- Forecast Accuracy

Main sections:

1. Demand overview
2. Actual vs Forecast chart
3. Inventory alerts
4. Top products
5. Demand trends
6. Anomaly summary
7. Recommended actions

Each section should have a clear title and, where applicable, a “View details” action.

### 8.3 Data Upload

Purpose: allow business data to enter the system safely.

Form:

- Dataset type
- File upload/drop zone
- Optional description
- Upload button

Supported business datasets:

- Sales
- Product master
- Inventory
- Later: calendar/weather/other approved external data

Upload flow:

```text
Select File
   ↓
Client-side basic checks
   ↓
Upload
   ↓
Server validation
   ↓
Validation summary
   ↓
Proceed / Fix file
```

Validation summary should show:

- Rows
- Required columns
- Missing values
- Duplicate rows
- Invalid values
- Product master match status
- Date range
- Warnings
- Errors

### 8.4 Forecast Screen

Controls:

- Product/category selector
- City selector where applicable
- Date range
- Forecast horizon: 7 / 14 / 30 days
- Model selector where applicable

Main content:

- Historical demand line
- Forecast line
- Confidence interval
- Forecast table
- Model name
- Last run
- Training period
- Evaluation metrics

A forecast must never be displayed without identifying the relevant product/data context.

### 8.5 Inventory Intelligence

Top cards:

- Reorder Required
- Stockout Risk
- Overstock Risk
- Total Recommended Reorder Quantity

Table columns:

- Product
- Current/available stock
- Forecast demand
- Lead time
- Safety stock
- Reorder point
- Recommended quantity
- Risk
- Action

Use clear action labels such as:

- Reorder
- Monitor
- Overstock
- No Action

### 8.6 Trends & Anomalies

Tabs or segmented controls:

- Trends
- Anomalies

Trend content:

- Top products
- Fast-growing products
- Declining products
- Category performance

Anomaly content:

- Product
- Date
- Observed demand
- Expected demand
- Difference
- Severity
- Explanation/context

### 8.7 Price Insights

Display:

- Selling price
- MRP
- Discount
- Demand
- Observed relationship/trend

Avoid presenting correlation as proven causation.

### 8.8 Forecast Evaluation

Show:

- Model
- Forecast period
- Evaluation period
- MAE
- RMSE where used
- MAPE where valid
- Baseline comparison

Include a simple statement such as:

“Prophet performed better than the selected baseline for this evaluation period.”

Only display such a statement when the stored metrics support it.

### 8.9 AI Assistant

Chat layout:

```text
┌───────────────────────────────┐
│ AI Assistant                  │
├───────────────────────────────┤
│ User: Which products...       │
│                               │
│ AI: Based on available data…  │
│                               │
├───────────────────────────────┤
│ Ask a question...       Send  │
└───────────────────────────────┘
```

Suggested starter questions:

- Which products need reorder?
- What is the highest forecasted demand?
- Which products show unusual demand?
- How accurate is the forecast?
- Which category is growing?

The UI should indicate when the assistant cannot answer because the required data is unavailable.

## 9. Reusable Components

Recommended React components:

- AppShell
- Sidebar
- TopBar
- Breadcrumbs
- PageHeader
- KPI Card
- Status Badge
- DataTable
- FilterBar
- DateRangePicker
- Select
- FileDropzone
- UploadProgress
- ValidationSummary
- LineChart
- BarChart
- AlertCard
- RecommendationCard
- EmptyState
- ErrorState
- LoadingSkeleton
- Modal
- Toast
- Pagination
- ChatWindow
- ChatMessage

## 10. Interaction Rules

### Buttons

Primary actions should be visually distinct:

- Upload
- Run Forecast
- Apply Filters
- Reorder/View Recommendation

Destructive actions require confirmation.

### Tables

- Sortable where useful
- Searchable for product lists
- Pagination for large result sets
- Sticky header on desktop where appropriate
- Horizontal scrolling on small screens

### Filters

Filters should:

- Have explicit labels
- Show selected values
- Provide Clear Filters
- Preserve filter state during navigation where practical

### Charts

Charts should provide:

- Axis labels
- Tooltips
- Legend when multiple series exist
- Empty state when no data exists
- Accessible textual summaries where practical

## 11. Forms

All forms shall:

- Clearly mark required fields.
- Validate before submission where possible.
- Show field-level errors.
- Preserve valid entered values after validation failure.
- Disable duplicate submissions while processing.
- Confirm successful completion.

## 12. Loading States

Use:

- Skeleton cards for dashboard data
- Skeleton rows for tables
- Spinner/progress for uploads and actions
- Progress/status indicators for long-running processing

Never leave the user looking at a blank screen while data is loading.

## 13. Error States

Errors should be specific and actionable.

Example:

> Upload failed. The sales file is missing `product_id`. Add the column and upload the file again.

Avoid technical stack traces in the UI.

For system failures:

> We couldn't load inventory recommendations. Please try again.

Provide Retry where retrying is meaningful.

## 14. Empty States

Examples:

**No forecast**

> No forecast is available for the selected product. Upload sufficient historical sales data and run forecasting.

**No anomalies**

> No significant anomalies were detected for the selected period.

**No reorder required**

> No products currently require reorder based on the available inventory and demand information.

Empty states should explain what the user can do next.

## 15. Responsive Design

Breakpoints should be implementation-defined, but behavior should follow:

### Desktop
- Sidebar visible
- Multi-column KPI grid
- Charts side by side where useful
- Full tables

### Tablet
- Collapsible sidebar
- Reduced card columns
- Charts stack when necessary

### Mobile
- Single-column cards
- Horizontal-scroll tables or mobile cards
- Collapsible filters
- Full-width primary actions
- Touch-friendly controls

Minimum touch target should generally be about 44×44 CSS pixels.

## 16. Typography

Recommended font family:

- Inter or system sans-serif fallback

Suggested hierarchy:

- Page title: 28–32 px
- Section title: 20–24 px
- Card title: 14–16 px
- Body: 14–16 px
- Caption/meta: 12–13 px

Use font weight and spacing to create hierarchy rather than excessive font sizes.

## 17. Color System

Keep the palette restrained.

Suggested semantic tokens:

```text
Primary:      #2563EB
Background:   #F8FAFC
Surface:      #FFFFFF
Text:         #0F172A
Muted Text:   #64748B
Border:       #E2E8F0
Success:      #16A34A
Warning:      #D97706
Danger:       #DC2626
Info:         #0284C7
```

Do not use color as the only indication of status. Pair color with labels/icons.

## 18. Spacing

Use an 8-point spacing system:

```text
4px   micro
8px   small
16px  standard
24px  section
32px  large
48px  major section
```

Cards should use consistent padding and border radius.

## 19. Accessibility

The interface should:

- Support keyboard navigation.
- Use semantic HTML.
- Provide visible focus indicators.
- Associate labels with form controls.
- Provide alt text for meaningful images.
- Avoid color-only status communication.
- Maintain readable contrast.
- Provide accessible names for icon-only buttons.
- Support screen-reader-friendly tables and alerts.
- Avoid rapidly flashing content.
- Preserve logical tab order.

## 20. Design Principles

1. **Decision first:** prioritize actions and risks over decorative information.
2. **Progressive disclosure:** show summaries first, details on demand.
3. **Consistency:** reuse the same components and terminology.
4. **Trust:** distinguish actual data, calculated values, forecasts, and recommendations.
5. **Explainability:** show enough context to understand an insight.
6. **Feedback:** every important user action should produce visible status feedback.
7. **Restraint:** avoid unnecessary dashboards, animations, and configuration.
8. **Responsive by default:** important functions remain usable on smaller screens.

## 21. UX Acceptance Criteria

- User can log in and reach the dashboard.
- User can navigate to every MVP module from the main navigation.
- User can upload a supported dataset and see validation status.
- Validation errors identify what needs correction.
- Dashboard displays available KPIs without exposing raw implementation details.
- Forecast screen supports 7/14/30-day horizons.
- Inventory screen clearly identifies reorder, stockout, and overstock risks.
- Trends and anomalies are distinguishable.
- Evaluation metrics are understandable.
- Chatbot supports approved project-data questions.
- Loading, error, and empty states exist for every data-driven screen.
- UI remains usable at desktop, tablet, and mobile widths.
- Keyboard users can access all primary controls.
- Status is never communicated by color alone.
