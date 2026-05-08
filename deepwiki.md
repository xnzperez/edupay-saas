# EduPay SaaS - Project Overview

EduPay SaaS — Project Overview
Relevant source files
DOCUMENTACION_TECNICA_EDUPAY_SAAS.md
backend/cmd/api/main.go
backend/go.mod
backend/go.sum
frontend/src/App.tsx
frontend/src/components/layouts/StudentNavbar.tsx
frontend/src/services/store.ts
EduPay SaaS is a Business-to-Business (B2B) financial platform designed as a multi-tenant solution for educational institutions. It provides a "turnkey" infrastructure for managing closed-loop digital wallets, automated billing, and certificate sales for students.

The system is built as a modular monolith with a focus on high concurrency, financial precision, and strict data isolation through PostgreSQL Row-Level Security (RLS).

Core Concepts & Multi-Tenancy
The platform operates on a single-database multi-tenant architecture. Instead of separate databases per client, it uses a logical isolation strategy where every sensitive table includes a tenant_id column.

Data Isolation: Forced at the engine level using PostgreSQL Row-Level Security (RLS)
DOCUMENTACION_TECNICA_EDUPAY_SAAS.md
18-20
Tenant Identification: The backend identifies the organization via the X-Tenant-ID header, processed by a specialized middleware
backend/cmd/api/main.go
78
Financial Precision: All monetary values use the NUMERIC(15,2) type to prevent floating-point inaccuracies
DOCUMENTACION_TECNICA_EDUPAY_SAAS.md
40-41
Three-Role Model
The system enforces a strict Role-Based Access Control (RBAC) model across three distinct user types, managed via JWT claims and specialized frontend layouts
frontend/src/App.tsx
34-63

Role Scope Key Capabilities
Student Tenant-specific View balance, pay installments, P2P transfers, purchase certificates.
Admin (Cajero) Tenant-specific Student search, deposit funds, create installments, view financial stats.
SuperAdmin Global Provisioning of new Tenants (Universities) and global system management.
Role-to-Code Mapping
The following diagram illustrates how the abstract roles map to specific code entities and route guards.

System Role Mapping

Sources:
backend/cmd/api/main.go
107-118

frontend/src/App.tsx
34-63

DOCUMENTACION_TECNICA_EDUPAY_SAAS.md
56-59

Tech Stack
The project utilizes a modern, type-safe stack designed for performance and developer productivity.

Backend: Go (Golang) using the Fiber web framework for high-performance routing and SQLX for type-safe database interactions
DOCUMENTACION_TECNICA_EDUPAY_SAAS.md
28-31
Frontend: React 18 with TypeScript, using Zustand for state management and Sileo/Nord for the design system
DOCUMENTACION_TECNICA_EDUPAY_SAAS.md
33-35
Database: PostgreSQL with a ledger-based "Append-Only" transaction architecture in the wallet_txs table
DOCUMENTACION_TECNICA_EDUPAY_SAAS.md
61-64
Integrations: MercadoPago for external payments and Resend for automated email delivery of receipts and certificates
backend/cmd/api/main.go
73
High-Level Component Interaction

Sources:
backend/cmd/api/main.go
78-86

DOCUMENTACION_TECNICA_EDUPAY_SAAS.md
18-20

DOCUMENTACION_TECNICA_EDUPAY_SAAS.md
73-80

Project Structure & Navigation
The documentation is split into several specialized sections to cover the breadth of the SaaS platform:

Infrastructure & Setup
Getting Started & Local Development: Environment setup, Docker configuration, and required secrets like DATABASE_URL and JWT_SECRET.
System Architecture Overview: Detailed breakdown of the request lifecycle, the modular monolith pattern, and the interaction between the Go backend and React frontend.
Backend Deep-Dives
Multi-Tenancy & Database Layer: How RLS and the tenant.Middleware() ensure data security.
Authentication & Authorization (JWT + RBAC): JWT implementation, Bcrypt hashing, and the RequireRole middleware.
Backend — Business Modules: Documentation for Billing (Installments), Wallets (P2P), and the Store (Certificates).
Frontend & API
Frontend — Application Structure: React project layout, Zustand stores, and the Axios interceptor logic in api.ts.
API Reference & Documentation: Comprehensive list of endpoints for Students, Admins, and SuperAdmins.
Sources:
backend/cmd/api/main.go
1-128

frontend/src/App.tsx
1-67

DOCUMENTACION_TECNICA_EDUPAY_SAAS.md
1-85

## Getting Started & Local Development

Getting Started & Local Development
Relevant source files
backend/.dockerignore
backend/.gitignore
backend/Dockerfile
backend/pkg/database/db.go
docker-compose.yml
frontend/.gitignore
frontend/README.md
frontend/eslint.config.js
frontend/index.html
frontend/package.json
frontend/pnpm-lock.yaml
frontend/pnpm-workspace.yaml
frontend/public/vite.svg
frontend/src/components/layouts/StudentLayout.tsx
frontend/src/main.tsx
frontend/src/router/AppRouter.tsx
frontend/src/router/PrivateRoute.tsx
frontend/vite.config.ts
This guide provides a step-by-step walkthrough for setting up the EduPay SaaS development environment. The project utilizes a Dockerized PostgreSQL database, a Go (Fiber) backend, and a React (Vite) frontend.

Prerequisites
Before starting, ensure you have the following installed:

Go 1.25+
Node.js & pnpm
Docker & Docker Compose
PostgreSQL Client (optional, for manual DB inspection)

1. Database Infrastructure
   The project uses Docker Compose to manage the PostgreSQL instance and a database management UI (Adminer).

Docker Configuration
The docker-compose.yml file defines the postgres:16-alpine service. It maps the internal port 5432 to the host port 5433 to avoid conflicts with local PostgreSQL installations
docker-compose.yml
1-13

Automated Migrations
The database container is configured to automatically run SQL scripts located in backend/migrations upon initialization by mounting them to /docker-entrypoint-initdb.d
docker-compose.yml
16

Running the Infrastructure
docker-compose up -d
PostgreSQL: localhost:5433 (User: edupay_admin, DB: edupay)
docker-compose.yml
8-13
Adminer: localhost:8080
docker-compose.yml
24 2. Environment Variables
Both the backend and frontend require specific environment variables to function. These should be placed in .env files within their respective directories (not tracked by Git)
backend/.gitignore
2

frontend/.gitignore
27

Backend (.env)
The backend connection logic in backend/pkg/database/db.go attempts to use DATABASE_URL first, falling back to individual parameters if it is missing
backend/pkg/database/db.go
13-27

Variable Description Example
DATABASE_URL Full Postgres DSN postgres://edupay_admin:K0uvkrNvMLbU@localhost:5433/edupay?sslmode=disable
JWT_SECRET Secret key for signing tokens your_super_secret_key
MP_ACCESS_TOKEN MercadoPago API Access Token APP_USR-xxxx...
RESEND_API_KEY Resend API Key for emails re_xxxx...
Frontend (.env)
Variable Description Example
VITE_API_URL Backend API Base URL http://localhost:8080
VITE_TENANT_ID Default Tenant ID for dev 1 3. Backend Setup
The backend is a Go application using the Fiber framework.

Installation & Execution
Navigate to the backend directory.
Install dependencies: go mod download
backend/Dockerfile
10
Run the API server:
go run cmd/api/main.go
The server starts on port 8080 by default
backend/Dockerfile
28
Database Connection Logic
The ConnectDB function initializes the connection pool with optimized settings: 25 max open connections and a 5-minute connection lifetime
backend/pkg/database/db.go
35-37

Sources:
backend/pkg/database/db.go
13-41

backend/Dockerfile
5-15

4. Frontend Setup
   The frontend is a React SPA built with Vite and TypeScript, utilizing the Nord design system
   frontend/package.json
   1-45

Installation & Execution
Navigate to the frontend directory.
Install dependencies: pnpm install
frontend/pnpm-lock.yaml
1-100
Start the development server:
pnpm dev
The app is typically served at http://localhost:5173.
Core Dependencies
Routing: react-router-dom
frontend/package.json
20
State Management: zustand
frontend/package.json
23
API Client: axios
frontend/package.json
14
Validation: zod
frontend/package.json
22
Sources:
frontend/package.json
6-24

frontend/src/main.tsx
1-10

5. Development Workflow Diagrams
   Environment Interaction Flow
   This diagram illustrates how the local development components interact and which code entities manage these connections.

Title: Local Development Data Flow

Sources:
frontend/src/router/AppRouter.tsx
1-31

frontend/src/router/PrivateRoute.tsx
1-12

backend/pkg/database/db.go
13-41

docker-compose.yml
1-24

Request Lifecycle: Authentication Guard
This diagram maps the natural language "Login Check" to specific code entities in the frontend routing system.

Title: Frontend Auth Guard Lifecycle

Sources:
frontend/src/router/AppRouter.tsx
15-24

frontend/src/router/PrivateRoute.tsx
1-11

frontend/src/components/layouts/StudentLayout.tsx
14-16

## System Architecture Overview

System Architecture Overview
Relevant source files
backend/cmd/api/main.go
backend/docs/docs.go
backend/docs/swagger.json
backend/docs/swagger.yaml
backend/go.mod
backend/go.sum
backend/pkg/database/db.go
backend/pkg/database/tx.go
docker-compose.yml
frontend/src/index.css
The EduPay SaaS platform is built using a modern, three-tier architecture designed for high security, multi-tenant isolation, and performance. It follows a Modular Monolith pattern on the backend to maintain simplicity while ensuring clear boundaries between business domains like billing, wallets, and payments.

1. High-Level Architecture
   The system consists of three primary layers:

Frontend: A React/TypeScript Single Page Application (SPA) that communicates with the backend via a REST API.
Backend: A Go-based service powered by the Fiber framework, responsible for business logic, authentication, and background processing.
Database: A PostgreSQL instance utilizing Row-Level Security (RLS) to enforce strict multi-tenant isolation at the data layer.
System Components Diagram
The following diagram illustrates the interaction between the different layers and the specific code entities involved in the request lifecycle.

Sources:
backend/cmd/api/main.go
40-127

backend/pkg/database/tx.go
12-58

backend/pkg/database/db.go
13-41

2. Request Lifecycle & Multi-Tenancy
   Every request entering the system must be associated with a specific tenant. This is enforced through a combination of HTTP headers and database session variables.

