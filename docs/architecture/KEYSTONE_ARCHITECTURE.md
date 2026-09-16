# KEYSTONE - Field Service Management Platform Architecture Specification

**Project:** KEYSTONE Field Service Management  
**Target Domain:** Commercial Facilities, Preventive & Corrective Maintenance, Dispatching, SLA Compliance  
**Architecture Version:** 1.0.0-PROD  
**Document Classification:** Technical Architecture & Design Document (TADD)

---

## Executive Summary & System Overview

KEYSTONE is an enterprise-grade, multi-tenant Field Service Management (FSM) platform designed for commercial facility maintenance companies, hospital networks, educational campuses, data centers, and corporate real estate portfolios. It coordinates the end-to-end lifecycle of work orders, dispatching certified technicians, tracking parts and inventory, ensuring strict Service Level Agreement (SLA) compliance, capturing field time tracking, and maintaining an immutable audit log for compliance and liability.

---

## 1. Frontend Folder Structure

The frontend is structured as a modular, domain-driven React application powered by TypeScript, Vite, and Tailwind CSS. It separates concerns between domain features, reusable atomic UI components, application state, and infrastructure/API clients:

```text
frontend/ (or src/)
├── assets/                       # Static brand logos, SVG icons, imagery
├── components/                   # Domain-agnostic reusable UI primitives
│   ├── ui/                       # Buttons, Badges, Modals, Drawers, Inputs, Cards, Dropdowns, Tabs
│   ├── layout/                   # AppShell, TopNav, SidebarNavigation, PageContainer, Breadcrumbs
│   ├── feedback/                 # AlertBanner, SkeletonLoader, ToastNotification, ErrorBoundary
│   └── data-display/             # DataTable, PaginationBar, MetricCard, StatusBadge, StatTrend
├── context/                      # Global React contexts
│   ├── AuthContext.tsx           # Authentication state, active user profile, JWT token lifecycle
│   ├── RoleContext.tsx           # RBAC context for dynamic role emulation & permission checking
│   └── NotificationContext.tsx   # Real-time operational toasts, SLA breach alerts
├── features/                     # Domain modules grouped by functional capability
│   ├── dashboard/                # Operational dispatcher overview, KPI metric cards, SLA health gauges
│   │   ├── components/           # SlaBreachRadar, PriorityBreakdownChart, TechnicianRosterStrip
│   │   └── types/                # DashboardStats, FacilitySummary
│   ├── work-orders/              # Work Order lifecycle, kanban board, tabular list, details modal
│   │   ├── components/           # WorkOrderCard, WorkOrderLifecycleStepper, TransitionActionModal, PartUsageTable
│   │   ├── hooks/                # useWorkOrders, useWorkOrderDetail, useWorkOrderTransition
│   │   └── types/                # WorkOrder, WorkOrderFilter, LifecycleTransition
│   ├── dispatch/                 # Dispatcher board, technician matching, scheduling, map view
│   │   ├── components/           # TechnicianList, AssignmentModal, ScheduleCalendar
│   │   └── hooks/                # useDispatchTechnicians
│   ├── service-requests/         # Inbound customer ticket portal & triage queue
│   │   ├── components/           # RequestIntakeForm, TriageToWorkOrderModal
│   │   └── hooks/                # useServiceRequests
│   ├── assets/                   # Commercial facility asset registry & maintenance histories
│   ├── inventory/                # Parts catalogue, bin locations, reorder stock tracking
│   └── architecture/             # Interactive Architectural Blueprint & Schema Inspector
├── hooks/                        # Cross-cutting custom hooks (useDebounce, useMediaQuery, usePagination)
├── services/                     # Typed API client services
│   ├── api.ts                    # Central Axios/Fetch instance with JWT interceptors & error standardizer
│   ├── auth.service.ts           # Login, logout, refresh, user profile fetch
│   ├── workOrder.service.ts      # CRUD, lifecycle transitions, assignment, time logging
│   └── dashboard.service.ts      # Aggregated metric queries
├── types/                        # Core TypeScript interfaces & enums
│   ├── api.types.ts              # ApiResponse<T>, PageResponse<T>, ApiError
│   ├── auth.types.ts             # User, Role, Credentials, AuthTokens
│   ├── workOrder.types.ts        # WorkOrder, WorkOrderStatus, Priority, SLA
│   └── fsm.types.ts              # Facility, Asset, Technician, Part, Inventory, TimeEntry, AuditLog
└── utils/                        # Formatting, date utilities, SLA countdown math, permissions logic
```

