-- ============================================================================
-- FeeAutomate — Complete PostgreSQL Database Schema
-- ============================================================================
--
-- Multi-tenant SaaS for automated fee collection.
-- Architecture: schema-per-tenant isolation.
--
--   public          → Platform-wide tables (tenants, billing, audit)
--   tenant_<code>   → Per-tenant data (users, members, plans, invoices, …)
--
-- Execution order:
--   1. Extensions
--   2. Public schema tables
--   3. Public schema indexes
--   4. Tenant schema function (creates all per-tenant tables)
--   5. Audit log trigger function
--
-- Compatible with: PostgreSQL 15+
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- Case-insensitive text for email columns
CREATE EXTENSION IF NOT EXISTS citext;

-- Cryptographic UUID generation (built-in from PG 13+, explicit for clarity)
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================================
-- 2. PUBLIC SCHEMA — PLATFORM TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 tenants
--
-- One row per organisation using FeeAutomate.
-- The schema_name column links to the dedicated PostgreSQL schema that holds
-- all of that tenant's data (users, members, plans, invoices, etc.).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_code     TEXT        NOT NULL UNIQUE,
    name            TEXT        NOT NULL,
    schema_name     TEXT        NOT NULL UNIQUE,
    contact_email   CITEXT,
    billing_email   CITEXT,
    status          TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.tenants IS 'Platform tenant registry — one row per organisation.';
COMMENT ON COLUMN public.tenants.tenant_code  IS 'URL-safe identifier (lowercase alphanumeric + underscore). Used in subdomains and x-tenant-id header.';
COMMENT ON COLUMN public.tenants.schema_name  IS 'PostgreSQL schema name: tenant_<tenant_code>. Contains all tenant-specific tables.';
COMMENT ON COLUMN public.tenants.contact_email IS 'Primary contact email for the tenant admin.';
COMMENT ON COLUMN public.tenants.billing_email IS 'Email for FeeAutomate platform billing (invoices for the SaaS subscription).';

-- Lookups: find active tenants by code (login, middleware), by id (JWT validation), list active (cron jobs)
CREATE INDEX IF NOT EXISTS idx_tenants_tenant_code  ON public.tenants (tenant_code);
CREATE INDEX IF NOT EXISTS idx_tenants_status        ON public.tenants (status);

-- ----------------------------------------------------------------------------
-- 2.2 platform_plans
--
-- FeeAutomate's own SaaS pricing tiers (Starter, Growth, Pro, Enterprise).
-- These are NOT the plans that tenants create for their members — those live
-- in each tenant schema's `plans` table.
--
-- Each tier × billing_cycle combination is one row.
-- Razorpay Plan objects are immutable once created, so we store their ID here.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_plans (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tier                    TEXT        NOT NULL CHECK (tier IN ('starter', 'growth', 'pro', 'enterprise')),
    billing_cycle           TEXT        NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    name                    TEXT        NOT NULL,
    description             TEXT,
    amount_cents            BIGINT      NOT NULL CHECK (amount_cents >= 0),
    razorpay_plan_id        TEXT,
    member_limit            INT         NOT NULL,
    invoice_limit_monthly   INT         NOT NULL,
    admin_limit             INT         NOT NULL,
    email_limit_monthly     INT         NOT NULL,
    features                JSONB       NOT NULL DEFAULT '{}'::jsonb,
    status                  TEXT        NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active', 'inactive')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (tier, billing_cycle)
);

COMMENT ON TABLE  public.platform_plans IS 'FeeAutomate SaaS pricing tiers. Each tier+cycle is a row linked to a Razorpay Plan object.';
COMMENT ON COLUMN public.platform_plans.amount_cents IS 'Price in paise (INR cents). E.g. 99900 = ₹999.';
COMMENT ON COLUMN public.platform_plans.razorpay_plan_id IS 'Razorpay Plan ID (plan_xxxxx). Null for free tier and custom enterprise.';
COMMENT ON COLUMN public.platform_plans.features IS 'JSON object of boolean/string feature flags for this tier.';