2.1 The Flow of a Request
Identification: The frontend api.ts interceptor attaches the X-Tenant-ID header and the Authorization: Bearer <JWT> token to every outgoing request.
Tenant Middleware: The tenant.Middleware() in the backend extracts the X-Tenant-ID. If missing, the request is rejected
backend/cmd/api/main.go
78
Authentication: The auth.Protected() middleware validates the JWT and ensures the user belongs to the requested tenant
backend/cmd/api/main.go
86
Database Isolation: Before executing any SQL, the system uses database.RunInTenantTx(). This function starts a transaction and executes SET LOCAL app.current_tenant = <tenant_id>. This allows PostgreSQL's Row-Level Security policies to automatically filter data
backend/pkg/database/tx.go
42-45
Sequence: Secure Data Access
This diagram shows how the code bridges the gap between a web request and a secure database query.

Sources:
backend/pkg/database/tx.go
12-58

backend/cmd/api/main.go
78-93

3. Technology Stack
   Layer Technology Purpose
   Frontend React 19, TypeScript, Vite Modern SPA with type safety.
   Backend Go (Golang) 1.25+ High-performance, concurrent execution.
   Web Framework Fiber v2 Express-like performance for Go.
   Database PostgreSQL 16 Relational data with RLS for multi-tenancy.
   ORM/Query sqlx Lightweight SQL extensions for Go.
   Auth JWT (JSON Web Tokens) Stateless authentication.
   Styling Tailwind CSS 4 Utility-first CSS for the Nord-themed UI.
   Sources:
   backend/go.mod
   1-16

frontend/src/index.css
1-25

docker-compose.yml
3-16

4. Database Connectivity & Security
   The backend manages database connections using a connection pool configured in backend/pkg/database/db.go. It is optimized for concurrent access with a maximum of 25 open connections
   backend/pkg/database/db.go
   35-37

Row-Level Security (RLS)
Security is not just handled at the application level. PostgreSQL RLS policies act as a final safety net. Even if a bug in the Go code attempts to access another tenant's data, the database will return an empty set or block the operation because the app.current_tenant session variable (set by RunInTenantTx) will not match the tenant_id column of the rows being accessed.

Key Database Functions:

ConnectDB(): Initializes the sqlx.DB pool using environment variables like DATABASE_URL
backend/pkg/database/db.go
13-41
RunInTenantTx(): The critical wrapper for all tenant-specific operations. It handles BEGIN, COMMIT, ROLLBACK (on panic or error), and the RLS context injection
backend/pkg/database/tx.go
12-58
Sources:
backend/pkg/database/db.go
13-41

backend/pkg/database/tx.go
12-58

# Backend - Core Infraestructure

Backend — Core Infrastructure
Relevant source files
backend/cmd/api/main.go
backend/pkg/database/db.go
backend/pkg/database/tx.go
docker-compose.yml
This page provides a high-level overview of the foundational layers of the EduPay SaaS backend. The system is built using Go and the Fiber web framework, designed around a multi-tenant architecture that leverages PostgreSQL Row-Level Security (RLS) to ensure strict data isolation.

System Entrypoint & Middleware Pipeline
The backend application starts in backend/cmd/api/main.go, where it initializes the database connection, configures the Fiber app, and defines the global middleware stack and routing groups.

API Bootstrap Lifecycle
Environment Loading: Loads variables from .env using godotenv
backend/cmd/api/main.go
41-43
Database Connection: Initializes the PostgreSQL pool via database.ConnectDB()
backend/cmd/api/main.go
45
Middleware Stack: Applies standard recovery, logging, and CORS middleware
backend/cmd/api/main.go
53-55
Routing Segmentation:
Public/Global: Swagger docs, health checks, and tenant creation
backend/cmd/api/main.go
60-71
Tenant-Scoped: All /api routes are wrapped in tenant.Middleware(), requiring the X-Tenant-ID header
backend/cmd/api/main.go
78
Protected: Routes requiring authentication are wrapped in auth.Protected()
backend/cmd/api/main.go
86
Request Lifecycle Diagram
This diagram bridges the network request to the internal Go components and database session state.

Sources:
backend/cmd/api/main.go
78-86

backend/pkg/database/tx.go
12-45

Database Connectivity & Transaction Management
The application uses sqlx for database interactions, providing a set of extensions over the standard database/sql library.

Connection Pool
The ConnectDB function manages the lifecycle of the PostgreSQL connection pool, configuring limits to prevent resource exhaustion
backend/pkg/database/db.go
35-37
It supports both a unified DATABASE_URL and individual environment variables for local development
backend/pkg/database/db.go
15-27

The Tenant Transaction Wrapper
The core of EduPay's security model is the RunInTenantTx function. This utility ensures that every business operation is executed within a transaction that explicitly sets the PostgreSQL session variable app.current_tenant.

Isolation: It executes SELECT set_config('app.current_tenant', $1, true) before running any business logic
backend/pkg/database/tx.go
42
Safety: Includes built-in panic recovery and automatic rollbacks on error to prevent orphaned transactions
backend/pkg/database/tx.go
20-38
For a deep dive into how this interacts with RLS, see Multi-Tenancy & Database Layer.

Sources:
backend/pkg/database/db.go
13-41

backend/pkg/database/tx.go
10-58

Core Subsystems Overview
The infrastructure supports three primary operational pillars:

1. Multi-Tenancy & Database Layer
   Ensures that data for "University A" is never visible to "University B". It relies on the tenants table and RLS policies applied to every sensitive table in the schema.

Key Detail: Every query is filtered by the database engine based on the tenant_id injected by RunInTenantTx.
See Details: Multi-Tenancy & Database Layer 2. Authentication & Authorization (JWT + RBAC)
Handles user identity and permissions. It uses JWTs to carry claims (User ID, Tenant ID, and Role) and provides middleware to restrict access based on the three-role model: STUDENT, ADMIN, and SUPERADMIN.

Key Detail: The auth.RequireRole("ADMIN") middleware protects sensitive cashier endpoints
backend/cmd/api/main.go
107-118
See Details: Authentication & Authorization (JWT + RBAC) 3. Nightly Worker Process
A standalone process (backend/cmd/worker/main.go) responsible for background maintenance tasks, primarily the calculation of interest penalties on overdue installments.

Key Detail: It iterates through all active tenants and applies interest rates defined in the tenants table.
See Details: Nightly Worker — Penalty Calculation
Infrastructure Component Map
The following table maps infrastructure responsibilities to their primary code locations.

Responsibility Component / Function File Path
Database Initialization ConnectDB
backend/pkg/database/db.go
13
Tenant Isolation RunInTenantTx
backend/pkg/database/tx.go
12
Routing & Middleware main
backend/cmd/api/main.go
40
Tenant Context Injection tenant.Middleware
backend/internal/tenant/middleware.go
Security Enforcement auth.Protected
backend/internal/auth/middleware.go
Local DB Environment docker-compose
docker-compose.yml
3-16
Sources:
backend/cmd/api/main.go
1-128

backend/pkg/database/db.go
1-41

backend/pkg/database/tx.go
1-59

docker-compose.yml
1-30

## Multi-Tenancy & Database Layer

Multi-Tenancy & Database Layer
Relevant source files
backend/cmd/worker/main.go
backend/internal/tenant/handler.go
backend/internal/tenant/middleware.go
backend/migrations/001_init_schema.sql
backend/migrations/002_billing_schema.sql
backend/migrations/003_p2p_tx_types.sql
backend/migrations/004_add_penalty_to_installments.sql
backend/pkg/database/db.go
backend/pkg/database/tx.go
database_audit_report.md
docker-compose.yml
This page provides a deep dive into the multi-tenant architecture of EduPay SaaS. The system utilizes a shared-database, shared-schema approach where data isolation is strictly enforced at the database level using PostgreSQL Row-Level Security (RLS).

Multi-Tenancy Architecture
The architecture relies on three pillars: the X-Tenant-ID HTTP header, a Fiber middleware to capture the context, and a database transaction wrapper that injects the tenant identity into the PostgreSQL session.

Data Flow: Request to Isolated Transaction
The following diagram illustrates how a request from a specific university (tenant) is processed and isolated.

Tenant Isolation Flow

Sources:

backend/internal/tenant/middleware.go
8-30
backend/pkg/database/tx.go
12-58
Database Layer Implementation
The RunInTenantTx Helper
The core of the database isolation is the RunInTenantTx function. It ensures that every transaction executed within the application context is tied to a specific tenant. It executes SET LOCAL app.current_tenant
backend/pkg/database/tx.go
42
which defines the scope for PostgreSQL's current_setting() function used in RLS policies.

PostgreSQL Row-Level Security (RLS)
Every sensitive table (users, wallets, installments, etc.) has RLS enabled. This prevents "cross-tenant" data leakage even if a developer forgets to add a WHERE tenant_id = ... clause in the Go code.

Security Policy Example:

-- From migration 001_init_schema.sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
Sources:

backend/pkg/database/tx.go
40-45
backend/migrations/001_init_schema.sql
52-63
backend/migrations/002_billing_schema.sql
22-26
Database Schema & Migrations
The schema is evolved across four main migrations, focusing on strict data types (TIMESTAMPTZ, NUMERIC for currency) and explicit indexing for performance.

Entity Relationship & Code Mapping
The following diagram maps the database tables to their respective roles in the system logic.

Database Entity Map

Migration Summary
Migration Focus Key Entities / Changes
001 Core Infra tenants, users, wallets, wallet_txs. Sets up initial RLS policies.
backend/migrations/001_init_schema.sql
5-45
002 Billing installments table. Adds isolation for debt management.
backend/migrations/002_billing_schema.sql
5-26
003 P2P Logic Updates wallet_txs check constraint to allow TRANSFER_IN and TRANSFER_OUT.
backend/migrations/003_p2p_tx_types.sql
1-6
004 Penalties Adds penalty_amount to installments for the nightly worker.
backend/migrations/004_add_penalty_to_installments.sql
1-2
Sources:

backend/migrations/001_init_schema.sql
1-69
backend/migrations/002_billing_schema.sql
1-26
backend/migrations/003_p2p_tx_types.sql
1-6
backend/migrations/004_add_penalty_to_installments.sql
1-2
Tenant Provisioning (SuperAdmin)
Unlike business operations, tenant creation happens outside the RLS scope because a tenant does not yet belong to a tenant. The CreateTenantHandler uses the raw \*sqlx.DB connection instead of RunInTenantTx.

Function: CreateTenantHandler
backend/internal/tenant/handler.go
16
Bypass Logic: It performs a direct INSERT INTO tenants
backend/internal/tenant/handler.go
31-36
because the tenants table itself does not have RLS policies (it is the root of the hierarchy).
Sources:

backend/internal/tenant/handler.go
9-51
Connection Management
The database connection is managed in backend/pkg/database/db.go. It uses sqlx for extended SQL capabilities and configures a connection pool optimized for high-concurrency SaaS environments.