---

## 2. Backend Folder Structure (Spring Boot Clean Architecture)

The Java Spring Boot backend adopts Clean Architecture / Domain-Driven Design (DDD) layered structure with strict package encapsulation:

```text
backend/
├── pom.xml                                       # Maven build descriptor (Java 17+, Spring Boot 3.2+)
├── src/
│   ├── main/
│   │   ├── java/com/keystone/
│   │   │   ├── KeystoneApplication.java          # Spring Boot main bootstrap class
│   │   │   ├── config/                           # System and framework configuration
│   │   │   │   ├── SecurityConfig.java           # Spring Security filter chain, BCrypt, Stateless sessions
│   │   │   │   ├── WebConfig.java                # CORS, HTTP converters, Content negotiation
│   │   │   │   ├── JpaConfig.java                # JPA Auditing (@EnableJpaAuditing), Transaction Management
│   │   │   │   └── OpenApiConfig.java            # Swagger / OpenAPI 3.0 documentation configuration
│   │   │   ├── security/                         # JWT authentication & security filters
│   │   │   │   ├── JwtTokenProvider.java         # Token creation, signing (HMAC-SHA256), claims parsing
│   │   │   │   ├── JwtAuthenticationFilter.java  # Request filter extracting Bearer token into SecurityContext
│   │   │   │   ├── JwtAuthenticationEntryPoint.java # 401 Unauthorized handler
│   │   │   │   ├── UserPrincipal.java            # Spring Security UserDetails adapter
│   │   │   │   └── CustomUserDetailsService.java # User loader by username/email
│   │   │   ├── enums/                            # Strongly typed domain enumerations
│   │   │   │   ├── RoleName.java                 # SUPER_ADMIN, ADMIN, DISPATCHER, TECHNICIAN, CUSTOMER
│   │   │   │   ├── WorkOrderStatus.java          # NEW, TRIAGED, ASSIGNED, ACCEPTED, IN_PROGRESS, ON_HOLD, COMPLETED, VERIFIED, CLOSED
│   │   │   │   ├── Priority.java                 # CRITICAL, HIGH, MEDIUM, LOW
│   │   │   │   ├── TechnicianStatus.java         # AVAILABLE, ON_SITE, IN_TRANSIT, OFF_DUTY
│   │   │   │   └── ServiceRequestStatus.java     # PENDING_REVIEW, APPROVED, REJECTED, CONVERTED
│   │   │   ├── entity/                           # JPA Hibernate Entity mappings with Auditing
│   │   │   │   ├── base/AuditableEntity.java     # Base class: id, createdAt, updatedAt, version
│   │   │   │   ├── User.java
│   │   │   │   ├── Role.java
│   │   │   │   ├── Organization.java
│   │   │   │   ├── Facility.java
│   │   │   │   ├── Customer.java
│   │   │   │   ├── Technician.java
│   │   │   │   ├── ServiceRequest.java
│   │   │   │   ├── WorkOrder.java
│   │   │   │   ├── Asset.java
│   │   │   │   ├── MaintenanceSchedule.java
│   │   │   │   ├── Assignment.java
│   │   │   │   ├── Part.java
│   │   │   │   ├── Inventory.java
│   │   │   │   ├── WorkOrderPart.java
│   │   │   │   ├── TimeEntry.java
│   │   │   │   ├── Sla.java
│   │   │   │   ├── Notification.java
│   │   │   │   ├── Comment.java
│   │   │   │   ├── Attachment.java
│   │   │   │   └── AuditLog.java
│   │   │   ├── dto/                              # Data Transfer Objects (Strict decoupled contracts)
│   │   │   │   ├── request/                      # Incoming payloads with validation (@NotNull, @Size)
│   │   │   │   │   ├── LoginRequest.java
│   │   │   │   │   ├── WorkOrderCreateRequest.java
│   │   │   │   │   ├── WorkOrderTransitionRequest.java
│   │   │   │   │   ├── AssignmentRequest.java
│   │   │   │   │   └── TimeEntryRequest.java
│   │   │   │   ├── response/                     # Outgoing client-safe DTOs
│   │   │   │   │   ├── ApiResponse.java          # Unified payload envelope
│   │   │   │   │   ├── PageResponse.java         # Standardized page metadata
│   │   │   │   │   ├── AuthResponse.java
│   │   │   │   │   ├── UserDto.java
│   │   │   │   │   ├── WorkOrderResponseDto.java
│   │   │   │   │   ├── TechnicianDto.java
│   │   │   │   │   └── DashboardSummaryDto.java
│   │   │   ├── repository/                       # Spring Data JPA interfaces
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── WorkOrderRepository.java
│   │   │   │   ├── TechnicianRepository.java
│   │   │   │   ├── FacilityRepository.java
│   │   │   │   ├── ServiceRequestRepository.java
│   │   │   │   └── AuditLogRepository.java
│   │   │   ├── service/                          # Business logic contracts & implementations
│   │   │   │   ├── AuthService.java
│   │   │   │   ├── WorkOrderService.java
│   │   │   │   ├── WorkOrderStateMachine.java    # Strict transition verification engine
│   │   │   │   ├── DispatchService.java
│   │   │   │   ├── SlaCalculationService.java
│   │   │   │   └── AuditLogService.java
│   │   │   ├── controller/                       # RESTful HTTP API Controllers
│   │   │   │   ├── AuthController.java           # /api/v1/auth/*
│   │   │   │   ├── WorkOrderController.java      # /api/v1/work-orders/*
│   │   │   │   ├── DispatchController.java       # /api/v1/dispatch/*
│   │   │   │   ├── TechnicianController.java     # /api/v1/technicians/*
│   │   │   │   ├── FacilityController.java       # /api/v1/facilities/*
│   │   │   │   └── DashboardController.java      # /api/v1/dashboard/*
│   │   │   └── exception/                        # Centralized exception handling
│   │   │       ├── GlobalExceptionHandler.java   # @ControllerAdvice converting to RFC 7807 ProblemDetails
│   │   │       ├── ResourceNotFoundException.java
│   │   │       ├── InvalidStateTransitionException.java
│   │   │       ├── SlaBreachedException.java
│   │   │       └── UnauthorizedOperationException.java
│   │   └── resources/
│   │       ├── application.yml                   # Database URLs, Hikari pool, JWT secret references
│   │       ├── application-dev.yml
│   │       └── db/migration/
│   │           └── V1__init_keystone_schema.sql  # Flyway schema migration
```

