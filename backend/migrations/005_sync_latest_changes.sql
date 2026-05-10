-- ==========================================
-- MIGRATION 005: Sync Latest Changes
-- Sincronización del estado de los archivos locales con el contenedor real
-- ==========================================

-- 1. Nuevas columnas
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Modificación de tipos de datos (TEXT -> VARCHAR)
ALTER TABLE tenants 
    ALTER COLUMN name TYPE VARCHAR(255),
    ALTER COLUMN domain TYPE VARCHAR(100);

ALTER TABLE users 
    ALTER COLUMN role TYPE VARCHAR(50),
    ALTER COLUMN email TYPE VARCHAR(255),
    ALTER COLUMN full_name TYPE VARCHAR(255),
    ALTER COLUMN password_hash TYPE VARCHAR(255);

ALTER TABLE installments 
    ALTER COLUMN description TYPE VARCHAR(255),
    ALTER COLUMN status TYPE VARCHAR(50);

ALTER TABLE wallet_txs 
    ALTER COLUMN tx_type TYPE VARCHAR(50),
    ALTER COLUMN reference TYPE VARCHAR(255);

-- Limpieza de constraints de longitud obsoletos (debido al cambio a VARCHAR)
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_name_check;
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_domain_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_full_name_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_password_hash_check;
ALTER TABLE installments DROP CONSTRAINT IF EXISTS installments_description_check;
ALTER TABLE wallet_txs DROP CONSTRAINT IF EXISTS wallet_txs_reference_check;

-- 3. Modificación del constraint users_role_check para admitir 'SUPERADMIN'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('STUDENT', 'ADMIN', 'SUPERADMIN'));

-- 4. Creación de la tabla nueva: saved_contacts
CREATE TABLE IF NOT EXISTS saved_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_email VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_owner_contact UNIQUE (owner_id, contact_email)
);

-- 5. Seguridad de nivel de fila (RLS) para saved_contacts
ALTER TABLE saved_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can only access their own contacts" 
    ON saved_contacts 
    USING (owner_id = (current_setting('request.jwt.claim.sub', true))::uuid);