Max Open Connections: 25
backend/pkg/database/db.go
35
Max Idle Connections: 25
backend/pkg/database/db.go
36
Connection Lifetime: 5 minutes
backend/pkg/database/db.go
37
Sources:

backend/pkg/database/db.go
13-41

## Authentication & Authorization (JWT + RBAC)

Authentication & Authorization (JWT + RBAC)
Relevant source files
backend/cmd/api/main.go
backend/internal/auth/middleware.go
backend/internal/auth/rbac.go
backend/internal/user/handler.go
frontend/src/services/user.ts
This section details the security infrastructure of EduPay SaaS, covering the identity lifecycle from registration and password hashing to JWT issuance and the enforcement of Role-Based Access Control (RBAC). The system is designed to ensure strict tenant isolation and secure resource access across three distinct user roles.

Authentication Pipeline
The authentication process is managed through the user and auth packages. It relies on industry-standard practices: bcrypt for password hashing and JSON Web Tokens (JWT) for stateless session management.

User Registration & Password Hashing
When a user registers via RegisterHandler, the system performs the following steps:

Password Hashing: The plain-text password is encrypted using bcrypt.GenerateFromPassword with bcrypt.DefaultCost
backend/internal/user/handler.go
36-39
Atomic Provisioning: The user and their associated wallet are created within a single database transaction using database.RunInTenantTx to ensure data integrity
backend/internal/user/handler.go
44-65
Tenant Association: The tenant_id is extracted from the request context (injected by the tenant middleware) and stored in the users table to maintain multi-tenant isolation
backend/internal/user/handler.go
33-51
Login & JWT Issuance
The LoginHandler validates credentials and issues a signed token:

Lookup: The system searches for the user by email strictly within the current tenant's scope using Row-Level Security (RLS)
backend/internal/user/handler.go
121-124
Verification: bcrypt.CompareHashAndPassword compares the provided password with the stored hash
backend/internal/user/handler.go
133-135
Token Generation: A JWT is created with specific claims
backend/internal/user/handler.go
139-144
:
sub: User ID.
tenant_id: The ID of the university/tenant the user belongs to.
role: The user's role (STUDENT, ADMIN, or SUPERADMIN).
exp: Expiration timestamp (set to 24 hours).
Signing: The token is signed using HS256 with the JWT_SECRET defined in environment variables
backend/internal/user/handler.go
146-154
Authentication Flow Diagram
The following diagram illustrates the transition from the LoginRequest entity to the generated JWT token and its storage in the backend context.

Auth Flow: Credentials to Claims

Sources:
backend/internal/user/handler.go
84-165

backend/cmd/api/main.go
82

Authorization & Middlewares
Authorization is enforced via two primary middlewares: auth.Protected() for identity verification and auth.RequireRole() for permission management.

JWT Validation Middleware (Protected)
The auth.Protected() middleware intercepts requests to secure routes:

Header Extraction: It looks for the Authorization: Bearer <token> header
backend/internal/auth/middleware.go
15-30
Signature Verification: Validates the token using the JWT_SECRET. It specifically checks that the signing method is HMAC to prevent algorithm substitution attacks
backend/internal/auth/middleware.go
39-44
Cross-Check (Anti-IDOR): A critical security check compares the tenant_id inside the JWT claims against the tenant_id provided in the request header (X-Tenant-ID). If they do not match, the request is rejected with 403 Forbidden, preventing users from accessing other tenants' data even with a valid token
backend/internal/auth/middleware.go
58-65
Context Injection: Valid claims (user_id, user_role) are stored in c.Locals for downstream handlers
backend/internal/auth/middleware.go
68-69
RBAC Middleware (RequireRole)
The auth.RequireRole() middleware implements Role-Based Access Control:

It retrieves the user_role from the context (populated by Protected)
backend/internal/auth/rbac.go
10
It checks the user's role against a variadic list of allowedRoles
backend/internal/auth/rbac.go
19-24
If the role is not present in the allowed list, it returns 403 Forbidden
backend/internal/auth/rbac.go
27-29
Role Definitions
Role Description Access Level
STUDENT Standard user (Student) Access to own wallet, installments, and store.
ADMIN Staff user (Cajero) Access to student search, deposits, and billing management.
SUPERADMIN System-wide admin Access to tenant provisioning (/admin/tenants).
Middleware Implementation Diagram
This diagram shows how middlewares are chained in backend/cmd/api/main.go to protect sensitive routes.

Request Lifecycle & Middleware Chain

Sources:
backend/internal/auth/middleware.go
13-77

backend/internal/auth/rbac.go
7-31

backend/cmd/api/main.go
86-118

Route Protection Summary
The API routes are grouped by security requirements in backend/cmd/api/main.go:

Public Global: /health, /admin/tenants, /webhooks/mercadopago (No tenant or auth required)
backend/cmd/api/main.go
62-73
Public Tenant: /api/users/register, /api/users/login (Requires X-Tenant-ID, no JWT)
backend/cmd/api/main.go
81-82
Protected Student: /api/wallets/me, /api/billing/installments/:id/payments, etc. (Requires JWT + valid tenant_id)
backend/cmd/api/main.go
91-101
Protected Admin: /api/users/search, /api/billing/installments (Requires JWT + role == "ADMIN")
backend/cmd/api/main.go
107-118
Sources:

backend/cmd/api/main.go
1-128
backend/internal/user/handler.go
1-165
backend/internal/auth/middleware.go
1-77
backend/internal/auth/rbac.go
1-31

## Nightly Worker - Penalty Calculation

Nightly Worker — Penalty Calculation
Relevant source files
backend/cmd/worker/main.go
backend/migrations/003_p2p_tx_types.sql
backend/migrations/004_add_penalty_to_installments.sql
backend/pkg/database/tx.go
The Nightly Worker is a standalone maintenance process responsible for the daily accumulation of interest on overdue student debts. It operates independently of the main API server, leveraging Go's concurrency primitives to process all tenants in parallel while maintaining strict data isolation through the system's multi-tenant transaction architecture.

1. Process Overview
   The worker is located in backend/cmd/worker/main.go and is designed to be executed as a scheduled job (e.g., a CronJob). Its primary responsibility is to iterate through every university (tenant) in the system and apply a simple interest calculation to any installments that remain in a PENDING state past their due_date.

High-Level Execution Flow
Initialization: Connects to the database and loads environment variables
backend/cmd/worker/main.go
22-26
Tenant Discovery: Queries the tenants table to retrieve all active university IDs and their specific default_interest_rate
backend/cmd/worker/main.go
30-34
Concurrent Processing: Spawns a dedicated Goroutine for each tenant
backend/cmd/worker/main.go
42-56
Isolated Calculation: Each Goroutine executes processTenantPenalties, which wraps the database update in a RunInTenantTx block to ensure Row-Level Security (RLS) compliance
backend/cmd/worker/main.go
64-66
Synchronization: Uses a sync.WaitGroup to ensure the main process only exits once every tenant has been processed
backend/cmd/worker/main.go
39-59
Worker Architecture & Concurrency
The following diagram illustrates how the main function coordinates concurrent tenant processing using standard Go synchronization.

Diagram: Worker Concurrency Model

Sources:
backend/cmd/worker/main.go
19-61

backend/pkg/database/tx.go
12-58

2. Penalty Calculation Logic
   The worker implements a Simple Interest model. Interest is not compounded; instead, a fixed percentage of the original principal is added to the total penalty amount every time the worker runs.

The Mathematical Formula
The SQL update follows this logic: New Penalty Amount = Current Penalty Amount + (Original Installment Amount \* Daily Interest Rate)

Database Implementation
The calculation is performed via a bulk UPDATE statement within the scope of a tenant-specific transaction.

Requirement Implementation Detail
Target Records status = 'PENDING' AND due_date < CURRENT_DATE
backend/cmd/worker/main.go
75-76
Calculation penalty_amount = penalty_amount + (amount \* $1)
backend/cmd/worker/main.go
74
Data Integrity Uses RunInTenantTx to set app.current_tenant before execution
backend/cmd/worker/main.go
66

backend/pkg/database/tx.go
42
Sources:
backend/cmd/worker/main.go
64-89

backend/migrations/004_add_penalty_to_installments.sql
1-2

3. Data Schema: Migration 004
   To support the accumulation of interest, the database schema was extended in migration 004.

File: backend/migrations/004_add_penalty_to_installments.sql
Column: penalty_amount
Type: NUMERIC(15,2)
Default: 0.00
This column tracks the total accrued interest separately from the base amount of the installment. When a student pays an installment, the business logic (documented in the Billing Module) sums amount + penalty_amount to determine the total debt
backend/migrations/004_add_penalty_to_installments.sql
1-2

4. Multi-Tenant Transaction Safety
   A critical component of the worker is the use of database.RunInTenantTx. Because the worker iterates through all tenants, it must switch the PostgreSQL session context for every calculation to ensure it does not accidentally modify data belonging to a different university.

Diagram: Transaction Context Injection

Key Function: RunInTenantTx
The helper function
backend/pkg/database/tx.go
12-58
performs the following:

Starts a Transaction: db.Beginx()
backend/pkg/database/tx.go
14
Sets Context: Executes set_config('app.current_tenant', ...)
backend/pkg/database/tx.go
42
Error Handling: Uses a defer block with recover() to handle panics and ensure tx.Rollback() is called if the interest calculation fails
backend/pkg/database/tx.go
20-38
Commits: Finalizes changes only if the internal logic returns no error
backend/pkg/database/tx.go
53
Sources:
backend/pkg/database/tx.go
12-58

backend/cmd/worker/main.go
66-88

## Backend - Businness Modules

Backend — Business Modules
Relevant source files
backend/cmd/api/main.go
backend/internal/billing/handler.go
backend/internal/billing/pdf.go
backend/internal/mailer/mailer.go
backend/internal/payment/handler.go
backend/internal/store/handler.go
backend/internal/store/models.go
backend/internal/store/pdf.go
backend/internal/store/service.go
backend/internal/utils/pagination.go
backend/internal/wallet/handler.go
ngrok.exe
This section provides a high-level overview of the five core business modules that drive the EduPay SaaS platform. These modules handle everything from financial debt management and digital wallets to external payment integrations and asynchronous document delivery.

Module Interaction Overview
The system is designed as a modular monolith where business logic is separated by domain but shares a common multi-tenant infrastructure. Modules interact primarily through the shared PostgreSQL database, often utilizing database.RunInTenantTx
backend/cmd/api/main.go
78
to ensure Row-Level Security (RLS) and ACID compliance.