---

## 3. Database Schema (PostgreSQL 15+)

The database schema utilizes UUID primary keys for distributed scalability, explicit Foreign Key integrity, B-Tree indexes on query predicates, and JSONB for audit change snapshots.

### Core Tables Summary:
1. `organizations`: Tenancy root (name, code, subscription_tier, timezone).
2. `roles`: Standard RBAC roles (`SUPER_ADMIN`, `ADMIN`, `DISPATCHER`, `TECHNICIAN`, `CUSTOMER`).
3. `users`: Identity and credentials with BCrypt hashes.
4. `user_roles`: Many-to-many relationship linking users to roles.
5. `customers`: Commercial client accounts holding service contracts.
6. `facilities`: Physical commercial buildings, addresses, geospatial lat/lng, access notes.
7. `assets`: Equipment under maintenance (HVAC, Chillers, Switchgears, Elevators).
8. `technicians`: Field personnel profile, certifications, skill tags, hourly rate, live dispatch status.
9. `slas`: Service Level Agreements specifying response and resolution thresholds by priority.
10. `service_requests`: Inbound client reported tickets.
11. `work_orders`: Core operational document with lifecycle status, priority, dead-lines, duration.
12. `assignments`: Historical technician assignment records.
13. `time_entries`: Clock-in/out labor intervals.
14. `parts` & `inventory`: Replacement component registry and facility bin stock.
15. `work_order_parts`: Consumed inventory per work order with historical unit costs.
16. `maintenance_schedules`: Preventive maintenance recurring rules.
17. `comments`, `attachments`, `notifications`: Collaboration and multi-channel alerts.
18. `audit_logs`: Immutable ledger of every entity mutation and state transition.

