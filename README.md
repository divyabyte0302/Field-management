# Project KEYSTONE: Enterprise Field Service & Facility Management Platform

A commercial facility maintenance and field service operations platform built with React 18, TypeScript, Tailwind CSS, and Node.js/Express.

---

## 1. Executive Summary

Project KEYSTONE bridges the operational gap between commercial property owners, operations dispatchers, and field engineering personnel. It provides real-time work order lifecycle management, intelligent dispatch routing, strict Service Level Agreement (SLA) contract monitoring, multi-warehouse parts inventory control, and time-tracking linked to automated job costing.

---

## 2. Platform Architecture

KEYSTONE operates as a unified full-stack architecture:

- **Frontend:** React 18 SPA bundled with Vite, styled with Tailwind CSS, utilizing Lucide icons, mobile-responsive drawers, and interactive modal dialogs.
- **Backend:** Node.js/Express RESTful API with route-level tenant scoping, validation pipelines, error handling middleware, and OpenAPI 3.0 documentation.
- **Security & RBAC:** Cryptographic stateless JWT authentication (HMAC-SHA256) with token invalidation tracking and 5 role personas.
- **API Documentation:** Interactive Swagger UI mounted natively at `/swagger-ui.html` and raw JSON specifications served at `/api/docs`.

```
                    ┌─────────────────────────────────────────┐
                    │       KEYSTONE Client Web App           │
                    │  (Dashboard, Dispatch, Portal, Mobile)  │
                    └───────────────────┬─────────────────────┘
                                        │ HTTPS / JWT Auth
                                        ▼
                    ┌─────────────────────────────────────────┐
                    │      Express API Application Server     │
                    │  - Tenant Scoping & CORS Middleware     │
                    │  - RBAC & RoleGuard Verification        │
                    │  - Standardized JSON Error Handler      │
                    │  - OpenAPI / Swagger Documentation      │
                    └───────────────────┬─────────────────────┘
                                        │
           ┌──────────────┬─────────────┼──────────────┬──────────────┐
           ▼              ▼             ▼              ▼              ▼
     Work Orders     Dispatch &     Facilities      Parts &       SLA Contract
      Lifecycle      Technicians     & Assets      Inventory         Engine
```

---

## 3. Role-Based Access Control (RBAC)

The platform enforces strict role-based authorization across all frontend views and backend API routes:

| Role Persona | Identifier | Capabilities |
| :--- | :--- | :--- |
| **Super Admin** | `SUPER_ADMIN` | Global multi-tenant visibility, audit logs, tenant policy provisioning. |
| **Organization Admin** | `ADMIN` | Tenant administration, user provisioning, rate sheets, facility configs. |
| **Dispatcher** | `DISPATCHER` | Service request triage, work order creation, technician scheduling, SLA tracking. |
| **Field Technician** | `TECHNICIAN` | Mobile job execution workbench, part allocation, time logging, job resolution. |
| **Facility Customer** | `CUSTOMER` | Commercial tenant portal, service request origination, ticket tracking, customer sign-off. |

---

## 4. Key Functional Modules

### 1. Work Order State Machine
Enforces sequential status transitions:
- `DRAFT` &rarr; `PENDING_DISPATCH` &rarr; `ASSIGNED` &rarr; `IN_PROGRESS` &rarr; `ON_HOLD` / `COMPLETED` &rarr; `VERIFIED` &rarr; `CLOSED` / `CANCELLED`
- Automatic hold reasons, rejection feedback loops, and immutable audit logs.

### 2. Dispatch Board & Technician Scheduling
- Schedule view matching technician skills, certifications, and facility geo-proximity.
- Single-click technician reassignment and direct service request conversion.

### 3. SLA Contract & Escalation Engine
- Priority-tiered resolution deadlines (`EMERGENCY` 2hr, `CRITICAL` 4hr, `HIGH` 8hr, `MEDIUM` 24hr, `LOW` 72hr).
- Real-time countdown meters, automated risk warnings (`SLA_AT_RISK`), and breach notifications (`SLA_BREACHED`).

### 4. Facilities, Assets & Commercial Customers
- Directory of commercial properties, sub-locations, and critical asset registries (HVAC chillers, backup generators, fire suppression, elevator banks).
- Commercial customer accounts with contractual spend tracking and bound SLA tiers.

### 5. Multi-Warehouse Parts Inventory
- Multi-location stock allocation, reservation, and reorder point thresholds with automated restocking alerts.

### 6. Time Tracking & Cost Valuation
- Technician labor time tracking (Regular, Overtime, Emergency Double Time) combined with parts costs to calculate total service valuation.

### 7. Executive Operations Analytics & Reports
- Key performance indicators: SLA Compliance Rate, First-Time Fix Rate, Mean-Time-To-Respond (MTTR), Mean-Time-To-Resolve, fleet utilization, and CSV export.

### 8. Interactive OpenAPI / Swagger UI
- Self-documenting API endpoints accessible directly at `/swagger-ui.html` and `/api/docs`.

---

## 5. Getting Started & Installation

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Environment Configuration
Copy the example environment template:
```bash
cp .env.example .env
```

Review `.env.example`:
```env
# Server Port (Reverse proxy routes exclusively to 3000)
PORT=3000

# Authentication Secrets
JWT_SECRET=keystone-enterprise-secret-key-2026-production-ready
```

### Dependency Installation
```bash
npm install
```

### Running in Development Mode
```bash
npm run dev
```
The application and backend API will boot synchronously on `http://localhost:3000`.

---

## 6. Build & Production Deployment

### Production Compilation
```bash
npm run build
```
This script executes:
1. `vite build` — Compiles and optimizes frontend client assets to `dist/`.
2. `esbuild server.ts` — Bundles backend Express server with TypeScript stripping to `dist/server.cjs`.

### Production Launch
```bash
npm start
```
Runs the bundled production server at `http://0.0.0.0:3000`.

---

## 7. Automated Verification & Testing

```bash
# Type checking and lint validation
npm run lint

# Production build verification
npm run build
```

---

## 8. License

Project KEYSTONE is proprietary enterprise software for commercial facility operations and field service management.