System Entity Map
The following diagram illustrates how natural language business concepts map to specific code entities and database structures.

Sources:
backend/cmd/api/main.go
91-118

backend/internal/billing/handler.go
179

backend/internal/wallet/handler.go
74

backend/internal/store/models.go
14-18

1. Billing Module — Installments & Receipts
   The Billing Module manages the lifecycle of student obligations. Admins (Cajeros) create installments which represent debt, while Students pay them using their wallet balance.

Key Logic: Includes dynamic interest calculation (mora) and PDF receipt generation using gofpdf.
Status Lifecycle: PENDING → PAID or OVERDUE.
Critical Operations: PayInstallmentHandler uses FOR UPDATE locking to prevent double-spending.
For details, see Billing Module — Installments & Receipts.

Sources:
backend/internal/billing/handler.go
53-139

backend/internal/billing/pdf.go
12-44

2. Wallet Module — Ledger, Deposits & P2P Transfers
   The Wallet Module acts as the system's internal bank. It maintains a ledger of all financial movements and handles the logic for student-to-student transfers.

Ledger: Every movement is recorded in the wallet_txs table with types like DEPOSIT, PURCHASE, or TRANSFER_IN/OUT.
P2P Transfers: Implements deadlock prevention by ordering wallet locks based on ID.
Pagination: Uses a generic PaginatedResponse[T] utility for efficient history browsing.
For details, see Wallet Module — Ledger, Deposits & P2P Transfers.

Sources:
backend/internal/wallet/handler.go
32-46

backend/internal/wallet/handler.go
198-213

backend/internal/utils/pagination.go
6-12

3. Payment Module — MercadoPago Integration
   The Payment Module bridges the gap between external fiat currency and the internal digital wallet via MercadoPago.

Preference Creation: CreatePreferenceHandler generates a sandbox_init_point for the frontend.
Webhooks: WebhookHandler processes async notifications from MercadoPago, credits the wallet, and triggers a confirmation email.
Dev Mode: Includes a bypass (ID 9999) for local testing without real network calls.
For details, see Payment Module — MercadoPago Integration.

Sources:
backend/internal/payment/handler.go
46-124

backend/internal/payment/handler.go
134-182

4. Store Module — Certificate Catalog & Async PDF Delivery
   The Store Module allows students to purchase academic documents (certificates) using their wallet balance.

Catalog: Uses an in-memory map Catalog for high-performance item validation.
Non-blocking Flow: PurchaseHandler returns an immediate HTTP 200 to the user while a background goroutine generates the PDF and sends it via email.
Atomic Purchases: ProcessPurchase ensures that balance deduction and student data retrieval happen in a single ACID transaction.
For details, see Store Module — Certificate Catalog & Async PDF Delivery.

Sources:
backend/internal/store/models.go
14-18

backend/internal/store/handler.go
14-74

backend/internal/store/service.go
9-62

5. User Module & Mailer Service
   The User Module manages identity, while the Mailer Service provides the communication infrastructure for the entire backend.

Registration: Atomically creates both a user and their wallet within a single RLS-protected transaction.
Search: Provides case-insensitive student lookup for admins.
Mailer: A wrapper around the Resend API that handles in-memory PDF attachments for both receipts and certificates.
For details, see User Module & Mailer Service.

Sources:
backend/cmd/api/main.go
81-82

backend/internal/mailer/mailer.go
11-87

Business Workflow Integration
This diagram shows how a student interacts with multiple modules during a standard "Top-up and Purchase" flow.

Sources:
backend/internal/payment/handler.go
182-210

backend/internal/store/handler.go
40-72

## Billing Module - Installments & Receipts

Billing Module — Installments & Receipts
Relevant source files
backend/cmd/worker/main.go
backend/internal/billing/handler.go
backend/internal/billing/pdf.go
backend/internal/payment/handler.go
backend/migrations/001_init_schema.sql
backend/migrations/002_billing_schema.sql
backend/migrations/003_p2p_tx_types.sql
backend/migrations/004_add_penalty_to_installments.sql
database_audit_report.md
ngrok.exe
The Billing Module manages the lifecycle of student financial obligations, from debt creation by administrators to payment and receipt generation. It is built on a multi-tenant architecture using PostgreSQL Row-Level Security (RLS) to ensure data isolation between different educational institutions.

Installment Lifecycle & States
Financial obligations (installments) move through a defined set of states within the installments table
backend/migrations/002_billing_schema.sql
11

State Description
PENDING The default state when an admin creates a debt. The student has not yet paid.
OVERDUE An installment whose due_date has passed without payment. Penalties may apply.
PAID The final state after a successful transaction using the student's wallet balance.
Data Flow: Installment Creation to Payment
The following diagram illustrates the interaction between the CreateInstallmentHandler and PayInstallmentHandler within the multi-tenant context.

Installment Management Flow

Sources:
backend/internal/billing/handler.go
67-123

backend/internal/billing/handler.go
139-282

backend/migrations/002_billing_schema.sql
5-14

Core Handlers & Business Logic
CreateInstallmentHandler
Used by administrators to assign debt to a student. It enforces strict UTC date validation to prevent creating backdated obligations
backend/internal/billing/handler.go
80-97

Transaction Safety: Uses database.RunInTenantTx to ensure the tenant_id is correctly associated via RLS
backend/internal/billing/handler.go
102-108
PayInstallmentHandler
A critical transactional endpoint where a student pays an installment using their wallets.current_balance.

Concurrency Control: Employs SELECT ... FOR UPDATE on both the installment and the student's wallet to prevent race conditions or double-spending
backend/internal/billing/handler.go
179

backend/internal/billing/handler.go
214
Dynamic Penalties: Calculates "Mora" (interest) on the fly if the payment is made after the due_date. It retrieves the default_interest_rate from the tenants table
backend/internal/billing/handler.go
164-169
and adds any penalty_amount accumulated by the nightly worker
backend/internal/billing/handler.go
203-205
Idempotency Check: Verifies if the installment status is already PAID before proceeding
backend/internal/billing/handler.go
187-193
GetBillingStatsHandler
Provides a dashboard summary for administrators, aggregating financial health metrics across the tenant:

Total Collected: Sum of amount + penalty_amount where status is PAID.
Total Debt: Sum of outstanding amount for PENDING and OVERDUE records.
Overdue Count: Count of installments where due_date < CURRENT_DATE. Sources:
backend/internal/billing/handler.go
391-454
Penalty Calculation & Nightly Worker
The system applies simple interest to overdue debts via a standalone worker process (backend/cmd/worker/main.go).

Architecture: The worker iterates through all tenants in the tenants table
backend/cmd/worker/main.go
31
and spawns a goroutine for each
backend/cmd/worker/main.go
46-56
Logic: For every tenant, it executes an UPDATE statement that increments the penalty_amount column (added in migration 004) based on the amount \* default_interest_rate
backend/cmd/worker/main.go
72-77
Isolation: Each goroutine uses RunInTenantTx to ensure the worker's DB session is restricted to the specific tenant's data
backend/cmd/worker/main.go
66
Sources:
backend/cmd/worker/main.go
1-90

backend/migrations/004_add_penalty_to_installments.sql
1-2

Receipt Generation (PDF)
The DownloadReceiptHandler allows students to generate a legal support document for their payments.

Code to PDF Mapping

Library: Uses github.com/jung-kurt/gofpdf to construct the document in memory
backend/internal/billing/pdf.go
8-14
Buffer-Based: The PDF is generated into a bytes.Buffer and returned as a byte slice
backend/internal/billing/pdf.go
37-43
avoiding disk I/O and improving performance.
Content: Includes the institution name (via tenant context), student name, amount paid (including penalties), and a timestamp
backend/internal/billing/pdf.go
24-30
Sources:
backend/internal/billing/pdf.go
12-44

backend/internal/billing/handler.go
323-388

Database Schema: Billing
The billing module relies on the installments table, which is secured by RLS policies.

Column Type Description
id UUID Primary Key (Default gen_random_uuid())
tenant_id UUID Foreign Key to tenants. Used for RLS isolation.
user_id UUID Foreign Key to users (the student).
amount NUMERIC(15,2) The base principal amount of the debt.
penalty_amount NUMERIC(15,2) Accumulated interest (added in Migration 004).
status TEXT Constraint: PENDING, PAID, OVERDUE.
due_date DATE Deadline for payment without additional penalties.
Sources:
backend/migrations/002_billing_schema.sql
5-26

backend/migrations/004_add_penalty_to_installments.sql
1-2

## Wallet Module - Ledger, Deposits & P2P Transfers

Wallet Module — Ledger, Deposits & P2P Transfers
Relevant source files
backend/internal/utils/pagination.go
backend/internal/wallet/handler.go
backend/migrations/001_init_schema.sql
backend/migrations/002_billing_schema.sql
database_audit_report.md
The Wallet Module serves as the financial core of the EduPay SaaS platform. It manages a double-entry style ledger system where every balance change is recorded as a transaction. The module handles administrative deposits, peer-to-peer (P2P) transfers between students, and provides paginated audit logs for both users and administrators.

1. Data Model & Ledger System
   The system uses a strictly typed ledger to track all movements of funds. Money is never stored as a floating-point number; the schema uses NUMERIC(15,2) to ensure decimal precision for financial calculations
   backend/migrations/001_init_schema.sql
   29-39

Transaction Types (tx_type)
Every entry in the wallet_txs table must belong to one of the following categories
backend/migrations/001_init_schema.sql
38
:

DEPOSIT: Funds added by an Admin or via MercadoPago.
PURCHASE: Funds deducted for store items (e.g., certificates).
FEE: Deductions for installment payments or interest.
TRANSFER_IN: Funds received from another student.
TRANSFER_OUT: Funds sent to another student.
Multi-Tenant Ledger Entity Map
The following diagram maps the logical ledger concepts to the physical database entities and their constraints.

Ledger Entity Mapping

Sources:
backend/migrations/001_init_schema.sql
25-46

2. Deposit Logic (Admin Crediting)
   The DepositHandler allows users with the ADMIN role to manually credit a student's wallet. This is typically used for cash payments at a physical office.

Implementation Details
Row Locking: The handler uses SELECT ... FOR UPDATE on the wallets table to lock the specific row, preventing race conditions if multiple deposits occur simultaneously
backend/internal/wallet/handler.go
74-77
Atomic Execution: The balance update and the transaction log insertion are wrapped in database.RunInTenantTx, ensuring that a balance never increases without a corresponding ledger entry
backend/internal/wallet/handler.go
67-94
Deposit Flow