---

## 4. Entity Relationships (ERD)

```text
[Organization] 1 ────< N [Facility] 1 ────< N [Asset] 1 ────< N [WorkOrder]
      │                        │                                      │
      ├────< N [Customer] ─────┘                                      ├────< N [Assignment] >──── 1 [Technician]
      │                                                               ├────< N [TimeEntry]  >──── 1 [Technician]
      ├────< N [User] 1 ──── 1 [Technician]                           ├────< N [WorkOrderPart] >─ 1 [Part]
      │          │                                                    ├────< N [Comment]
      │          └────< N [AuditLog]                                  ├────< N [Attachment]
      │                                                               └────< 1 [SLA]
      └────< N [Part] 1 ────< N [Inventory] >──── 1 [Facility]
```

---

## 5. API Architecture

KEYSTONE exposes standard RESTful JSON APIs structured under `/api/v1/`.

### HTTP Verbs & Semantics:
- `GET /api/v1/{resource}`: Collection query with pagination, sorting, and filtering.
- `GET /api/v1/{resource}/{id}`: Retrieve single resource representation.
- `POST /api/v1/{resource}`: Create new resource, returns HTTP 201 Created with `Location` header.
- `PUT /api/v1/{resource}/{id}`: Idempotent replacement of resource representation.
- `PATCH /api/v1/{resource}/{id}`: Partial update.
- `POST /api/v1/work-orders/{id}/transition`: State machine transition trigger with required audit justification.

### API Endpoints Catalog:
- `POST /api/v1/auth/login`: Authenticate with email/password; returns JWT + Refresh Token.
- `GET  /api/v1/auth/me`: Get current authenticated user profile and roles.
- `GET  /api/v1/work-orders`: Paginated list of work orders with multi-parameter filtering.
- `POST /api/v1/work-orders`: Create new work order.
- `GET  /api/v1/work-orders/{id}`: Detailed view including parts, technician, time entries, SLA status.
- `POST /api/v1/work-orders/{id}/transition`: Lifecycle state update (e.g., ASSIGNED -> ACCEPTED).
- `POST /api/v1/work-orders/{id}/assign`: Assign technician to work order.
- `POST /api/v1/work-orders/{id}/time-entries`: Log technician labor/travel time.
- `POST /api/v1/work-orders/{id}/parts`: Allocate parts from facility inventory.
- `GET  /api/v1/technicians`: Query field workforce with live availability and active load.
- `GET  /api/v1/dashboard/stats`: High-level operational telemetry (SLA compliance %, open tickets, tech utilization).

---

## 6. Authentication Architecture

- **Credentials & Password Hashing:** Passwords hashed with BCrypt using standard 12 rounds of salt generation.
- **Stateless Tokens:** Pure stateless JWT tokens containing user ID, organization ID, email, and granted roles.
- **Signing Algorithm:** HMAC-SHA256 (`HS256`) with a cryptographically secure 256-bit secret stored in environment variables.
- **Token Lifetimes:**
  - Access Token: 15 minutes to 24 hours (configured via `JWT_EXPIRATION_MS`).
  - Refresh Token: 7 days, persisted with single-use rotation to prevent replay attacks.