-- ----------------------------------------------------------------------------
-- 2.3 tenant_subscriptions
--
-- Tracks which platform_plan each tenant is on, their Razorpay subscription
-- state, trial dates, and active add-ons.
--
-- One active subscription per tenant (enforced by UNIQUE on tenant_id).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    platform_plan_id            UUID        NOT NULL REFERENCES public.platform_plans(id),
    razorpay_subscription_id    TEXT,
    status                      TEXT        NOT NULL DEFAULT 'trialing'
                                            CHECK (status IN ('trialing', 'active', 'pending', 'halted', 'cancelled', 'expired')),
    current_period_start        TIMESTAMPTZ,
    current_period_end          TIMESTAMPTZ,
    trial_ends_at               TIMESTAMPTZ,
    cancelled_at                TIMESTAMPTZ,
    add_ons                     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (tenant_id)
);

COMMENT ON TABLE  public.tenant_subscriptions IS 'Each tenant''s active FeeAutomate subscription. Maps to a Razorpay recurring subscription.';
COMMENT ON COLUMN public.tenant_subscriptions.status IS 'Mirrors Razorpay subscription lifecycle: trialing → active → pending/halted/cancelled/expired.';
COMMENT ON COLUMN public.tenant_subscriptions.add_ons IS 'JSON array of {addOnId, quantity, razorpayItemId} objects.';

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON public.tenant_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status    ON public.tenant_subscriptions (status);