Step Action Code Entity
1 Parse DepositRequest DepositHandler
backend/internal/wallet/handler.go
57-60
2 Start Tenant Transaction database.RunInTenantTx
backend/internal/wallet/handler.go
67
3 Lock Wallet Row tx.Get with FOR UPDATE
backend/internal/wallet/handler.go
74-77
4 Increment Balance UPDATE wallets
backend/internal/wallet/handler.go
80-83
5 Log Transaction INSERT INTO wallet_txs
backend/internal/wallet/handler.go
86-91 3. P2P Transfers & Deadlock Prevention
The TransferHandler facilitates money movement between students. This is the most complex operation in the module because it involves updating two different wallets and two different ledger entries in a single transaction.

Deadlock Prevention Strategy
When two users transfer money to each other at the exact same time, a deadlock can occur if the system locks their wallets in different orders (e.g., Tx1 locks A then B, while Tx2 locks B then A).

The system prevents this by ordered locking: it compares the UUIDs of the sender and receiver and always locks the "smaller" ID first
backend/internal/wallet/handler.go
237-251

Dual Ledger Entries
For every transfer, two entries are created in wallet_txs:

TRANSFER_OUT for the sender
backend/internal/wallet/handler.go
283-288
TRANSFER_IN for the receiver
backend/internal/wallet/handler.go
291-296
Transfer Execution Diagram

Sources:
backend/internal/wallet/handler.go
198-312

4. Paginated History & Dashboard
   The GetWalletDashboardHandler provides the student with their current balance and a paginated history of transactions.

PaginatedResponse[T] Utility
The system uses a generic utility PaginatedResponse[T] to standardize API responses
backend/internal/utils/pagination.go
6-12

Data: Slice of the requested type (e.g., TransactionDTO).
Total: Total count of records in the DB (for UI page numbering).
TotalPages: Calculated using CalculateTotalPages
backend/internal/utils/pagination.go
15-27
Implementation in Wallet
The handler calculates the SQL OFFSET based on the requested page and limit
backend/internal/wallet/handler.go
151-159
It also includes a safety check to cap the limit at 50 records to prevent memory exhaustion
backend/internal/wallet/handler.go
130-132

Wallet Dashboard Logic

Component Function / Query File Reference
Balance Fetch SELECT id, current_balance, updated_at
backend/internal/wallet/handler.go
138
Total Count SELECT COUNT(\*) FROM wallet_txs
backend/internal/wallet/handler.go
145
Paged Fetch SELECT ... LIMIT $2 OFFSET $3
backend/internal/wallet/handler.go
154-159
Page Calculation utils.CalculateTotalPages
backend/internal/utils/pagination.go
15 5. Global Audit Log (Admin)
The GetAdminTransactions handler provides a tenant-wide view of all financial movements. Unlike the student dashboard, this view is not filtered by a specific wallet_id, allowing administrators to monitor all DEPOSIT, PURCHASE, and TRANSFER activities within their institution.

Security and RLS
Even though this is a global log, it is strictly governed by Row-Level Security (RLS). The RunInTenantTx wrapper ensures that an admin from "University A" can never see transaction logs from "University B", as the PostgreSQL session is restricted to the admin's tenant_id
backend/migrations/001_init_schema.sql
68-69

Sources:
backend/internal/wallet/handler.go
323-380

backend/pkg/database/tenant_tx.go
10-20

## Payment Module - Mercado Pago Integration

Payment Module — MercadoPago Integration
Relevant source files
The Payment Module facilitates external fund ingestion into the EduPay ecosystem. It leverages MercadoPago as the primary payment gateway, enabling students to top up their virtual wallets using local payment methods (specifically COP currency). The integration follows an asynchronous notification pattern using webhooks to ensure ledger consistency even if the user closes their browser during the redirect.

Implementation Overview
The integration is divided into two main phases:

Preference Creation: The student requests a top-up, and the system generates a unique MercadoPago Checkout URL.
Webhook Confirmation: MercadoPago notifies the system of a successful payment, triggering an asynchronous workflow to update the wallet, generate a receipt, and notify the student via email.
Data Flow: Top-up Lifecycle
The following diagram illustrates the interaction between the Student, the EduPay Backend, and the MercadoPago API.

Payment Flow & Code Entities

Sources:
backend/internal/payment/handler.go
46-124

backend/internal/payment/handler.go
134-210

frontend/src/services/payment.ts
3-8

Key Components
CreatePreferenceHandler
This handler generates a dynamic payment link. It constructs a MPPreferenceBody containing the item details, the amount, and an ExternalReference which maps to the student's user_id. This reference is critical for identifying the user when the webhook returns.

Minimum Amount: Enforced at $1,000 COP
backend/internal/payment/handler.go
51-53
Dynamic Redirects: Uses FRONTEND_URL from environment variables to build BackURLs (Success, Failure, Pending)
backend/internal/payment/handler.go
56-64
Sandbox Mode: Returns sandbox_init_point for testing environments
backend/internal/payment/handler.go
113-122
WebhookHandler
The webhook is the entry point for asynchronous payment confirmations. It follows the "respond fast" rule by returning an immediate HTTP 200 to MercadoPago before processing the business logic
backend/internal/payment/handler.go
137-138

Development Bypass (paymentID=9999)
To facilitate local development without exposing the local server via tools like ngrok, a bypass is implemented. If APP_ENV is set to development, sending a paymentID=9999 allows the developer to simulate a successful payment without a real MercadoPago API call
backend/internal/payment/handler.go
153-160

Transactional Integrity via RunInTenantTx
Upon receiving an approved status, the handler:

Retrieves the student's tenant_id
backend/internal/payment/handler.go
190-194
Wraps the ledger update in database.RunInTenantTx. This ensures that the UPDATE on the wallets table and the INSERT into wallet_txs are atomic and respect Row-Level Security (RLS)
backend/internal/payment/handler.go
197-210
Sources:
backend/internal/payment/handler.go
46-124

backend/internal/payment/handler.go
134-210

pkg/database/tenant_tx.go (implied)

Async Notification & PDF Generation
Once the database transaction is committed, the WebhookHandler triggers a background goroutine to handle non-critical side effects. This prevents the webhook response from being delayed by PDF generation or external API latency from the mail provider.

Entity Relationship: Webhook Processing

Process Details
PDF Generation: billing.GenerateReceiptBytes uses the gofpdf library to create a formal receipt in memory. It includes the student's name, the date, and the accredited amount
backend/internal/billing/pdf.go
12-44
Email Delivery: The mailer.SendReceiptEmail function initializes a Resend client using RESEND_API_KEY. It attaches the raw bytes from the PDF buffer directly to the email request
backend/internal/mailer/mailer.go
11-48
Sources:
backend/internal/payment/handler.go
215-240

backend/internal/billing/pdf.go
12-44

backend/internal/mailer/mailer.go
11-48

Technical Reference
Data Structures
Struct Purpose Key Fields
PreferenceRequest Incoming request from Frontend Amount
backend/internal/payment/handler.go
18-20
MPPreferenceBody Outgoing request to MercadoPago Items, ExternalReference, BackURLs
backend/internal/payment/handler.go
38-43
MPPaymentResponse Response from MercadoPago API Status, TransactionAmount, ExternalReference
backend/internal/payment/handler.go
127-131
Endpoints
Method Path Handler Auth
POST /payments/preference CreatePreferenceHandler JWT (Student)
POST /webhooks/mercadopago WebhookHandler Public (MP Signature)
Sources:
backend/internal/payment/handler.go
18-43

backend/internal/payment/handler.go
127-131

## Store Module — Certificate Catalog & Async PDF Delivery

.4 Store Module — Certificate Catalog & Async PDF Delivery
Relevant source files
backend/internal/mailer/mailer.go
backend/internal/store/handler.go
backend/internal/store/models.go
backend/internal/store/pdf.go
backend/internal/store/service.go
frontend/src/App.tsx
frontend/src/components/layouts/StudentNavbar.tsx
frontend/src/services/store.ts
The Store Module enables students to purchase academic documents using their wallet balance. It is designed around a non-blocking UI pattern: the system validates the transaction and deducts funds atomically, provides an immediate HTTP 200 response to the user, and offloads the resource-intensive tasks of PDF generation and email delivery to background goroutines.

Certificate Catalog
For the MVP phase, the store utilizes an in-memory Catalog instead of database tables to define available products. This allows for $O(1)$ access speeds and simplifies the architecture by avoiding unnecessary migrations for static university services
backend/internal/store/models.go
12-18

Item ID Name Price (COP)
cert_estudio Certificado de Estudio 15,000.00
cert_notas Certificado de Notas 20,000.00
derecho_grado Derechos de Grado 350,000.00
Sources:
backend/internal/store/models.go
14-18

Transactional Purchase Flow
The PurchaseHandler manages the lifecycle of a purchase. It ensures that a student cannot buy a document without sufficient funds and that the balance deduction is thread-safe.

1. Request Validation
   The handler extracts the user_id from the JWT context
   backend/internal/store/handler.go
   17-22
   and parses the PurchaseRequest DTO
   backend/internal/store/models.go
   21-23
   It validates that the requested item_id exists in the Catalog before initiating any database operations
   backend/internal/store/models.go
   26-36

2. ACID Balance Deduction
   The core logic resides in ProcessPurchase, which executes a secure transaction:

Row Locking: It uses FOR UPDATE on the wallets table to prevent race conditions (e.g., double-spending)
backend/internal/store/service.go
31-35
Data Retrieval: It performs a JOIN with the users table to fetch the student's name and email in a single query
backend/internal/store/service.go
32-35
Balance Check: It verifies if current_balance >= item.Price
backend/internal/store/service.go
42-44
Atomic Update: It decrements the balance and commits the transaction
backend/internal/store/service.go
47-58 3. Non-Blocking Response & Async Delivery
Once the transaction is committed, the handler spawns a goroutine to handle the "heavy" tasks
backend/internal/store/handler.go
52-65
This allows the server to return a success message to the frontend in approximately 5ms, regardless of how long the PDF generation or Resend API call takes
backend/internal/store/handler.go
68-72

Sources:
backend/internal/store/handler.go
14-73

backend/internal/store/service.go
9-62

Code Entity Map: Purchase Lifecycle
This diagram maps the natural language flow of a purchase to the specific Go functions and structures in the store package.

Purchase Sequence & Entity Mapping

Sources:
backend/internal/store/handler.go
40-72

backend/internal/store/service.go
31-58

frontend/src/services/store.ts
18-22

PDF Generation & Email Delivery
The system generates documents in-memory to avoid disk I/O overhead and security risks associated with temporary files.

