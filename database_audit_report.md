# Reporte de Auditoría de Base de Datos PostgreSQL: EduPay SaaS

**Rol:** Senior Database Architect
**Referencia:** Skill `postgresql-table-design`
**Fecha:** 2026-05-02

He realizado una auditoría estricta de tu esquema de base de datos actual (`backend/migrations/001_init_schema.sql` y `backend/migrations/002_billing_schema.sql`). A continuación se detallan las deficiencias detectadas frente a las mejores prácticas de PostgreSQL y el refactor propuesto.

---

## 1. Deficiencias Encontradas (Strict Focus)

### 1.1. Indexación de FKs y Multi-tenancy
**Regla:** *PostgreSQL does not auto-index FK columns. Add them. Create indexes for access paths you actually query.*
- **Problema:** Ninguna de las llaves foráneas en tus tablas tiene un índice explícito (a excepción de `user_id` en `wallets`, que al tener una restricción `UNIQUE`, genera un índice B-tree automático). 
- **Impacto:** Las uniones (JOINs) y las consultas filtradas por `tenant_id` o `user_id` terminarán realizando "Sequential Scans" (escaneos completos de tabla), lo que degradará masivamente el rendimiento conforme el SaaS crezca. Además, los deletes en cascada se volverán extremadamente lentos.
- **Solución:** Agregar sentencias `CREATE INDEX ON tabla (columna_fk)` para todos los campos `tenant_id`, `user_id` y `wallet_id`.

### 1.2. Estrictez de Tipos de Datos (Data Types Strictness)
**Reglas:** *Prefer `TIMESTAMPTZ` for event time. Prefer `TEXT`; if length limits needed, use `CHECK (LENGTH(col) <= n)` instead of `VARCHAR(n)`. Add `NOT NULL` everywhere it's semantically required.*
- **Fechas:** Estás utilizando `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`. Si bien funciona, la sintaxis moderna y recomendada en Postgres es el alias `TIMESTAMPTZ` y utilizar `now()`. Además, hace falta la restricción `NOT NULL` en las fechas de creación.
- **Cadenas de texto:** Estás usando `VARCHAR(n)`. En PostgreSQL, `VARCHAR(n)` y `TEXT` usan el mismo motor bajo el capó, pero `VARCHAR(n)` requiere comprobaciones de longitud que pueden complicar la evolución del esquema. La mejor práctica es usar `TEXT` y, si la longitud es un requerimiento de negocio, usar `CHECK (LENGTH(col) <= n)`.
- **Estados/Enums:** Para `status`, `tx_type` y `role`, usas `VARCHAR + CHECK`. Es más idiomático usar `TEXT + CHECK`.

### 1.3. Llaves Primarias Modernas (Modern Primary Keys)
**Regla:** *Prefer `BIGINT GENERATED ALWAYS AS IDENTITY` over `UUID` for surrogate keys unless global uniqueness/opacity is strictly required.*
- **Problema:** Estás usando `UUID` generado automáticamente para *todas* las llaves primarias (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`).
- **Impacto:** Los `UUID` son pseudo-aleatorios y masivos (16 bytes). Causan fragmentación en los índices B-tree y reducen la eficiencia del caché ("cache hit ratio") en tablas transaccionales de alto volumen como `wallet_txs` o `installments`.
- **Solución:** Migrar a `BIGINT GENERATED ALWAYS AS IDENTITY`. Es de 8 bytes, secuencial, amigable con B-trees, e `IDENTITY` evita los problemas del antiguo tipo `SERIAL` (el cual es no estándar y ata el ciclo de vida a una secuencia subyacente de forma laxa). Conserva los `UUID` *únicamente* si estos IDs se exponen en rutas públicas sin autenticación o en sistemas federados (aunque en este SaaS multi-tenant, el RLS ya protege la visibilidad).

---

## 2. Refactorización de Esquema (Current vs. Corrected)

> [!TIP]
> **Recomendación General:** Para todas las tablas a continuación, se ha cambiado la llave primaria a `BIGINT GENERATED ALWAYS AS IDENTITY`, se reemplazó `VARCHAR(n)` por `TEXT` (con `CHECK` de longitud cuando es apropiado), y se añadieron los índices faltantes explícitos.

### Tabla: `tenants`

**SQL Actual:**
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) UNIQUE NOT NULL,
    default_interest_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**SQL Corregido:**
```sql
CREATE TABLE tenants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL CHECK (LENGTH(name) <= 255),
    domain TEXT UNIQUE NOT NULL CHECK (LENGTH(domain) <= 100),
    default_interest_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Tabla: `users`

**SQL Actual:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'STUDENT')),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, email)
);
```

**SQL Corregido:**
```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STUDENT')),
    email TEXT NOT NULL CHECK (LENGTH(email) <= 255),
    full_name TEXT NOT NULL CHECK (LENGTH(full_name) <= 255),
    password_hash TEXT NOT NULL CHECK (LENGTH(password_hash) <= 255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

-- Indización explícita faltante para la FK y búsquedas multi-tenant
CREATE INDEX ON users (tenant_id);
```

### Tabla: `wallets`

**SQL Actual:**
```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    current_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**SQL Corregido:**
```sql
CREATE TABLE wallets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    current_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_id ya tiene un B-tree implícito por ser UNIQUE.
-- Falta el índice para el filtrado multi-tenant:
CREATE INDEX ON wallets (tenant_id);
```

### Tabla: `wallet_txs`

**SQL Actual:**
```sql
CREATE TABLE wallet_txs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tx_type VARCHAR(50) NOT NULL CHECK (tx_type IN ('DEPOSIT', 'PURCHASE', 'FEE')),
    amount NUMERIC(15,2) NOT NULL,
    reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**SQL Corregido:**
```sql
CREATE TABLE wallet_txs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tx_type TEXT NOT NULL CHECK (tx_type IN ('DEPOSIT', 'PURCHASE', 'FEE')),
    amount NUMERIC(15,2) NOT NULL,
    reference TEXT CHECK (LENGTH(reference) <= 255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indización explícita faltante para FKs y consultas multi-tenant
CREATE INDEX ON wallet_txs (wallet_id);
CREATE INDEX ON wallet_txs (tenant_id);
-- Recomendado: Indizar created_at para ordenamiento de históricos rápidos en el frontend
CREATE INDEX ON wallet_txs (created_at); 
```

### Tabla: `installments`

**SQL Actual:**
```sql
CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**SQL Corregido:**
```sql
CREATE TABLE installments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL CHECK (LENGTH(description) <= 255),
    amount NUMERIC(15,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indización explícita faltante
CREATE INDEX ON installments (tenant_id);
CREATE INDEX ON installments (user_id);
```

> [!WARNING]
> Si decides adoptar `BIGINT`, recuerda que **todas las políticas RLS** (Row-Level Security) en tus migraciones actuales usan casteos de sesión (`::uuid`). Deberás actualizarlas a `::bigint`. Por ejemplo:
> `USING (tenant_id = current_setting('app.current_tenant', true)::bigint);`
> También, tu código de backend en Go (estructuras y enrutadores) requerirá actualizar el tipo `uuid.UUID` a `int64`.
