-- ==========================================
-- TABLA DE CUOTAS / FACTURAS (INSTALLMENTS)
-- ==========================================

CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL CHECK (LENGTH(description) <= 255), -- Ej: "Matrícula Semestre 1", "Cuota 2"
    amount NUMERIC(15,2) NOT NULL,     -- El valor a pagar
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
    due_date DATE NOT NULL,            -- Fecha límite de pago
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON installments (tenant_id);
CREATE INDEX ON installments (user_id);

-- ==========================================
-- SEGURIDAD MULTI-TENANT (RLS) PARA CUOTAS
-- ==========================================

ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_installments ON installments
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);