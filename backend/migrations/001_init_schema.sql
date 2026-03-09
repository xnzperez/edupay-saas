-- 1. Habilitar extensión para generar UUIDs nativos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- CREACIÓN DE TABLAS
-- ==========================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) UNIQUE NOT NULL,
    default_interest_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000, -- Ej: 0.0250 para 2.5%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'STUDENT')),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, email) -- Un estudiante no puede registrarse dos veces en la misma U
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    current_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00, -- NUNCA usar FLOAT para dinero
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet_txs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tx_type VARCHAR(50) NOT NULL CHECK (tx_type IN ('DEPOSIT', 'PURCHASE', 'FEE')),
    amount NUMERIC(15,2) NOT NULL,
    reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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