-- ----------------------------------------------------------------------------
-- 2.4 platform_invoices
--
-- FeeAutomate's invoices to tenants for their SaaS subscription.
-- Separate from the invoices tenants generate for their own members.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_invoices (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tenant_subscription_id  UUID        REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
    amount_cents            BIGINT      NOT NULL CHECK (amount_cents >= 0),
    status                  TEXT        NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    razorpay_payment_id     TEXT,
    razorpay_invoice_id     TEXT,
    billing_period_start    TIMESTAMPTZ,
    billing_period_end      TIMESTAMPTZ,
    paid_at                 TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_invoices IS 'Invoices FeeAutomate sends to tenants for their SaaS subscription payments.';

CREATE INDEX IF NOT EXISTS idx_platform_invoices_tenant_id ON public.platform_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_status    ON public.platform_invoices (status);

-- ----------------------------------------------------------------------------
-- 2.5 platform_audit_logs
--
-- Immutable append-only log of significant platform-level events.
-- Useful for debugging, compliance, and security review.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        REFERENCES public.tenants(id) ON DELETE SET NULL,
    actor_id    UUID,
    actor_role  TEXT,
    action      TEXT        NOT NULL,
    resource    TEXT        NOT NULL,
    resource_id TEXT,
    details     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.platform_audit_logs IS 'Append-only audit trail for platform-level actions (tenant registration, plan changes, billing events).';
COMMENT ON COLUMN public.platform_audit_logs.action IS 'Action verb: tenant.registered, subscription.upgraded, subscription.cancelled, payment.captured, etc.';
COMMENT ON COLUMN public.platform_audit_logs.resource IS 'Resource type: tenant, subscription, payment, etc.';

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_tenant_id  ON public.platform_audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_action     ON public.platform_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created_at ON public.platform_audit_logs (created_at DESC);


-- ============================================================================
-- 3. TENANT SCHEMA PROVISIONING FUNCTION
-- ============================================================================
--
-- Called during tenant registration (AuthService.registerTenant).
-- Creates all per-tenant tables, constraints, indexes, and triggers inside
-- a dedicated PostgreSQL schema named tenant_<code>.
--
-- Usage:  SELECT public.provision_tenant_schema('tenant_mygym');
-- ============================================================================

CREATE OR REPLACE FUNCTION public.provision_tenant_schema(schema_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN

    -- Create the schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

    -- --------------------------------------------------------------------------
    -- 3.1 users
    --
    -- Login accounts for this tenant (admins and members).
    -- Passwords are bcrypt-hashed. Role determines portal access.
    -- --------------------------------------------------------------------------
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.users (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            email           CITEXT      NOT NULL UNIQUE,
            full_name       TEXT        NOT NULL,
            password_hash   TEXT        NOT NULL,
            role            TEXT        NOT NULL CHECK (role IN (''Admin'', ''Member'')),
            is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_users_email
        ON %I.users (email)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_users_role
        ON %I.users (role)
    ', schema_name);

    -- --------------------------------------------------------------------------
    -- 3.2 members
    --
    -- People who receive services and are billed (gym members, hostel residents,
    -- students, subscribers). NOT the same as users — members may or may not
    -- have login accounts.
    -- --------------------------------------------------------------------------
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.members (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name   TEXT        NOT NULL,
            email       CITEXT      NOT NULL UNIQUE,
            phone       TEXT,
            address     TEXT,
            status      TEXT        NOT NULL CHECK (status IN (''active'', ''inactive'')),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_members_status
        ON %I.members (status)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_members_email
        ON %I.members (email)
    ', schema_name);

    -- --------------------------------------------------------------------------
    -- 3.3 plans
    --
    -- Billing plans that the tenant offers to their members.
    -- E.g., "Monthly Gym Membership ₹999" or "Yearly Hostel Fee ₹60,000".
    -- --------------------------------------------------------------------------
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.plans (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            name            TEXT        NOT NULL,
            description     TEXT,
            amount_cents    BIGINT      NOT NULL CHECK (amount_cents >= 0),
            billing_cycle   TEXT        NOT NULL CHECK (billing_cycle IN (''monthly'', ''yearly'')),
            status          TEXT        NOT NULL CHECK (status IN (''active'', ''inactive'')),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_plans_status
        ON %I.plans (status)
    ', schema_name);

    -- --------------------------------------------------------------------------
    -- 3.4 subscriptions
    --
    -- Links a member to a plan for a period of time.
    -- The cron job generates invoices from active subscriptions monthly.
    -- --------------------------------------------------------------------------
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.subscriptions (
            id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
            member_id   UUID    NOT NULL REFERENCES %I.members(id) ON DELETE CASCADE,
            plan_id     UUID    NOT NULL REFERENCES %I.plans(id),
            status      TEXT    NOT NULL CHECK (status IN (''active'', ''pending'', ''expired'', ''canceled'')),
            start_date  DATE    NOT NULL,
            end_date    DATE,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    ', schema_name, schema_name, schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id
        ON %I.subscriptions (member_id)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id
        ON %I.subscriptions (plan_id)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_subscriptions_status
        ON %I.subscriptions (status)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date
        ON %I.subscriptions (end_date)
        WHERE status = ''active''
    ', schema_name);

    -- --------------------------------------------------------------------------
    -- 3.5 invoices
    --
    -- Bills issued to members. Created manually by admins or automatically
    -- by the monthly invoice generation cron job.
    --
    -- invoice_number is unique per tenant (not globally) via the UNIQUE
    -- constraint inside the tenant schema.
    -- --------------------------------------------------------------------------
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.invoices (
            id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            member_id           UUID        NOT NULL REFERENCES %I.members(id) ON DELETE CASCADE,
            subscription_id     UUID        REFERENCES %I.subscriptions(id) ON DELETE SET NULL,
            invoice_number      TEXT        NOT NULL UNIQUE,
            amount_cents        BIGINT      NOT NULL CHECK (amount_cents >= 0),
            due_date            DATE        NOT NULL,
            status              TEXT        NOT NULL CHECK (status IN (''pending'', ''paid'', ''overdue'')),
            issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
            paid_at             TIMESTAMPTZ,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    ', schema_name, schema_name, schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_invoices_member_id
        ON %I.invoices (member_id)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id
        ON %I.invoices (subscription_id)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date
        ON %I.invoices (status, due_date)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_invoices_created_at
        ON %I.invoices (created_at DESC)
    ', schema_name);

    -- --------------------------------------------------------------------------
    -- 3.6 payments
    --
    -- Payment records against invoices. Can be manual (cash, bank transfer)
    -- or via Razorpay (order/payment-link → webhook captures).
    --
    -- metadata stores gateway-specific data:
    --   - gateway, orderId, razorpayPaymentId (from Razorpay)
    --   - receiptGeneratedAt, receiptNumber (from receipt cron job)
    -- --------------------------------------------------------------------------
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.payments (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id      UUID        NOT NULL REFERENCES %I.invoices(id) ON DELETE CASCADE,
            amount_cents    BIGINT      NOT NULL CHECK (amount_cents >= 0),
            method          TEXT,
            status          TEXT        NOT NULL CHECK (status IN (''pending'', ''paid'', ''failed'')),
            transaction_ref TEXT        UNIQUE,
            metadata        JSONB       NOT NULL DEFAULT ''{}''::jsonb,
            paid_at         TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    ', schema_name, schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
        ON %I.payments (invoice_id)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_payments_status
        ON %I.payments (status)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref
        ON %I.payments (transaction_ref)
        WHERE transaction_ref IS NOT NULL
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_payments_metadata_gin
        ON %I.payments USING GIN (metadata)
    ', schema_name);

    -- --------------------------------------------------------------------------
    -- 3.7 notifications
    --
    -- In-app and email notifications generated by cron jobs:
    --   - payment_reminder_before_due, payment_reminder_on_due, payment_reminder_after_due
    --   - defaulter_detected
    --   - subscription_renewal_reminder
    --
    -- metadata stores context (invoiceId, stage, subscriptionId, daysOverdue, etc.)
    -- --------------------------------------------------------------------------
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.notifications (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            member_id   UUID        REFERENCES %I.members(id) ON DELETE SET NULL,
            type        TEXT        NOT NULL,
            channel     TEXT        NOT NULL DEFAULT ''in_app'',
            message     TEXT        NOT NULL,
            status      TEXT        NOT NULL DEFAULT ''pending''
                                    CHECK (status IN (''pending'', ''sent'', ''failed'')),
            metadata    JSONB       NOT NULL DEFAULT ''{}''::jsonb,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    ', schema_name, schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_notifications_member_id
        ON %I.notifications (member_id)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_notifications_type_status
        ON %I.notifications (type, status)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at
        ON %I.notifications (created_at DESC)
    ', schema_name);

    -- --------------------------------------------------------------------------
    -- 3.8 audit_logs
    --
    -- Per-tenant audit trail for admin actions and system events.
    -- Append-only — no UPDATE or DELETE should be performed on this table.
    -- --------------------------------------------------------------------------
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.audit_logs (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID,
            action      TEXT        NOT NULL,
            resource    TEXT        NOT NULL,
            resource_id UUID,
            old_values  JSONB,
            new_values  JSONB,
            ip_address  INET,
            user_agent  TEXT,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
        ON %I.audit_logs (user_id)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
        ON %I.audit_logs (resource, resource_id)
    ', schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
        ON %I.audit_logs (created_at DESC)
    ', schema_name);

END;
$$;

COMMENT ON FUNCTION public.provision_tenant_schema(TEXT) IS 'Creates a complete tenant schema with all domain tables, indexes, and constraints. Called during tenant registration.';


-- ============================================================================
-- 4. HELPER: updated_at TRIGGER FUNCTION
-- ============================================================================
--
-- Automatically sets updated_at = now() on any UPDATE.
-- Attach to tables that have an updated_at column.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS 'Trigger function: automatically sets updated_at to now() on every UPDATE.';

-- Attach to public schema tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenants_updated_at'
    ) THEN
        CREATE TRIGGER trg_tenants_updated_at
            BEFORE UPDATE ON public.tenants
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_platform_plans_updated_at'
    ) THEN
        CREATE TRIGGER trg_platform_plans_updated_at
            BEFORE UPDATE ON public.platform_plans
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenant_subscriptions_updated_at'
    ) THEN
        CREATE TRIGGER trg_tenant_subscriptions_updated_at
            BEFORE UPDATE ON public.tenant_subscriptions
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$;


COMMIT;
