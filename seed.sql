-- 1. CREACIÓN DE TENANTS (Universidades y la Corp)
INSERT INTO tenants (id, name, domain, is_active)
VALUES ('00000000-0000-4000-8000-000000000000', 'EduPay Master Corp', 'edupay.com', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenants (id, name, domain, is_active)
VALUES ('2c561801-a9e6-49f2-8635-a6f9d7b6fe30', 'Universidad Cooperativa de Colombia', 'ucc.edu.co', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenants (id, name, domain, is_active)
VALUES ('78a843b2-d128-40ed-b56f-62aecbf77037', 'Universidad del Sinú', 'unisinu.edu.co', true)
ON CONFLICT (id) DO NOTHING;

-- 2. CREACIÓN DE SUPERADMINS (Usando WHERE NOT EXISTS para evitar errores de constraints)

-- SuperAdmin Global (Pertenece a EduPay Corp)
INSERT INTO users (tenant_id, email, full_name, password_hash, role, is_active)
SELECT 
    '00000000-0000-4000-8000-000000000000', 
    'master@edupay.com', 
    'Carlos Pérez (CEO)', 
    '$2a$10$8K1p/a6L2B.5Z2S7p3X/u.f5pY8z9L9X8z9L9X8z9L9X8z9L9X8z9', 
    'SUPERADMIN', 
    true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'master@edupay.com');

-- SuperAdmin Local (UCC)
INSERT INTO users (tenant_id, email, full_name, password_hash, role, is_active)
SELECT 
    '2c561801-a9e6-49f2-8635-a6f9d7b6fe30', 
    'admin.ucc@edupay.com', 
    'Rectoría UCC', 
    '$2a$10$8K1p/a6L2B.5Z2S7p3X/u.f5pY8z9L9X8z9L9X8z9L9X8z9L9X8z9', 
    'SUPERADMIN', 
    true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin.ucc@edupay.com');

-- SuperAdmin Local (Unisinú)
INSERT INTO users (tenant_id, email, full_name, password_hash, role, is_active)
SELECT 
    '78a843b2-d128-40ed-b56f-62aecbf77037', 
    'admin.unisinu@edupay.com', 
    'Rectoría Unisinú', 
    '$2a$10$8K1p/a6L2B.5Z2S7p3X/u.f5pY8z9L9X8z9L9X8z9L9X8z9L9X8z9', 
    'SUPERADMIN', 
    true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin.unisinu@edupay.com');