PDF Compilation
The GenerateCertificatePDF function uses gofpdf to create a formal document
backend/internal/store/pdf.go
12

It sets institutional headers for "UNIVERSIDAD COOPERATIVA DE COLOMBIA"
backend/internal/store/pdf.go
19
It includes an automated timestamp for authenticity
backend/internal/store/pdf.go
36-37
The final document is written to a bytes.Buffer and returned as a byte slice ([]byte)
backend/internal/store/pdf.go
41-47
Mailer Integration
The mailer.SendCertificateEmail function receives the raw bytes and interacts with the Resend API
backend/internal/mailer/mailer.go
51-57
It attaches the buffer as "Certificado_EduPay.pdf"
backend/internal/mailer/mailer.go
72-77

Sources:
backend/internal/store/pdf.go
12-48

backend/internal/mailer/mailer.go
51-87

Implementation Detail: Data Flow
The following diagram illustrates how data moves from the static Catalog through the database and finally into the gofpdf generator.

Data Flow: Catalog to PDF

Sources:
backend/internal/store/models.go
14-18

backend/internal/store/service.go
31-35

backend/internal/store/pdf.go
41-47

backend/internal/store/handler.go
54-61

## User Module & Mailer Service

User Module & Mailer Service
Relevant source files
backend/internal/mailer/mailer.go
backend/internal/store/handler.go
backend/internal/store/models.go
backend/internal/store/pdf.go
backend/internal/store/service.go
backend/internal/user/handler.go
frontend/src/services/user.ts
The User Module manages the lifecycle of identity and access within the EduPay SaaS platform, while the Mailer Service handles asynchronous communication for transactional receipts and digital assets. This system ensures that user creation is coupled with financial initialization and provides a secure, multi-tenant authentication mechanism.

User Authentication & Registration
The authentication system is built on Bcrypt for password hashing and JWT (JSON Web Tokens) for stateless session management. Every user operation is scoped to a specific tenant via PostgreSQL Row-Level Security (RLS).

RegisterHandler
The RegisterHandler
backend/internal/user/handler.go
25-82
implements an atomic registration flow. When a new user (ADMIN or STUDENT) is created, the system must also initialize their financial state. This is performed inside a database.RunInTenantTx block
backend/internal/user/handler.go
44-65
to ensure that if the wallet creation fails, the user record is rolled back.

Password Hashing: Uses bcrypt.GenerateFromPassword with DefaultCost
backend/internal/user/handler.go
36-39
User Insertion: Inserts into the users table, returning the new UUID
backend/internal/user/handler.go
46-53
Wallet Initialization: Automatically creates a record in the wallets table with a current_balance of 0.00
backend/internal/user/handler.go
56-62
LoginHandler
The LoginHandler
backend/internal/user/handler.go
103-165
authenticates users and issues a signed JWT.

Tenant Isolation: The query to find the user by email is wrapped in a tenant transaction, ensuring users cannot log into tenants they do not belong to
backend/internal/user/handler.go
121-124
JWT Claims: The issued token includes the user ID (sub), tenant_id, role, and an expiration of 24 hours
backend/internal/user/handler.go
139-144
Signing: Tokens are signed using the JWT_SECRET environment variable
backend/internal/user/handler.go
149-154
Student Search
The SearchStudentHandler
backend/internal/user/handler.go
168-209
allows administrators to find students by email. It performs a case-insensitive lookup using LOWER(u.email) and joins the wallets table to provide the student's current balance in a single view
backend/internal/user/handler.go
193-198

Registration & Auth Flow
This diagram bridges the RegisterHandler logic with the database entities.

Sources:
backend/internal/user/handler.go
25-82

backend/internal/user/handler.go
103-165

Mailer Service
The mailer package provides a wrapper around the Resend API to deliver system-generated documents. A key architectural decision in EduPay is the use of in-memory PDF generation, avoiding the need for persistent file storage or temporary disk writes.

Core Functions
SendReceiptEmail: Used by the payment module to send top-up confirmations
backend/internal/mailer/mailer.go
11-48
SendCertificateEmail: Used by the store module to deliver purchased digital certificates
backend/internal/mailer/mailer.go
51-87
Implementation Details
API Integration: Uses the resend-go/v2 client initialized with RESEND_API_KEY
backend/internal/mailer/mailer.go
12-17
In-Memory Attachments: The pdfBytes []byte parameter is injected directly into the resend.Attachment struct
backend/internal/mailer/mailer.go
33-38
Sender Policy: In development/free tiers, the From field is restricted to onboarding@resend.dev
backend/internal/mailer/mailer.go
21
Async PDF Delivery Pattern
The PurchaseHandler in the store module demonstrates the non-blocking pattern used for email delivery.

Sources:
backend/internal/mailer/mailer.go
1-88

backend/internal/store/handler.go
50-65

backend/internal/store/pdf.go
12-48

Data Transfer Objects (DTOs)
The following structures define the communication between the frontend and the User/Mailer services.

Struct / Interface File Purpose
RegisterRequest
backend/internal/user/handler.go
18-23
Payload for creating new users.
LoginRequest
backend/internal/user/handler.go
85-88
Payload for authentication.
StudentSearchResponse
frontend/src/services/user.ts
3-9
Frontend interface for student lookup results.
resend.SendEmailRequest
backend/internal/mailer/mailer.go
20-39
External DTO for the Resend API.
Case-Insensitive Search Logic
The SearchStudentHandler uses the following SQL to ensure robustness against user input variations:
backend/internal/user/handler.go
193-198

SELECT u.id, u.full_name, u.email, w.current_balance
FROM users u
JOIN wallets w ON u.id = w.user_id
WHERE LOWER(u.email) = LOWER($1) AND UPPER(u.role) = 'STUDENT'
Sources:
backend/internal/user/handler.go
168-209

frontend/src/services/user.ts
1-20

# Frontend — Application Structure

Frontend — Application Structure
Relevant source files
backend/docs/docs.go
backend/docs/swagger.json
backend/docs/swagger.yaml
frontend/package.json
frontend/pnpm-lock.yaml
frontend/src/App.tsx
frontend/src/components/layouts/StudentNavbar.tsx
frontend/src/index.css
frontend/src/main.tsx
frontend/src/pages/student/Store.tsx
frontend/src/router/AppRouter.tsx
frontend/src/router/PrivateRoute.tsx
frontend/src/services/api.ts
frontend/src/services/store.ts
frontend/tsconfig.app.json
The EduPay SaaS frontend is a Single Page Application (SPA) built with React 19, TypeScript, and Vite. It is designed to handle three distinct user personas (Student, Admin, SuperAdmin) within a multi-tenant architecture. The UI utilizes the Nord Design System for a professional financial aesthetic and relies on Zustand for lightweight state management.

Project Layout & Tech Stack
The project follows a standard React structure, separating services, state management, and role-based views.

Framework: React 19 with Vite
frontend/package.json
16-43
Styling: Tailwind CSS with a custom "Nord" institutional palette
frontend/src/index.css
3-25
State: Zustand for authentication persistence
frontend/package.json
23
Navigation: React Router 7 for role-based routing and guards
frontend/package.json
19-20
Notifications: Sileo for standardized toast alerts
frontend/src/services/api.ts
3
Core Directory Structure
Directory Responsibility
src/components Reusable UI components and Layouts (StudentLayout, AdminLayout, etc.).
src/pages Domain-specific views grouped by role (student/, admin/, superadmin/).
src/services Axios instance (api.ts) and API service modules.
src/store Zustand stores (e.g., authStore.ts).
Centralized API Client
All communication with the Go backend is funneled through a centralized Axios instance in api.ts. This module implements interceptors to handle multi-tenancy and authentication automatically.

Interceptor Logic
Request Interceptor: Automatically injects the X-Tenant-ID from environment variables and the Authorization: Bearer <token> from localStorage into every outgoing request
frontend/src/services/api.ts
14-33
Response Interceptor: Monitors for 401 Unauthorized errors to trigger an automatic logout() and redirect to the login page
frontend/src/services/api.ts
36-50
It also provides global error handling using sileo notifications for server-side errors
frontend/src/services/api.ts
51-76
Sources:
frontend/src/services/api.ts
6-77

Authentication & Routing Architecture
The application uses a nested routing strategy in App.tsx to enforce security boundaries.

Navigation Flow
The BrowserRouter manages three distinct zones protected by two layers of guards:

ProtectedRoute: Verifies the presence of a valid JWT
frontend/src/App.tsx
34
RoleRoute: Validates that the user's role (decoded from JWT) matches the required access level for that specific path (STUDENT, ADMIN, or SUPERADMIN)
frontend/src/App.tsx
36-62
Code-to-System Mapping
The following diagram illustrates how React components and services map to the application's security and navigation layers.

Frontend Security & Routing Map

Sources:
frontend/src/App.tsx
24-65

frontend/src/services/api.ts
14-26

frontend/src/services/store.ts
12-23

Design System: Nord Palette
The application uses a custom theme inspired by financial institutions, emphasizing security and growth.

Variable Hex Purpose
--color-nord-0 #0f172a Primary background (Navy)
frontend/src/index.css
5
--color-nord-8 #10b981 Primary Brand Color (Emerald Green)
frontend/src/index.css
15
--color-nord-11 #ef4444 Error / Danger states
frontend/src/index.css
20
--color-nord-15 #6366f1 Admin role accents (Indigo)
frontend/src/index.css
24
Sub-System Overviews

1. Routing, Auth Guards & State Management
   Detailed documentation on the useAuthStore implementation, JWT decoding, and the logic behind ProtectedRoute.

For details, see Routing, Auth Guards & State Management. 2. Student Portal
Covers the student experience, including parallel data fetching in the dashboard, P2P transfers, and the asynchronous certificate store flow.

For details, see Student Portal — Dashboard, Transfer & Store. 3. Admin Portal
Documents the "Cajero" (Cashier) tools for student searching, manual debt creation, and global transaction auditing.

For details, see Admin Portal — Dashboard, Billing, Students & Transactions. 4. SuperAdmin Portal
Focuses on the SaaS owner's ability to provision new tenants (universities) without RLS restrictions.

For details, see SuperAdmin Portal — Tenant Provisioning.
Component Dependency Diagram

Sources:
frontend/src/services/api.ts
1-78

frontend/src/App.tsx
1-67

## Routing, Auth Guards & State Management

