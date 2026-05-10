--
-- PostgreSQL database dump
--

\restrict OGvkXOUdro7krPGhSLqbYvQRv5nhshAkVO8ZmT2OROjVbI4sHiHndVJOcimeFWT

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: installments; Type: TABLE; Schema: public; Owner: edupay_admin
--

CREATE TABLE public.installments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    description character varying(255) NOT NULL,
    amount numeric(15,2) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    due_date date NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    penalty_amount numeric(15,2) DEFAULT 0.00 NOT NULL,
    CONSTRAINT installments_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PAID'::character varying, 'OVERDUE'::character varying])::text[])))
);

ALTER TABLE ONLY public.installments FORCE ROW LEVEL SECURITY;


ALTER TABLE public.installments OWNER TO edupay_admin;

--
-- Name: saved_contacts; Type: TABLE; Schema: public; Owner: edupay_admin
--

CREATE TABLE public.saved_contacts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    contact_email character varying(255) NOT NULL,
    contact_name character varying(255) NOT NULL,
    is_favorite boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.saved_contacts OWNER TO edupay_admin;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: edupay_admin
--

CREATE TABLE public.tenants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    domain character varying(100) NOT NULL,
    default_interest_rate numeric(5,4) DEFAULT 0.0000 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


ALTER TABLE public.tenants OWNER TO edupay_admin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: edupay_admin
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    role character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['STUDENT'::character varying, 'ADMIN'::character varying, 'SUPERADMIN'::character varying])::text[])))
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;


ALTER TABLE public.users OWNER TO edupay_admin;

--
-- Name: wallet_txs; Type: TABLE; Schema: public; Owner: edupay_admin
--

CREATE TABLE public.wallet_txs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    wallet_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    tx_type character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    reference character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT wallet_txs_tx_type_check CHECK (((tx_type)::text = ANY ((ARRAY['DEPOSIT'::character varying, 'PURCHASE'::character varying, 'FEE'::character varying, 'TRANSFER_OUT'::character varying, 'TRANSFER_IN'::character varying])::text[])))
);

ALTER TABLE ONLY public.wallet_txs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.wallet_txs OWNER TO edupay_admin;

--
-- Name: wallets; Type: TABLE; Schema: public; Owner: edupay_admin
--

CREATE TABLE public.wallets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    current_balance numeric(15,2) DEFAULT 0.00 NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.wallets FORCE ROW LEVEL SECURITY;


ALTER TABLE public.wallets OWNER TO edupay_admin;

--
-- Name: installments installments_pkey; Type: CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.installments
    ADD CONSTRAINT installments_pkey PRIMARY KEY (id);


--
-- Name: saved_contacts saved_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.saved_contacts
    ADD CONSTRAINT saved_contacts_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_domain_key; Type: CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_domain_key UNIQUE (domain);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: saved_contacts uq_owner_contact; Type: CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.saved_contacts
    ADD CONSTRAINT uq_owner_contact UNIQUE (owner_id, contact_email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_tenant_id_email_key; Type: CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: wallet_txs wallet_txs_pkey; Type: CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.wallet_txs
    ADD CONSTRAINT wallet_txs_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);


--
-- Name: installments installments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.installments
    ADD CONSTRAINT installments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: installments installments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.installments
    ADD CONSTRAINT installments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: saved_contacts saved_contacts_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.saved_contacts
    ADD CONSTRAINT saved_contacts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: saved_contacts saved_contacts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.saved_contacts
    ADD CONSTRAINT saved_contacts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: wallet_txs wallet_txs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.wallet_txs
    ADD CONSTRAINT wallet_txs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: wallet_txs wallet_txs_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.wallet_txs
    ADD CONSTRAINT wallet_txs_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edupay_admin
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: saved_contacts Students can only access their own contacts; Type: POLICY; Schema: public; Owner: edupay_admin
--

CREATE POLICY "Students can only access their own contacts" ON public.saved_contacts USING ((owner_id = (current_setting('request.jwt.claim.sub'::text, true))::uuid));


--
-- Name: installments; Type: ROW SECURITY; Schema: public; Owner: edupay_admin
--

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_contacts; Type: ROW SECURITY; Schema: public; Owner: edupay_admin
--

ALTER TABLE public.saved_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: installments tenant_isolation_installments; Type: POLICY; Schema: public; Owner: edupay_admin
--

CREATE POLICY tenant_isolation_installments ON public.installments USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: users tenant_isolation_users; Type: POLICY; Schema: public; Owner: edupay_admin
--

CREATE POLICY tenant_isolation_users ON public.users USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: wallet_txs tenant_isolation_wallet_txs; Type: POLICY; Schema: public; Owner: edupay_admin
--

CREATE POLICY tenant_isolation_wallet_txs ON public.wallet_txs USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: wallets tenant_isolation_wallets; Type: POLICY; Schema: public; Owner: edupay_admin
--

CREATE POLICY tenant_isolation_wallets ON public.wallets USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: edupay_admin
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_txs; Type: ROW SECURITY; Schema: public; Owner: edupay_admin
--

ALTER TABLE public.wallet_txs ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: edupay_admin
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict OGvkXOUdro7krPGhSLqbYvQRv5nhshAkVO8ZmT2OROjVbI4sHiHndVJOcimeFWT

