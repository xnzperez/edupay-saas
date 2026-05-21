# 💳 EduPay SaaS

> Motor financiero B2B multi-tenant para la gestión de carteras, recaudo y auditoría en instituciones educativas.

![Go](https://img.shields.io/badge/go_1.25-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)
![React](https://img.shields.io/badge/react_19-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript_5.9-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/tailwind_4.2-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Azure](https://img.shields.io/badge/azure_container_apps-%230072C6.svg?style=for-the-badge&logo=microsoftazure&logoColor=white)

---

> [!NOTE]  
> **Estado de Despliegue Actual** > El sistema se encuentra operando en producción. El Front-End está aprovisionado en el Edge a través de **Vercel** (SPA optimizada con Vite), mientras que el Back-End transaccional opera bajo contenedores orquestados en **Azure Container Apps**.

> [!WARNING]  
> **Cálculo de Mora (Penalty Amount) & Workers** > La sincronización de obligaciones financieras atrasadas delega su lógica matemática al `Worker` nocturno en Go. El controlador HTTP no calcula moras al vuelo; confía estrictamente en el estado inyectado en la base de datos para garantizar la única fuente de verdad.

> [!CAUTION]  
> **Aislamiento Criptográfico y Multi-Tenancy (RLS)** > Toda la información está segregada a nivel de motor de almacenamiento usando **PostgreSQL Row-Level Security (RLS)**. Cualquier lectura o mutación en la API RESTful requiere la inyección del header `X-Tenant-ID`, validado criptográficamente contra los claims del token JWT de la sesión.

---

## 🚀 Ecosistema y Características Principales

### Core Arquitectónico
- **Multi-Tenancy Real:** Aislamiento lógico inquebrantable mediante `tenant_id` y RLS a nivel de base de datos previendo fugas de información inter-universitaria.
- **Transacciones ACID con Bloqueo de Filas:** Uso de bloqueos `FOR UPDATE` en PostgreSQL mediante el wrapper `database.RunInTenantTx`, mitigando condiciones de carrera (Race Conditions) al cobrar saldos de la billetera.
- **Precisión Monetaria Estricta:** Tipado estricto de columnas financieras como `NUMERIC` en SQL y mapeadas a `float64` en Go, neutralizando anomalías de coma flotante.
- **Generación Asíncrona de PDF:** Emisión de comprobantes y recibos corporativos al vuelo mediante `gofpdf`, despachados sin bloquear el hilo principal (Goroutines) vía Resend API.

### Sistema de Roles (RBAC)
- **Portal Estudiantil (`/student`):** Autogestión de carteras, liquidación de cuotas (`installments`), transferencias P2P interbancarias y acceso a micro-servicios (`Store`).
- **Terminal de Caja / Admin (`/admin`):** Dashboard analítico en tiempo real (Recharts), matriculación de estudiantes, inyección de deudas (Billing) y seguimiento de recaudo.
- **Consola SuperAdmin (`/superadmin`):** Provisionamiento topológico de inquilinos (Tenants/Universidades) y telemetría global de la plataforma SaaS.

---

## 🛠️ Stack Tecnológico y Dependencias

| Capa | Tecnología | Dependencias Clave & Propósito |
| :--- | :--- | :--- |
| **Backend API** | Go v1.25.1 | `gofiber/fiber/v2` (Enrutamiento submilisegundo), `sqlx` (ORM ligero), `golang-jwt/jwt/v5` (Auth), `resend-go` (Email). |
| **Frontend UI** | React 19 + TypeScript | `vite` v7 (Bundler), `zustand` v5 (Manejo de estado global fluido y ligero), `react-router` v7 (Navegación protegida). |
| **Validación UI** | React Hook Form + Zod | `zod` v4 (Esquemas de validación estricta interconectada al estado del formulario). |
| **Estilizado** | Tailwind CSS v4.2.1 | Motor de estilos de utilidad utilitaria, UI atómica y layouts oscuros/claros adaptables (`ThemeToggle`). |
| **Data Layer** | PostgreSQL v15+ | Almacenamiento transaccional RDBMS con políticas estrictas de control de acceso por fila (RLS). |

---

## 🏗️ Arquitectura de Directorios

La estructura sigue principios de *Domain-Driven Design (DDD)* en el backend y *Feature-Sliced Design (FSD)* en el frontend.

<details>
<summary><b>📂 Ver Árbol del Backend (Go)</b></summary>

```text
backend/
├── cmd/
│   ├── api/main.go            # Entrypoint REST Server (Fiber)
│   └── worker/main.go         # Demonio aislado para cálculo de penalizaciones
├── docs/                      # Especificación OpenAPI/Swagger (swaggo)
├── internal/
│   ├── auth/                  # Lógica JWT, RBAC y Middlewares de seguridad
│   ├── billing/               # Core financiero (Installments, Handler, Reportes PDF)
│   ├── contacts/              # Gestión de agendas y entidades
│   ├── mailer/                # Adaptador de infraestructura para Resend API
│   ├── payment/               # Orquestador de pasarelas y Webhooks (Mercado Pago)
│   ├── store/                 # Lógica de micro-tienda universitaria
│   ├── tenant/                # Contextualización de la Universidad (Multi-Tenancy)
│   ├── user/                  # Controladores segregados (Admin vs Student)
│   ├── utils/                 # Helpers genéricos (Paginación, validadores)
│   └── wallet/                # Motor transaccional de saldos y ledger histórico
├── migrations/                # Scripts SQL de evolución de esquema (RLS, Tablas)
└── pkg/
    ├── database/              # Pooling (db.go, tx.go) y Wrapper de Transacciones Tenant
    └── errors/                # Manejo centralizado de excepciones HTTP
```
</details>

<details>
<summary><b>📂 Ver Árbol del Frontend (React/Vite)</b></summary>

```text
frontend/
├── public/                    # Assets estáticos (Vectores, Data Center backgrounds)
└── src/
    ├── assets/                # Recursos dinámicos UI
    ├── components/            # UI Atómica y compartida
    │   ├── billing/           # (InstallmentForm, StudentCard, StudentSearch)
    │   ├── layouts/           # Envolturas por Rol (AdminLayout, StudentLayout...)
    │   └── ...                # Guardias de ruta (ProtectedRoute, RoleRoute)
    ├── features/              # Dominio de negocio encapsulado
    ├── hooks/                 # Abstracciones lógicas y mutaciones (useStudentSearch)
    ├── pages/                 # Entrypoints de vistas
    │   ├── admin/             # (Dashboard, DebtsList, Transactions)
    │   ├── auth/              # (Login)
    │   ├── student/           # (Dashboard, Store, Transfer)
    │   └── superadmin/        # (GlobalDashboard, TenantsList, CreateTenant)
    ├── router/                # Árbol de navegación y control de acceso (AppRouter)
    ├── services/              # Cliente HTTP Axios modularizado (api.ts, billing.ts...)
    ├── store/                 # Estado global persistente Zustand (authStore, themeStore)
    ├── types/                 # Interfaces TypeScript globales (auth, billing, wallet)
    └── validations/           # Esquemas Zod para integridad de datos en cliente
```
</details>

---

## ⚙️ Guía de Inicio Rápido (Local Setup)

### 1. Variables de Entorno
Clona los archivos de ejemplo en ambas carpetas y configura tus credenciales locales.

**Backend (`backend/.env`):**
```env
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/edupay?sslmode=disable
JWT_SECRET=tu_secreto_criptografico_aqui
RESEND_API_KEY=re_123456789...
APP_ENV=development
MP_ACCESS_TOKEN=TEST-... # Token de pruebas Mercado Pago
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:3000/api
```

### 2. Aprovisionamiento y Despliegue Local

Asegúrate de contar con `pnpm`, `go 1.25+` y `docker` instalados en tu máquina.

```bash
# 1. Levantar el cluster de Base de Datos PostgreSQL
docker-compose up -d

# 2. Compilación y Arranque del Motor Go (Backend)
cd backend
go mod tidy
go run cmd/api/main.go

# 3. Instalación de dependencias y Arranque (Frontend)
# Utilizamos pnpm para resolución estricta y symlinking eficiente
cd ../frontend
pnpm install
pnpm run dev
```