Routing, Auth Guards & State Management
Relevant source files
frontend/src/App.tsx
frontend/src/components/ProtectedRoute.tsx
frontend/src/components/RoleRoute.tsx
frontend/src/components/layouts/StudentNavbar.tsx
frontend/src/components/layouts/SuperAdminLayout.tsx
frontend/src/pages/auth/Login.tsx
frontend/src/pages/student/Store.tsx
frontend/src/services/api.ts
frontend/src/services/auth.ts
frontend/src/services/store.ts
frontend/src/store/authStore.ts
frontend/src/types/auth.ts
This section documents the frontend infrastructure responsible for navigation, session security, and global state. The system utilizes a hierarchical routing model combined with a centralized Zustand store and Axios interceptors to enforce multi-tenancy and Role-Based Access Control (RBAC).

1. Global State Management: useAuthStore
   The application uses Zustand to manage authentication state. The useAuthStore is responsible for persisting the JWT in localStorage, decoding user claims, and providing a global logout mechanism.

Implementation Details
Token Persistence: The store initializes by reading from localStorage
frontend/src/store/authStore.ts
31
JWT Decoding: It uses jwt-decode to extract sub, role, tenant_id, and exp from the token
frontend/src/store/authStore.ts
4-9
Reactive Updates: The setToken function updates both localStorage and the React state, ensuring the UI reacts immediately to login events
frontend/src/store/authStore.ts
34-43
Auth State Data Flow
The following diagram illustrates how the useAuthStore bridges the gap between raw token strings and application-level user objects.

Diagram: Auth State Hydration

Sources:
frontend/src/store/authStore.ts
18-50

2. Routing & Guard Architecture
   The routing system in App.tsx is structured as a nested tree where routes are filtered through multiple layers of guards.

Layout Zones
The application is divided into three primary layout zones, each providing specific navigation and sidebars:

StudentLayout: Accessible to users with the STUDENT role. Includes the Student Dashboard, Transfer, and Store
frontend/src/App.tsx
37-41
AdminLayout: Accessible to users with the ADMIN role (Cashiers). Includes Billing, Student Management, and Transactions
frontend/src/App.tsx
46-52
SuperAdminLayout: Accessible to the SaaS owner (SUPERADMIN). Handles global tenant provisioning
frontend/src/App.tsx
57-61
Guard Components
Guard File Responsibility
ProtectedRoute ProtectedRoute.tsx Checks for the presence of a token in useAuthStore. Redirects to /login if missing
frontend/src/components/ProtectedRoute.tsx
8-10
RoleRoute RoleRoute.tsx Validates that the user.role matches the allowedRole prop. Redirects unauthorized users to their respective home zones
frontend/src/components/RoleRoute.tsx
16-20
Diagram: Route Guard Pipeline

Sources:
frontend/src/App.tsx
29-64

frontend/src/components/ProtectedRoute.tsx
4-15

frontend/src/components/RoleRoute.tsx
8-23

3. API Interceptors & Multi-Tenancy
   The api.ts file configures a centralized Axios instance that handles the injection of security headers and global error handling.

Request Interceptor (Outbound)
Every request automatically attaches two critical headers:

X-Tenant-ID: Injected from the VITE_TENANT_ID environment variable to identify the university context
frontend/src/services/api.ts
17-20
Authorization: Injected as a Bearer token retrieved directly from localStorage
frontend/src/services/api.ts
23-26
Response Interceptor (Inbound)
The interceptor handles two main failure scenarios:

401 Unauthorized: If the backend rejects a token (expired or invalid), the interceptor calls useAuthStore.getState().logout() and forces a redirect to /login
frontend/src/services/api.ts
40-45
Global Error UI: For other errors (400, 403, 500), it uses the sileo notification system to display the serverMessage returned by the Go backend
frontend/src/services/api.ts
52-65
Diagram: API Communication Lifecycle

Sources:
frontend/src/services/api.ts
14-77

frontend/src/services/store.ts
18-22

4. Key Implementation Summary
   Function/Component Location Purpose
   useAuthStore authStore.ts Centralized state for JWT and user claims
   frontend/src/store/authStore.ts
   30
   ProtectedRoute ProtectedRoute.tsx Top-level gatekeeper for authenticated routes
   frontend/src/components/ProtectedRoute.tsx
   4
   RoleRoute RoleRoute.tsx Granular RBAC for specific layout zones
   frontend/src/components/RoleRoute.tsx
   8
   api api.ts Axios instance with multi-tenant header injection
   frontend/src/services/api.ts
   6
   Login Login.tsx Handles credential submission and initial token storage
   frontend/src/pages/auth/Login.tsx
   43-67
   Sources:
   frontend/src/App.tsx
   33-63

frontend/src/services/api.ts
1-78

frontend/src/store/authStore.ts
1-50

## Student Portal — Dashboard, Transfer & Store

Student Portal — Dashboard, Transfer & Store
Relevant source files
frontend/src/pages/student/Dashboard.tsx
frontend/src/pages/student/Store.tsx
frontend/src/pages/student/Transfer.tsx
frontend/src/services/api.ts
frontend/src/services/billing.ts
frontend/src/services/payment.ts
frontend/src/services/wallet.ts
frontend/src/types/billing.ts
frontend/src/types/wallet.ts
frontend/src/validations/transfer.ts
This page documents the student-facing features of the EduPay SaaS platform. These modules allow students to manage their financial status, settle institutional debts, perform Peer-to-Peer (P2P) transfers, and purchase academic certificates.

Financial Dashboard
The Dashboard.tsx component serves as the central hub for students. It utilizes parallel data fetching and paginated state management to provide a real-time view of the user's wallet and outstanding obligations.

Data Orchestration
Upon mounting or page change, the dashboard executes fetchDashboardData
frontend/src/pages/student/Dashboard.tsx
43-64
This function uses Promise.all to concurrently fetch:

Wallet State: Current balance and paginated transaction history via getWalletDashboard
frontend/src/services/wallet.ts
52-60
Installments: List of debts assigned to the student via getMyInstallments
frontend/src/services/billing.ts
54-59
Debt Payment Flow
Students can pay pending installments directly using their wallet balance. The frontend validates that wallet.current_balance >= amount
frontend/src/pages/student/Dashboard.tsx
86-92
before calling payInstallment
frontend/src/services/billing.ts
62-69

Top-up Integration (MercadoPago)
The dashboard includes a "Recarga rápida" (Quick Top-up) feature. It calls createPaymentPreference
frontend/src/services/payment.ts
3-8
which communicates with the backend to generate a MercadoPago checkout URL. The user is then redirected via window.location.href
frontend/src/pages/student/Dashboard.tsx
121

Receipt Management
Paid installments allow for PDF receipt downloads. The billingService.downloadReceipt function
frontend/src/services/billing.ts
75-103
fetches the binary data from /billing/installments/:id/receipt with responseType: "blob", creates a temporary browser URL, and triggers a programmatic click to download the file.

Sources:

frontend/src/pages/student/Dashboard.tsx
43-125
frontend/src/services/wallet.ts
52-60
frontend/src/services/billing.ts
54-103
frontend/src/services/payment.ts
3-8
Peer-to-Peer (P2P) Transfers
The Transfer.tsx page provides a form for students to send funds to other students within the same tenant using only their email address.

Validation Logic
The form uses react-hook-form integrated with a Zod schema defined in transferSchema
frontend/src/validations/transfer.ts
3-15

to_email: Must be a valid email format and non-empty.
amount: Must be an integer, minimum $1 COP.
Execution
On valid submission, sendTransfer
frontend/src/services/wallet.ts
62-67
sends a POST request to /wallets/transfer. The backend handles the atomic ledger entries (TRANSFER_OUT for sender, TRANSFER_IN for recipient).

Student Transfer Flow
Title: Student P2P Transfer Process

Sources:

frontend/src/pages/student/Transfer.tsx
13-46
frontend/src/validations/transfer.ts
3-17
frontend/src/services/wallet.ts
62-67
Certificate Store
The Store.tsx page implements a catalog of academic services (e.g., "Certificado de Estudio", "Derechos de Grado").

Catalog Definition
The catalog is defined as a static array CATALOG
frontend/src/pages/student/Store.tsx
6-31
mirroring the backend's O(1) map. Each item contains an id, name, and price.

Async Purchase Flow
The purchase process follows a non-blocking pattern:

Request: storeService.buyCertificate(itemId)
frontend/src/pages/student/Store.tsx
41
is called.
Immediate Response: The backend validates the balance and returns a 200 OK almost instantly if the transaction is recorded.
Async Processing: While the UI shows success, the backend initiates a goroutine to generate the PDF and send it via the mailer service.
Store Code-to-System Mapping
Title: Store Purchase Implementation Mapping

Sources:

frontend/src/pages/student/Store.tsx
6-51
frontend/src/services/api.ts
14-33
Service Modules Reference
Wallet Service (wallet.ts)
Handles all ledger-related interactions.

getWalletDashboard(page, limit): Returns WalletDashboardResponse containing current_balance and a PaginatedResponse<TransactionDTO>
frontend/src/services/wallet.ts
52-60
sendTransfer(data): Executes P2P transfers
frontend/src/services/wallet.ts
62-67
Billing Service (billing.ts)
Manages debt and receipts.

getMyInstallments(): Retrieves installments for the authenticated user
frontend/src/services/billing.ts
54-59
payInstallment(id): Triggers the backend payment logic that settles debt using wallet balance
frontend/src/services/billing.ts
62-69
downloadReceipt(id): Handles the binary stream and browser-side file triggers
frontend/src/services/billing.ts
75-103
API Interceptors (api.ts)
The api instance
frontend/src/services/api.ts
6-11
ensures every request from the Student Portal is properly contextualized:

Request Interceptor: Automatically injects the X-Tenant-ID from environment variables and the Authorization: Bearer <token> from the Zustand authStore
frontend/src/services/api.ts
14-33
Response Interceptor: Intercepts 401 Unauthorized errors to trigger a global logout() and redirect to /login
frontend/src/services/api.ts
40-49
Sources:

frontend/src/services/wallet.ts
1-101
frontend/src/services/billing.ts
1-104
frontend/src/services/api.ts
1-78
frontend/src/types/billing.ts
22-33

## Admin Portal — Dashboard, Billing, Students & Transactions

Admin Portal — Dashboard, Billing, Students & Transactions
Relevant source files
frontend/src/components/billing/InstallmentForm.tsx
frontend/src/components/billing/StudentCard.tsx
frontend/src/components/billing/StudentSearch.tsx
frontend/src/components/layouts/AdminLayout.tsx
frontend/src/hooks/useCreateBilling.ts
frontend/src/hooks/useStudentSearch.ts
frontend/src/pages/admin/Billing.tsx
frontend/src/pages/admin/Dashboard.tsx
frontend/src/pages/admin/DebtsList.tsx
frontend/src/pages/admin/Students.tsx
frontend/src/pages/admin/Transactions.tsx
frontend/src/services/billing.ts
frontend/src/types/billing.ts
vercel_performance_report.md
The Admin Portal (referred to in the codebase as the Cajero role) provides the administrative interface for managing a tenant's financial operations. This includes monitoring institutional capital, issuing new debts to students, processing manual cash deposits, and auditing global transaction logs.