- **Header Structure:** `Authorization: Bearer <token>`.

---

## 7. Authorization Architecture (RBAC)

Role-Based Access Control is enforced at both the API gateway and method-level using `@PreAuthorize("hasRole('...')")`:

| Role | Permissions & Functional Scope |
| :--- | :--- |
| **SUPER_ADMIN** | Full system-wide access across all organizations, audit logs, system configuration. |
| **ADMIN** | Tenant administrator: Manage facilities, customers, assets, users, parts, and view all operational reports. |
| **DISPATCHER** | Manage service requests, create/triage work orders, assign technicians, monitor SLA health, override schedules. |
| **TECHNICIAN** | View assigned work orders, accept/reject assignments, transition status (ACCEPTED -> IN_PROGRESS -> COMPLETED), log time entries, record used parts. |
| **CUSTOMER** | Submit new service requests, view status of service requests and authorized work orders for their own facilities. |

---

## 8. State Management Strategy

- **Client State:**
  - **AuthContext:** Holds current JWT token, decoded user claims, active organization ID, and RBAC switchers.
  - **Server Cache & Invalidation:** React state caches with automated invalidation on mutation (e.g., triggering a work order transition immediately invalidates dashboard KPIs and the work order tabular list).
  - **Optimistic Updates:** Instant UI feedback on status transitions with rollback upon API rejection.
- **Backend State:**
  - Fully stateless backend services.
  - Database-backed transactional consistency (`@Transactional` with `Isolation.READ_COMMITTED`).
  - Pessimistic locking (`PESSIMISTIC_WRITE`) used during inventory decrement and concurrent work order assignment to prevent race conditions.

---

## 9. Error Handling Strategy

All HTTP errors conform to RFC 7807 (Problem Details for HTTP APIs) and the standard `ApiResponse` envelope:

```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "INVALID_STATE_TRANSITION",
  "message": "Cannot transition Work Order from 'NEW' directly to 'IN_PROGRESS'. Required intermediate state: 'ASSIGNED'.",
  "timestamp": "2026-09-11T11:40:00Z",
  "path": "/api/v1/work-orders/d8f28f3a-592b-4229-87a4-23db97ef6751/transition",
  "errors": [
    {
      "field": "targetStatus",
      "rejectedValue": "IN_PROGRESS",
      "rule": "ALLOWED_TRANSITIONS_VIOLATION"
    }
  ]
}
```

---

## 10. Validation Strategy

- **Backend Validation:**
  - Jakarta Bean Validation (JSR 380) annotations on all DTOs (`@NotNull`, `@NotBlank`, `@Size`, `@Pattern`, `@Min`, `@FutureOrPresent`).
  - Custom domain validators (e.g., `ValidWorkOrderTransition`, `ValidInventoryStock`).
- **Frontend Validation:**
  - Form validation schema preventing invalid submissions prior to network request.
  - UI hints and disabled buttons for transitions not permitted by the user's role or the current work order state.

---

## 11. API Response Format

