-- ==========================================
-- CREACIÓN DE TABLAS
-- ==========================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (LENGTH(name) <= 255),
    domain TEXT UNIQUE NOT NULL CHECK (LENGTH(domain) <= 100),
    default_interest_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000, -- Ej: 0.0250 para 2.5%
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STUDENT')),
    email TEXT NOT NULL CHECK (LENGTH(email) <= 255),
    full_name TEXT NOT NULL CHECK (LENGTH(full_name) <= 255),
    password_hash TEXT NOT NULL CHECK (LENGTH(password_hash) <= 255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email) -- Un estudiante no puede registrarse dos veces en la misma U
);
CREATE INDEX ON users (tenant_id);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    current_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00, -- NUNCA usar FLOAT para dinero
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON wallets (tenant_id);

CREATE TABLE wallet_txs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tx_type TEXT NOT NULL CHECK (tx_type IN ('DEPOSIT', 'PURCHASE', 'FEE')),
    amount NUMERIC(15,2) NOT NULL,
    reference TEXT CHECK (LENGTH(reference) <= 255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON wallet_txs (wallet_id);
CREATE INDEX ON wallet_txs (tenant_id);
CREATE INDEX ON wallet_txs (created_at);

-- ==========================================
-- ROW-LEVEL SECURITY (RLS) - MULTI-TENANT
-- ==========================================

-- Activamos la seguridad a nivel de fila en las tablas sensibles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_txs ENABLE ROW LEVEL SECURITY;

-- Forzamos a que incluso los administradores de la BD respeten las reglas
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE wallets FORCE ROW LEVEL SECURITY;
ALTER TABLE wallet_txs FORCE ROW LEVEL SECURITY;

-- Creamos las políticas: Solo puedes ver/modificar datos si tu tenant_id coincide con el de la sesión actual
CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_wallets ON wallets
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_wallet_txs ON wallet_txs
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);