1. Executive Dashboard (KPIs & Portfolio Health)
   The AdminDashboard.tsx component serves as the landing page for administrators. It provides a real-time summary of the university's financial status by fetching data from the /billing/stats endpoint
   frontend/src/pages/admin/Dashboard.tsx
   44-47

Implementation Details
Data Fetching: Uses getBillingStats from the billing service
frontend/src/services/billing.ts
44-47
inside a useEffect hook
frontend/src/pages/admin/Dashboard.tsx
10-22
KPI Cards: Displays four primary metrics:
total_collected: Total revenue already paid by students
frontend/src/pages/admin/Dashboard.tsx
57-67
total_debt: Outstanding capital yet to be collected
frontend/src/pages/admin/Dashboard.tsx
69-80
overdue_count: Number of installments currently in OVERDUE status
frontend/src/pages/admin/Dashboard.tsx
78
active_students: Total number of users with an initialized wallet
frontend/src/pages/admin/Dashboard.tsx
82-92
Portfolio Health Visualization: Implements a CSS-based stacked bar chart. It calculates collectedPercentage and debtPercentage as derived state
frontend/src/pages/admin/Dashboard.tsx
38-42
to visualize the ratio of paid vs. unpaid debt
frontend/src/pages/admin/Dashboard.tsx
113-122
Sources:
frontend/src/pages/admin/Dashboard.tsx
1-125

frontend/src/types/billing.ts
47-52

frontend/src/services/billing.ts
44-47

2. Billing & Installment Issuance
   The Billing.tsx page facilitates the creation of new financial obligations (installments) for students. It utilizes a two-column layout: student selection on the left and the issuance form on the right.

Workflow & Hooks
Student Search: Uses the useStudentSearch hook to manage the query state and results
frontend/src/pages/admin/Billing.tsx
9-18
This hook calls searchStudents which hits the /billing/students?q= endpoint
frontend/src/services/billing.ts
15-22
Selection: Once a student is selected from the StudentSearch results
frontend/src/components/billing/StudentSearch.tsx
73-74
their data is passed to the InstallmentForm.
Form Submission: The InstallmentForm uses react-hook-form with a zodResolver to validate the concept, amount, and due_date
frontend/src/components/billing/InstallmentForm.tsx
7-15
Creation: The useCreateBilling hook handles the actual API call to /billing/installments
frontend/src/services/billing.ts
25-33
Billing System Entity Mapping
The following diagram maps the UI components to the underlying service functions and data structures.

Title: Billing Workflow Entity Map

Sources:
frontend/src/pages/admin/Billing.tsx
8-65

frontend/src/components/billing/InstallmentForm.tsx
1-48

frontend/src/services/billing.ts
15-33

3. Student Management & Cashier Deposits
   The Students.tsx page acts as a physical "Caja" (Cashier) module. It allows administrators to find a student and manually credit their wallet (e.g., for cash payments made at a physical office).

Key Implementation Features
Validation: A depositSchema ensures that deposits are between $1,000 and $5,000,000 COP
frontend/src/pages/admin/Students.tsx
15-20
State Integrity: The component uses a functional state update setSelectedStudent((prev) => ...) to avoid stale closures when updating the UI balance after a successful depositFunds call
frontend/src/pages/admin/Students.tsx
68-75
Feedback: Uses the sileo utility to display success notifications
frontend/src/pages/admin/Students.tsx
77-82
Sources:
frontend/src/pages/admin/Students.tsx
15-89

vercel_performance_report.md
35-59

4. Master Obligation Table
   DebtsList.tsx provides a read-only master view of every installment issued within the tenant.

Data Source: Calls getAllInstallments
frontend/src/services/billing.ts
36-41
which returns an array of AdminInstallmentDTO.
Status Badges: Maps the status string (PAID, OVERDUE, PENDING) to specific Nord-themed visual indicators
frontend/src/pages/admin/DebtsList.tsx
25-47
Empty States: Handles null responses from the backend by defaulting to an empty array
frontend/src/pages/admin/DebtsList.tsx
14
Sources:
frontend/src/pages/admin/DebtsList.tsx
5-122

frontend/src/types/billing.ts
36-44

5. Global Transaction Audit Log
   The Transactions.tsx page displays a paginated list of every financial movement in the system, providing a full audit trail.

Transaction Lifecycle & Audit
The system tracks various transaction types, which are rendered with distinct badges:

DEPOSIT: Cashier or MercadoPago top-ups
frontend/src/pages/admin/Transactions.tsx
33-38
TRANSFER_IN / TRANSFER_OUT: Peer-to-peer (P2P) transfers
frontend/src/pages/admin/Transactions.tsx
39-45
PAYMENT / PURCHASE: Installment payments or certificate store buys
frontend/src/pages/admin/Transactions.tsx
46-52
Pagination Logic
The page manages its own page state and triggers a re-fetch via useEffect whenever the page changes
frontend/src/pages/admin/Transactions.tsx
26-28
It calculates the total number of pages based on the total_pages field returned by the getGlobalTransactions service
frontend/src/pages/admin/Transactions.tsx
16-18

Title: Transaction Audit Data Flow

Sources:
frontend/src/pages/admin/Transactions.tsx
7-159

frontend/src/services/wallet.ts
1-5

6. Layout & Navigation
   The AdminLayout.tsx defines the structural shell for all admin pages. It includes a sidebar with NavLink elements that target specific admin routes:

/admin: Dashboard
/admin/students: Cashier/Deposits
/admin/billing: Debt Issuance
/admin/debts: Master Obligation Table
/admin/transactions: Audit Log
It also manages the logout flow via the useAuthStore
frontend/src/components/layouts/AdminLayout.tsx
6-11

Sources:
frontend/src/components/layouts/AdminLayout.tsx
14-111

## SuperAdmin Portal - Tenant Provisioning

SuperAdmin Portal — Tenant Provisioning
Relevant source files
backend/internal/tenant/handler.go
frontend/src/components/layouts/SuperAdminLayout.tsx
frontend/src/pages/auth/Login.tsx
frontend/src/pages/superadmin/CreateTenant.tsx
frontend/src/services/tenant.ts
frontend/src/types/tenant.ts
frontend/src/validations/tenant.ts
The SuperAdmin Portal is the administrative entry point for the EduPay SaaS owner. Its primary responsibility is the provisioning of new tenants (universities) into the system. Unlike the Admin or Student portals, which operate within the constraints of Row-Level Security (RLS) for a specific institution, the SuperAdmin zone operates at the global infrastructure level to manage the tenants table.

1. Provisioning Workflow
   The tenant provisioning process involves a specialized frontend form, a validation layer using Zod, and a backend handler that executes outside the standard multi-tenant transaction wrapper to allow global insertions.

Data Flow: Provisioning a New University
The following diagram illustrates the flow from the user interface to the global database layer.

Tenant Creation Flow

Sources:

frontend/src/pages/superadmin/CreateTenant.tsx
1-50
frontend/src/services/tenant.ts
13-26
backend/internal/tenant/handler.go
15-51 2. Frontend Implementation
The SuperAdmin interface is governed by the SuperAdminLayout, which provides a distinct visual style (using Nord-14 green) to differentiate it from the standard Admin (Cajero) portal.

2.1 Form Validation & Schema
The CreateTenant.tsx component utilizes react-hook-form with a zodResolver. The schema ensures that:

Name: Minimum of 3 characters
frontend/src/validations/tenant.ts
4
Domain: Must be a valid format (e.g., ucc.edu.co), containing only lowercase letters, numbers, dots, and hyphens
frontend/src/validations/tenant.ts
5-9
Interest Rate: Coerced to a number between 0 and 1 (0% to 100%)
frontend/src/validations/tenant.ts
10-13
2.2 Bypassing Interceptors
A critical architectural detail is the use of raw axios in tenantService.ts rather than the centralized api.ts instance.

The standard api.ts interceptor automatically injects X-Tenant-ID headers and handles 401 redirects to the login page. Since SuperAdmin actions are performed at the root level and may involve domains not yet active in the local state, tenantService uses a clean Axios instance to avoid "phantom redirects" or header injection errors during the provisioning of the first tenant
frontend/src/services/tenant.ts
14-25

Sources:

frontend/src/validations/tenant.ts
3-16
frontend/src/services/tenant.ts
13-26
frontend/src/components/layouts/SuperAdminLayout.tsx
43-49 3. Backend Implementation: CreateTenantHandler
The backend logic resides in backend/internal/tenant/handler.go. Unlike business modules (Billing, Wallet) that use the tenant.RunInTenantTx helper to enforce RLS, the CreateTenantHandler interacts with the database using the raw \*sqlx.DB connection.

3.1 Implementation Details
Request Binding: Binds incoming JSON to the CreateTenantRequest struct
backend/internal/tenant/handler.go
9-13
Database Insertion: Executes a direct INSERT into the tenants table. This table is at the top of the hierarchy and is not subject to the app.current_tenant session variable
backend/internal/tenant/handler.go
27-36
Error Handling: Specifically catches database errors, such as unique constraint violations on the domain column
backend/internal/tenant/handler.go
37-42
Code Mapping: Frontend to Backend Entities

Sources:

backend/internal/tenant/handler.go
9-13

31-42
frontend/src/services/tenant.ts
20-23 4. Security and Routing
Access to the SuperAdmin portal is restricted through the frontend routing system and the useAuthStore.

Role-Based Redirects: Upon login, the Login.tsx component checks the decoded JWT role. If the role is SUPERADMIN, the user is redirected to /superadmin/create-tenant
frontend/src/pages/auth/Login.tsx
24-25
Layout Guarding: The SuperAdminLayout encapsulates all provisioning routes, ensuring a consistent navigation experience and a global logout mechanism that clears the Zustand store
frontend/src/components/layouts/SuperAdminLayout.tsx
8-11
Feature Implementation
Authentication JWT with role: "SUPERADMIN" claim
API Endpoint POST /admin/tenants
Database Table tenants
RLS Scope Global (Outside RLS)
Sources:

frontend/src/pages/auth/Login.tsx
23-31
frontend/src/components/layouts/SuperAdminLayout.tsx
14-21
frontend/src/store/authStore.ts (referenced in
frontend/src/pages/auth/Login.tsx
13
)