All responses wrap their payload in a consistent envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Work Order retrieved successfully",
  "timestamp": "2026-09-11T11:40:00Z",
  "data": { ... },
  "pagination": {
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 142,
    "totalPages": 8,
    "isLast": false
  }
}
```

---

## 12. Pagination Strategy

- **Parameters:**
  - `page`: 0-indexed integer (default: 0).
  - `size`: Items per page (default: 20, max: 100).
  - `sort`: Field name and direction (e.g., `createdAt,desc` or `priority,asc`).
- **Spring Pageable:** Spring Data `Page<T>` automatically converts into the standard `pagination` metadata object.

---

## 13. Search and Filter Strategy

- **Work Order Filters:**
  - `query`: Text match against work order number, title, description, and facility name.
  - `status`: Multi-select enum filter (`NEW`, `ASSIGNED`, `IN_PROGRESS`, etc.).
  - `priority`: Multi-select (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - `facilityId`: UUID filter.
  - `technicianId`: UUID filter.
  - `slaStatus`: `BREACHED`, `AT_RISK`, `ON_TRACK`.
- **Spring Data Implementation:** Dynamic `org.springframework.data.jpa.domain.Specification<WorkOrder>` creating SQL predicates dynamically using `CriteriaBuilder`.

---

## 14. Dashboard Architecture

The Dispatcher & Operations Dashboard aggregates real-time operational metrics:

1. **SLA Compliance Meter:** Percentage of work orders meeting response and resolution deadlines (target: >95%).
2. **Operational Status Pipeline:** Real-time counts across the 9 work order lifecycle stages.
3. **Priority Distribution:** Visual breakdown of Critical / High / Medium / Low tickets.
4. **Technician Fleet Availability:** Total technicians, Available, On Site, In Transit, Off Duty.
5. **Recent Critical Incidents & Audit Log:** Live feed of events, assignments, and completions.

---

## 15. Work Order Lifecycle Architecture

The KEYSTONE Work Order Lifecycle is a deterministic Finite State Machine (FSM). Arbitrary jumping between states is strictly forbidden. Every transition requires validation, authorization, and an automatic audit log entry.

### State Transition Diagram:
```text
  [NEW]
    │
    ▼ (Dispatcher triages and verifies issue)
 [TRIAGED]
    │
    ▼ (Dispatcher assigns technician)
 [ASSIGNED] ────────┐ (Technician rejects)
    │               │
    │ (Tech accepts)▼
 [ACCEPTED] ◄───────┘
    │
    ▼ (Tech arrives on site & clocks in)
 [IN_PROGRESS] ◄────┐
    │      │        │ (Issue resumed)
    │      ▼        │
    │   [ON_HOLD] ──┘ (Waiting for parts/access)
    │
    ▼ (Work completed, time & parts logged)
 [COMPLETED]
    │
    ▼ (Customer or Dispatcher inspects & approves)
 [VERIFIED]
    │
    ▼ (Invoicing finalized, formal sign-off)
 [CLOSED]
```

### Transition Matrix & Permitted Roles:

| From State | Allowed Target State | Permitted Roles | System Triggers & Actions |
| :--- | :--- | :--- | :--- |
| `NEW` | `TRIAGED` | DISPATCHER, ADMIN, SUPER_ADMIN | Computes initial SLA deadlines. |
| `TRIAGED` | `ASSIGNED` | DISPATCHER, ADMIN, SUPER_ADMIN | Creates Assignment record, notifies technician. |
| `ASSIGNED` | `ACCEPTED` | TECHNICIAN, DISPATCHER | Sets `responded_at` timestamp. Checks SLA response breach. |
| `ASSIGNED` | `TRIAGED` | TECHNICIAN (Rejection) | Clears assignment, records rejection reason, alerts dispatcher. |
| `ACCEPTED` | `IN_PROGRESS` | TECHNICIAN | Starts automatic labor time entry. Updates Tech status to `ON_SITE`. |
| `IN_PROGRESS`| `ON_HOLD` | TECHNICIAN, DISPATCHER | Pauses active time entry. Requires `holdReason` (e.g. Parts pending). |
| `ON_HOLD` | `IN_PROGRESS` | TECHNICIAN, DISPATCHER | Resumes work. Clocks in new labor time interval. |
| `IN_PROGRESS`| `COMPLETED` | TECHNICIAN | Verifies labor entries & parts logged. Sets `completed_at`. Evaluates SLA resolution. |
| `COMPLETED` | `VERIFIED` | DISPATCHER, ADMIN, CUSTOMER | Facility manager signs off on quality of work. |
| `COMPLETED` | `IN_PROGRESS` | DISPATCHER, ADMIN (Rework) | Reopens work order with corrective feedback. |
| `VERIFIED` | `CLOSED` | ADMIN, SUPER_ADMIN | Locks record from further modifications. Finalizes costing. |
