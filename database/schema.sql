-- =============================================================================
-- FeeAutomate — Complete PostgreSQL Database Schema
-- =============================================================================
-- Architecture : Multi-tenant, schema-per-tenant
-- PostgreSQL   : 15+
-- Encoding     : UTF-8
--
-- Execution order:
--   1. Extensions
--   2. Public schema — tenants, users (platform-level)
--   3. Public schema — platform billing (platform_plans,
--                      tenant_subscriptions, platform_invoices,
--                      platform_add_ons, tenant_add_on_subscriptions)
--   4. Public schema — audit_logs (platform-level events)
--   5. Tenant schema template (applied to each tenant_<code> schema)
--   6. Indexes
--   7. Functions / triggers (updated_at auto-maintenance)
--   8. Sample seed data
-- =============================================================================

-- =============================================================================
-- 0. PREAMBLE — SAFE DEFAULTS
-- =============================================================================
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

-- citext: case-insensitive text type (used for emails)
CREATE EXTENSION IF NOT EXISTS citext;

-- pgcrypto: gen_random_uuid() on PostgreSQL < 13
-- On PG 13+ gen_random_uuid() is a built-in; this is harmless to keep.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =============================================================================
-- 2. CUSTOM TYPES (PUBLIC SCHEMA)
-- =============================================================================

-- Tenant lifecycle state
DO $$ BEGIN
  CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Portal user roles within a tenant schema
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('Admin', 'Member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Platform subscription tiers
DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('starter', 'growth', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Billing cadence
DO $$ BEGIN
  CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant platform subscription states (follows Razorpay lifecycle)
DO $$ BEGIN
  CREATE TYPE public.tenant_subscription_status AS ENUM (
    'trialing', 'active', 'pending', 'halted', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Platform-level invoice / payment states
DO $$ BEGIN
  CREATE TYPE public.platform_invoice_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant-domain: member status
DO $$ BEGIN
  CREATE TYPE public.member_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant-domain: plan status
DO $$ BEGIN
  CREATE TYPE public.plan_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant-domain: subscription lifecycle
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('active', 'pending', 'expired', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant-domain: invoice lifecycle
DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant-domain: payment result
DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant-domain: notification delivery channel
DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email', 'sms', 'whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant-domain: notification delivery state
DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- 3. PUBLIC SCHEMA — PLATFORM TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 3.1  public.tenants
-- ---------------------------------------------------------------------------
-- Each row represents one business (gym / hostel / coaching centre) that
-- has registered on FeeAutomate.  The tenant_code is the unique slug used
-- to route requests (x-tenant-id header / subdomain) and is also used as
-- the suffix for the tenant's private schema (tenant_<code>).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unique lowercase slug: [a-z0-9_]+
  -- Used as the schema suffix and in JWT context.
  tenant_code      TEXT          NOT NULL UNIQUE,

  -- Display name of the business
  name             TEXT          NOT NULL,

  -- PostgreSQL schema that contains this tenant's domain tables.
  -- Format: tenant_<tenant_code>
  schema_name      TEXT          NOT NULL UNIQUE,

  -- Operational status.  Only 'active' tenants are served requests.
  status           public.tenant_status NOT NULL DEFAULT 'active',

  -- Primary contact / billing contact emails
  contact_email    CITEXT        NOT NULL,
  billing_email    CITEXT        NOT NULL,

  -- Razorpay customer ID for the tenant (used in platform billing)
  razorpay_customer_id TEXT,

  -- Free-form settings / feature flags stored as JSON
  -- e.g. { "timezone": "Asia/Kolkata", "currency": "INR" }
  settings         JSONB         NOT NULL DEFAULT '{}'::jsonb,

  -- Early-adopter flag used for lifetime-discount eligibility
  is_early_adopter BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Referral tracking
  referred_by_tenant_id UUID     REFERENCES public.tenants(id) ON DELETE SET NULL,

  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Enforce slug charset at DB level (belt-and-suspenders — app also validates)
  CONSTRAINT tenants_code_format CHECK (tenant_code ~ '^[a-z0-9_]+$'),
  CONSTRAINT tenants_emails_not_empty CHECK (
    contact_email <> '' AND billing_email <> ''
  )
);

COMMENT ON TABLE  public.tenants IS
  'One row per registered business tenant.  Controls routing, schema lookup, and platform billing.';
COMMENT ON COLUMN public.tenants.tenant_code IS
  'Immutable lowercase slug used in the x-tenant-id header and as the schema name suffix.';
COMMENT ON COLUMN public.tenants.schema_name IS
  'PostgreSQL schema that holds this tenant''s private domain tables.';
COMMENT ON COLUMN public.tenants.settings IS
  'Arbitrary JSON for per-tenant feature flags or configuration (timezone, currency, branding, etc.).';


-- ---------------------------------------------------------------------------
-- 3.2  public.platform_plans
-- ---------------------------------------------------------------------------
-- Catalog of the plans FeeAutomate itself sells (Starter / Growth / Pro /
-- Enterprise), keyed by (tier, billing_cycle).  Razorpay plan IDs are
-- stored here so the app can create subscriptions without hard-coding them.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_plans (
  id                     UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Logical tier (matches pricing.ts PlanTier)
  tier                   public.plan_tier   NOT NULL,

  -- Billing cadence for this row
  billing_cycle          public.billing_cycle NOT NULL,

  -- Human-readable label, e.g. "Growth — Monthly"
  name                   TEXT    NOT NULL,

  -- Description shown in the pricing page
  description            TEXT,

  -- Price in smallest currency unit (paise for INR).
  -- 0 for Starter and Enterprise (custom billing).
  amount_cents           BIGINT  NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),

  -- Razorpay plan ID.  NULL until the plan has been created in Razorpay.
  razorpay_plan_id       TEXT    UNIQUE,

  -- Hard limits enforced by planLimitEnforcer middleware
  member_limit           INT     NOT NULL,
  invoice_limit_monthly  INT     NOT NULL,
  admin_limit            INT     NOT NULL,
  email_limit_monthly    INT     NOT NULL,
  data_retention_months  INT     NOT NULL DEFAULT 6,

  -- Full feature set serialised from PlanFeatures interface
  features               JSONB   NOT NULL DEFAULT '{}'::jsonb,

  -- Whether this plan is offered to new subscribers
  status                 public.plan_status NOT NULL DEFAULT 'active',

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each (tier, billing_cycle) pair must be unique
  CONSTRAINT platform_plans_tier_cycle_unique UNIQUE (tier, billing_cycle)
);

COMMENT ON TABLE  public.platform_plans IS
  'FeeAutomate''s own subscription plans (Starter/Growth/Pro/Enterprise × monthly/yearly).';
COMMENT ON COLUMN public.platform_plans.amount_cents IS
  'Price in paise (INR smallest unit). 0 for free or custom-priced tiers.';
COMMENT ON COLUMN public.platform_plans.features IS
  'Serialised PlanFeatures object: autoInvoicing, paymentReminders, analyticsLevel, etc.';


-- ---------------------------------------------------------------------------
-- 3.3  public.tenant_subscriptions
-- ---------------------------------------------------------------------------
-- One row per tenant.  Tracks their current FeeAutomate platform plan,
-- Razorpay subscription reference, trial window, and billing period.
-- The UNIQUE constraint on tenant_id enforces the one-subscription-per-tenant
-- invariant; use UPDATE (not INSERT) to change plans.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The business subscribing
  tenant_id                UUID    NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- The FeeAutomate plan they are on
  platform_plan_id         UUID    NOT NULL REFERENCES public.platform_plans(id),

  -- Razorpay subscription reference (NULL during trial or for Starter/Enterprise)
  razorpay_subscription_id TEXT    UNIQUE,

  status                   public.tenant_subscription_status NOT NULL DEFAULT 'trialing',

  -- Inclusive billing window for the current charge cycle
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,

  -- When the 14-day Pro trial expires
  trial_ends_at            TIMESTAMPTZ,

  -- Set when the tenant requests cancellation (at end of current period)
  cancelled_at             TIMESTAMPTZ,

  -- Scheduled downgrade: populated when a downgrade is queued for
  -- the next billing cycle.
  scheduled_plan_id        UUID    REFERENCES public.platform_plans(id),
  scheduled_change_at      TIMESTAMPTZ,

  -- Active add-ons: JSON array of { addOnId, quantity, razorpayItemId? }
  add_ons                  JSONB   NOT NULL DEFAULT '[]'::jsonb,

  -- Coupon applied to this subscription (e.g. "EARLYFEE25")
  coupon_code              TEXT,
  discount_percent         SMALLINT CHECK (discount_percent BETWEEN 0 AND 100),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one active subscription record per tenant
  CONSTRAINT tenant_subscriptions_tenant_unique UNIQUE (tenant_id)
);

COMMENT ON TABLE  public.tenant_subscriptions IS
  'Tracks each tenant''s current FeeAutomate platform subscription, trial window, and Razorpay reference.';
COMMENT ON COLUMN public.tenant_subscriptions.add_ons IS
  'Active add-ons array: [{ "addOnId": "extra_members_100", "quantity": 2 }, ...]';
COMMENT ON COLUMN public.tenant_subscriptions.scheduled_plan_id IS
  'Plan that will become active at scheduled_change_at (used for end-of-cycle downgrades).';


-- ---------------------------------------------------------------------------
-- 3.4  public.platform_add_ons
-- ---------------------------------------------------------------------------
-- Catalog of purchasable add-ons (matches ADD_ON_DEFINITIONS in pricing.ts).
-- Kept in the DB so Razorpay IDs can be stored alongside each add-on.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_add_ons (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Matches AddOnDefinition.id in pricing.ts (e.g. "extra_members_100")
  add_on_code     TEXT    NOT NULL UNIQUE,

  name            TEXT    NOT NULL,
  description     TEXT,

  -- Prices in paise
  monthly_cents   BIGINT  NOT NULL DEFAULT 0 CHECK (monthly_cents >= 0),
  yearly_cents    BIGINT  NOT NULL DEFAULT 0 CHECK (yearly_cents >= 0),

  -- Which tiers are eligible for this add-on (JSON array of plan_tier)
  applicable_tiers JSONB  NOT NULL DEFAULT '[]'::jsonb,

  unit            TEXT    NOT NULL DEFAULT '1 unit',
  max_quantity    INT     NOT NULL DEFAULT 1 CHECK (max_quantity >= 1),

  status          public.plan_status NOT NULL DEFAULT 'active',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.platform_add_ons IS
  'Purchasable add-ons available to Growth/Pro tenants (extra members, WhatsApp, SMS, etc.).';


-- ---------------------------------------------------------------------------
-- 3.5  public.platform_invoices
-- ---------------------------------------------------------------------------
-- One row per billing event: each time FeeAutomate charges a tenant
-- (or a charge attempt is made), a platform invoice is recorded here.
-- Distinct from the per-tenant invoices table that lives in tenant schemas.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_invoices (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which tenant was charged
  tenant_id               UUID    NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- The subscription that generated this charge
  tenant_subscription_id  UUID    REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,

  -- The plan being billed for
  platform_plan_id        UUID    REFERENCES public.platform_plans(id),

  -- Amount charged (paise)
  amount_cents            BIGINT  NOT NULL CHECK (amount_cents >= 0),

  -- Currency ISO code
  currency                TEXT    NOT NULL DEFAULT 'INR',

  status                  public.platform_invoice_status NOT NULL DEFAULT 'pending',

  -- Razorpay references
  razorpay_payment_id     TEXT,
  razorpay_invoice_id     TEXT,
  razorpay_order_id       TEXT,

  -- The billing window this invoice covers
  billing_period_start    TIMESTAMPTZ,
  billing_period_end      TIMESTAMPTZ,

  -- Timestamps
  paid_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent double-charging: each Razorpay payment can map to one invoice
  CONSTRAINT platform_invoices_rzp_payment_unique UNIQUE (razorpay_payment_id)
);

COMMENT ON TABLE  public.platform_invoices IS
  'Platform-level billing events: charges FeeAutomate makes to tenants for subscription fees.';


-- ---------------------------------------------------------------------------
-- 3.6  public.audit_logs  (platform-level)
-- ---------------------------------------------------------------------------
-- Immutable append-only log of significant platform events:
-- tenant registration, plan changes, admin actions, webhook events.
-- Row-level security and no UPDATE/DELETE should be enforced in production.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which tenant the event concerns (NULL for platform-global events)
  tenant_id    UUID        REFERENCES public.tenants(id) ON DELETE SET NULL,

  -- Actor: the user who triggered the event (NULL for system/cron actions)
  actor_id     UUID,
  actor_role   TEXT,

  -- Event classification
  -- Examples: 'tenant.registered', 'plan.upgraded', 'webhook.received',
  --           'subscription.cancelled', 'admin.user_deleted'
  event_type   TEXT        NOT NULL,

  -- Target entity (table name) and its ID, if applicable
  entity_type  TEXT,
  entity_id    UUID,

  -- Full before/after snapshot or event-specific payload
  payload      JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- Originating IP address (for security audits)
  ip_address   INET,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.audit_logs IS
  'Immutable append-only audit trail for platform-level events.  Never UPDATE or DELETE rows here.';
COMMENT ON COLUMN public.audit_logs.payload IS
  'Event-specific JSON: includes before/after diffs, request details, Razorpay event payloads, etc.';


-- =============================================================================
-- 4. TENANT SCHEMA TEMPLATE
-- =============================================================================
-- The block below creates the schema for a representative "demo" tenant.
-- In production the application creates a new schema per tenant via:
--   UserRepository.createTenantUsersTable(schemaName, client)
--   TenantSchemaRepository.ensureCoreDomainTables(schemaName, client)
--
-- Replace "tenant_demo" with "tenant_<tenantCode>" for each real tenant.
-- All tables use TEXT + CHECK constraints (not ENUMs) so they can be created
-- dynamically per-schema without requiring per-schema type creation.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS tenant_demo;

-- ---------------------------------------------------------------------------
-- 4.1  tenant_<code>.users
-- ---------------------------------------------------------------------------
-- Portal users who can log in: Admins manage the tenant account;
-- Members are fee-paying customers.  Passwords are bcrypt hashes.
-- This table lives in the tenant schema (not public) so credentials
-- are fully isolated between tenants.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_demo.users (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CITEXT provides case-insensitive uniqueness (no lowercasing needed in app)
  email          CITEXT  NOT NULL UNIQUE,

  full_name      TEXT    NOT NULL,

  -- bcrypt hash (cost factor 12)
  password_hash  TEXT    NOT NULL,

  -- 'Admin' = full management access; 'Member' = self-service portal only
  role           TEXT    NOT NULL CHECK (role IN ('Admin', 'Member')),

  is_active      BOOLEAN NOT NULL DEFAULT TRUE,

  -- JWT refresh token tracking (NULL means no active session)
  last_login_at  TIMESTAMPTZ,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  tenant_demo.users IS
  'Tenant-scoped portal users.  Admins manage the account; Members use the self-service portal.';
COMMENT ON COLUMN tenant_demo.users.password_hash IS
  'bcrypt hash with salt rounds = 12.  Never store plaintext passwords.';


-- ---------------------------------------------------------------------------
-- 4.2  tenant_<code>.members
-- ---------------------------------------------------------------------------
-- Fee-paying customers of the tenant (gym members, hostel residents, students).
-- A member may or may not have a corresponding users row; if they do, their
-- member.email must match users.email.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_demo.members (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  full_name   TEXT    NOT NULL,

  -- CITEXT enforces case-insensitive uniqueness without extra indexes
  email       CITEXT  NOT NULL UNIQUE,

  -- Optional contact details
  phone       TEXT,
  address     TEXT,

  -- Free-form notes for the admin (medical info, special discounts, etc.)
  notes       TEXT,

  -- 'active' members receive invoices; 'inactive' are frozen (read-only).
  status      TEXT    NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',

  -- Profile photo URL (stored in object storage; only URL kept here)
  avatar_url  TEXT,

  -- Soft-delete: set when a member is "removed" but data is retained
  deleted_at  TIMESTAMPTZ,

  -- Link to the user account that this member logs in with (optional)
  -- NULL means the member exists only in admin records (no self-service).
  user_id     UUID    REFERENCES tenant_demo.users(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  tenant_demo.members IS
  'Fee-paying customers of the tenant (gym members, hostel residents, etc.).';
COMMENT ON COLUMN tenant_demo.members.status IS
  '''active'' members receive invoices; ''inactive'' are frozen and excluded from auto-invoicing.';
COMMENT ON COLUMN tenant_demo.members.deleted_at IS
  'Soft-delete timestamp.  NULL = not deleted.  Retained for audit and payment history.';


-- ---------------------------------------------------------------------------
-- 4.3  tenant_<code>.plans
-- ---------------------------------------------------------------------------
-- Subscription plans the tenant offers to their own members
-- (e.g. "Monthly Gym Membership ₹999", "Annual Hostel Bed ₹60,000").
-- NOT to be confused with FeeAutomate's own platform_plans.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_demo.plans (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  name          TEXT    NOT NULL,
  description   TEXT,

  -- Price in paise (INR smallest unit).  ≥ 0 to allow free plans.
  amount_cents  BIGINT  NOT NULL CHECK (amount_cents >= 0),

  -- 'monthly' or 'yearly' — drives auto-invoice scheduling
  billing_cycle TEXT    NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),

  -- 'active' plans are offered to new subscribers; 'inactive' are archived.
  status        TEXT    NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',

  -- Optional grace period override (days after due date before overdue)
  grace_period_days INT NOT NULL DEFAULT 0 CHECK (grace_period_days >= 0),

  -- Optional Razorpay Plan ID if this plan uses recurring payments
  razorpay_plan_id TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  tenant_demo.plans IS
  'Subscription plans offered by the tenant to their own members (fee structures).';
COMMENT ON COLUMN tenant_demo.plans.amount_cents IS
  'Amount in paise.  E.g. ₹999/mo = 99900.';
COMMENT ON COLUMN tenant_demo.plans.grace_period_days IS
  'Days after due_date before an invoice is automatically marked overdue.  Default 0.';


-- ---------------------------------------------------------------------------
-- 4.4  tenant_<code>.subscriptions
-- ---------------------------------------------------------------------------
-- Associates a member with a plan for a given time window.
-- One member can have multiple subscriptions over time (history) but
-- typically only one 'active' subscription at a time.
-- The monthly invoice job queries active subscriptions to generate invoices.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_demo.subscriptions (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Member being subscribed
  member_id   UUID    NOT NULL REFERENCES tenant_demo.members(id) ON DELETE CASCADE,

  -- Plan they are subscribed to
  plan_id     UUID    NOT NULL REFERENCES tenant_demo.plans(id),

  -- Lifecycle: active → expired/canceled
  status      TEXT    NOT NULL CHECK (status IN ('active', 'pending', 'expired', 'canceled'))
              DEFAULT 'pending',

  -- Inclusive date range for this subscription
  start_date  DATE    NOT NULL,
  end_date    DATE,

  -- Optional: next renewal date (derived from billing_cycle if NULL)
  next_renewal_date DATE,

  -- Razorpay Subscription ID if managed via Razorpay recurring
  razorpay_subscription_id TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_dates_valid CHECK (end_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE  tenant_demo.subscriptions IS
  'Links a member to a plan for a time window.  Drives monthly invoice generation.';
COMMENT ON COLUMN tenant_demo.subscriptions.status IS
  '''pending'': created, payment not yet received.  ''active'': paid and in-term.
''expired'': term ended.  ''canceled'': cancelled before end_date.';


-- ---------------------------------------------------------------------------
-- 4.5  tenant_<code>.invoices
-- ---------------------------------------------------------------------------
-- Billing demand documents raised against a member.  May be created
-- automatically by the monthly invoice job or manually by an admin.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_demo.invoices (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Debtor
  member_id        UUID    NOT NULL REFERENCES tenant_demo.members(id) ON DELETE CASCADE,

  -- Subscription that generated this invoice (NULL for ad-hoc invoices)
  subscription_id  UUID    REFERENCES tenant_demo.subscriptions(id) ON DELETE SET NULL,

  -- Human-readable invoice number, unique within the tenant schema.
  -- Format used by the monthly job: <TENANTCODE>-INV-<YYYYMM>-<00001>
  invoice_number   TEXT    NOT NULL UNIQUE,

  -- Amount demanded in paise
  amount_cents     BIGINT  NOT NULL CHECK (amount_cents >= 0),

  -- Payment deadline
  due_date         DATE    NOT NULL,

  -- Lifecycle: pending → paid | overdue
  status           TEXT    NOT NULL CHECK (status IN ('pending', 'paid', 'overdue'))
                   DEFAULT 'pending',

  -- When the invoice was first raised (may differ from created_at for backfills)
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Set automatically when status transitions to 'paid'
  paid_at          TIMESTAMPTZ,

  -- Optional notes visible to the member (e.g. "January membership fee")
  notes            TEXT,

  -- Razorpay payment link / order reference if created
  razorpay_order_id     TEXT,
  razorpay_payment_link TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  tenant_demo.invoices IS
  'Billing demand documents for members.  Auto-generated monthly or created manually by admins.';
COMMENT ON COLUMN tenant_demo.invoices.invoice_number IS
  'Tenant-unique human-readable ID.  Format: <CODE>-INV-<YYYYMM>-<SEQ>.';
COMMENT ON COLUMN tenant_demo.invoices.paid_at IS
  'Timestamp of payment confirmation.  Set automatically when status → ''paid''.';


-- ---------------------------------------------------------------------------
-- 4.6  tenant_<code>.payments
-- ---------------------------------------------------------------------------
-- Records each payment attempt against an invoice.
-- Multiple payment rows can exist per invoice (partial payments, retries).
-- The metadata JSONB column stores Razorpay-specific details, receipt info,
-- and any other gateway-specific fields.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_demo.payments (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice being paid
  invoice_id       UUID    NOT NULL REFERENCES tenant_demo.invoices(id) ON DELETE CASCADE,

  -- Amount paid in paise (may be less than invoice.amount_cents for partial pay)
  amount_cents     BIGINT  NOT NULL CHECK (amount_cents >= 0),

  -- Payment method: 'razorpay', 'cash', 'upi', 'bank_transfer', etc.
  method           TEXT,

  -- Transaction lifecycle: pending → paid | failed
  status           TEXT    NOT NULL CHECK (status IN ('pending', 'paid', 'failed'))
                   DEFAULT 'pending',

  -- Gateway-side transaction / payment ID.  UNIQUE prevents double-recording.
  transaction_ref  TEXT    UNIQUE,

  -- Arbitrary gateway metadata:
  --   { "razorpay_order_id": "...", "razorpay_payment_id": "...",
  --     "receiptNumber": "DEMO-RCT-202501-ab12cd34",
  --     "receiptGeneratedAt": "2025-01-15T10:00:00Z" }
  metadata         JSONB   NOT NULL DEFAULT '{}'::jsonb,

  -- Set when status = 'paid'
  paid_at          TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  tenant_demo.payments IS
  'Individual payment attempts against an invoice.  Stores Razorpay details and receipt metadata.';
COMMENT ON COLUMN tenant_demo.payments.transaction_ref IS
  'Unique gateway transaction ID (Razorpay payment ID).  Prevents duplicate payment recording.';
COMMENT ON COLUMN tenant_demo.payments.metadata IS
  'Gateway-specific JSON: Razorpay IDs, receipt number/timestamp, refund details, etc.';


-- ---------------------------------------------------------------------------
-- 4.7  tenant_<code>.notifications
-- ---------------------------------------------------------------------------
-- Every notification dispatched (or queued) to a member is logged here.
-- Background jobs write rows with status='pending', and the notification
-- service updates them to 'sent' or 'failed' after delivery.
-- Provides a full audit trail of all communications.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_demo.notifications (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target member (NULL for broadcast or system notifications)
  member_id   UUID    REFERENCES tenant_demo.members(id) ON DELETE SET NULL,

  -- Notification category:
  --   'payment_reminder_before_due' | 'payment_reminder_on_due'
  --   'payment_reminder_after_due'  | 'defaulter_detected'
  --   'invoice_created'             | 'payment_received'
  --   'subscription_renewal_reminder' | 'plan_changed' | 'general'
  type        TEXT    NOT NULL,

  -- Delivery channel
  channel     TEXT    NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp'))
              DEFAULT 'in_app',

  -- Human-readable message body shown in the app or sent via email/SMS
  message     TEXT    NOT NULL,

  -- Delivery state
  status      TEXT    NOT NULL CHECK (status IN ('pending', 'sent', 'failed'))
              DEFAULT 'pending',

  -- Contextual data:
  --   { "invoiceId": "uuid", "stage": "before_due" }
  --   { "subscriptionId": "uuid", "renewalDate": "2025-02-01" }
  --   { "daysOverdue": 35 }
  metadata    JSONB   NOT NULL DEFAULT '{}'::jsonb,

  -- Error details if status = 'failed'
  error_message TEXT,

  -- When the notification was actually dispatched (NULL if still pending)
  sent_at     TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  tenant_demo.notifications IS
  'Audit trail of all notifications dispatched to members (in-app, email, SMS, WhatsApp).';
COMMENT ON COLUMN tenant_demo.notifications.type IS
  'Semantic event type: payment_reminder_before_due, defaulter_detected, invoice_created, etc.';
COMMENT ON COLUMN tenant_demo.notifications.metadata IS
  'Event-specific context: invoiceId, subscriptionId, stage, daysOverdue, etc.';


-- ---------------------------------------------------------------------------
-- 4.8  tenant_<code>.audit_logs
-- ---------------------------------------------------------------------------
-- Tenant-scoped audit log for changes made inside the tenant's domain.
-- Captures admin actions (member CRUD, plan changes, manual invoice creation).
-- Separate from public.audit_logs which records platform-level events.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_demo.audit_logs (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who performed the action
  actor_id     UUID    REFERENCES tenant_demo.users(id) ON DELETE SET NULL,
  actor_email  CITEXT,
  actor_role   TEXT,

  -- Action performed:
  --   'member.created' | 'member.updated' | 'member.deleted'
  --   'plan.created'   | 'plan.updated'   | 'plan.deleted'
  --   'invoice.created'| 'invoice.status_changed'
  --   'payment.recorded' | 'subscription.created' | 'subscription.cancelled'
  event_type   TEXT    NOT NULL,

  -- Which table / entity was affected
  entity_type  TEXT,
  entity_id    UUID,

  -- JSON diff: { "before": {...}, "after": {...} }
  payload      JSONB   NOT NULL DEFAULT '{}'::jsonb,

  ip_address   INET,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  tenant_demo.audit_logs IS
  'Immutable audit trail for admin actions within this tenant''s domain.';


-- =============================================================================
-- 5. INDEXES
-- =============================================================================
-- Naming convention:
--   idx_<schema>_<table>_<column(s)>
--   idx_<schema>_<table>_<column>_gin  (for JSONB GIN indexes)
-- =============================================================================

-- ---- PUBLIC SCHEMA ----------------------------------------------------------

-- tenants: fast lookup by code (used on every request via tenantResolver)
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_tenants_tenant_code
  ON public.tenants (tenant_code);

-- tenants: filter by status (most queries only want 'active')
CREATE INDEX IF NOT EXISTS idx_public_tenants_status
  ON public.tenants (status);

-- tenants: referral lookup
CREATE INDEX IF NOT EXISTS idx_public_tenants_referred_by
  ON public.tenants (referred_by_tenant_id)
  WHERE referred_by_tenant_id IS NOT NULL;

-- platform_plans: tier × cycle lookup (used when creating subscriptions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_platform_plans_tier_cycle
  ON public.platform_plans (tier, billing_cycle);

-- platform_plans: Razorpay plan lookup (webhook processing)
CREATE INDEX IF NOT EXISTS idx_public_platform_plans_rzp_plan_id
  ON public.platform_plans (razorpay_plan_id)
  WHERE razorpay_plan_id IS NOT NULL;

-- tenant_subscriptions: fast lookup by tenant (resolves plan on every request)
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_tenant_subs_tenant_id
  ON public.tenant_subscriptions (tenant_id);

-- tenant_subscriptions: filter by status (cron jobs, webhook handlers)
CREATE INDEX IF NOT EXISTS idx_public_tenant_subs_status
  ON public.tenant_subscriptions (status);

-- tenant_subscriptions: Razorpay subscription ID (webhook processing)
CREATE INDEX IF NOT EXISTS idx_public_tenant_subs_rzp_sub_id
  ON public.tenant_subscriptions (razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;

-- tenant_subscriptions: scheduled downgrades (cron job)
CREATE INDEX IF NOT EXISTS idx_public_tenant_subs_scheduled_change
  ON public.tenant_subscriptions (scheduled_change_at)
  WHERE scheduled_change_at IS NOT NULL;

-- platform_invoices: tenant billing history
CREATE INDEX IF NOT EXISTS idx_public_platform_invoices_tenant_id
  ON public.platform_invoices (tenant_id);

-- platform_invoices: status filter (collect unpaid invoices)
CREATE INDEX IF NOT EXISTS idx_public_platform_invoices_status
  ON public.platform_invoices (status);

-- platform_invoices: Razorpay payment lookup (webhook deduplication)
CREATE INDEX IF NOT EXISTS idx_public_platform_invoices_rzp_payment_id
  ON public.platform_invoices (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- audit_logs (public): filter by tenant + time window
CREATE INDEX IF NOT EXISTS idx_public_audit_logs_tenant_id
  ON public.audit_logs (tenant_id, created_at DESC);

-- audit_logs (public): filter by event type
CREATE INDEX IF NOT EXISTS idx_public_audit_logs_event_type
  ON public.audit_logs (event_type, created_at DESC);

-- audit_logs (public): filter by entity
CREATE INDEX IF NOT EXISTS idx_public_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id)
  WHERE entity_type IS NOT NULL;


-- ---- TENANT SCHEMA (tenant_demo as template) ---------------------------------

-- users: email lookup (login path)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_users_email
  ON tenant_demo.users (email);

-- users: active users only (most queries filter is_active = TRUE)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_users_active
  ON tenant_demo.users (is_active)
  WHERE is_active = TRUE;

-- members: status filter (auto-invoice job only processes active members)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_members_status
  ON tenant_demo.members (status);

-- members: soft-delete filter (exclude deleted in most queries)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_members_not_deleted
  ON tenant_demo.members (id)
  WHERE deleted_at IS NULL;

-- members: user_id FK (check if a member has a portal login)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_members_user_id
  ON tenant_demo.members (user_id)
  WHERE user_id IS NOT NULL;

-- plans: status filter
CREATE INDEX IF NOT EXISTS idx_tenant_demo_plans_status
  ON tenant_demo.plans (status);

-- subscriptions: member lookup (list subscriptions for a member)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_subscriptions_member_id
  ON tenant_demo.subscriptions (member_id);

-- subscriptions: plan lookup (detect members on a plan being archived)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_subscriptions_plan_id
  ON tenant_demo.subscriptions (plan_id);

-- subscriptions: status filter (invoice job only processes 'active')
CREATE INDEX IF NOT EXISTS idx_tenant_demo_subscriptions_status
  ON tenant_demo.subscriptions (status);

-- subscriptions: renewal date (subscription renewal reminder job)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_subscriptions_renewal
  ON tenant_demo.subscriptions (next_renewal_date)
  WHERE status = 'active' AND next_renewal_date IS NOT NULL;

-- invoices: member lookup (member portal — my invoices)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_invoices_member_id
  ON tenant_demo.invoices (member_id);

-- invoices: status + due_date (overdue detection, payment reminders)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_invoices_status_due_date
  ON tenant_demo.invoices (status, due_date);

-- invoices: subscription lookup (deduplicate monthly generation)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_invoices_subscription_id
  ON tenant_demo.invoices (subscription_id)
  WHERE subscription_id IS NOT NULL;

-- invoices: issued_at (dashboard — recent invoices, monthly partitioning)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_invoices_issued_at
  ON tenant_demo.invoices (issued_at DESC);

-- payments: invoice lookup (list payments for an invoice)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_payments_invoice_id
  ON tenant_demo.payments (invoice_id);

-- payments: status filter (pending/failed follow-ups)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_payments_status
  ON tenant_demo.payments (status);

-- payments: transaction_ref lookup (webhook deduplication)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_payments_transaction_ref
  ON tenant_demo.payments (transaction_ref)
  WHERE transaction_ref IS NOT NULL;

-- payments: GIN index on metadata (receipt lookup, JSONB path queries)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_payments_metadata_gin
  ON tenant_demo.payments USING GIN (metadata);

-- notifications: member lookup (in-app notification feed)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_notifications_member_id
  ON tenant_demo.notifications (member_id);

-- notifications: type + status (job deduplication, dispatch queues)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_notifications_type_status
  ON tenant_demo.notifications (type, status);

-- notifications: channel filter (dispatch workers per channel)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_notifications_channel_status
  ON tenant_demo.notifications (channel, status)
  WHERE status = 'pending';

-- notifications: created_at (TTL / archive queries)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_notifications_created_at
  ON tenant_demo.notifications (created_at DESC);

-- audit_logs (tenant): actor + time
CREATE INDEX IF NOT EXISTS idx_tenant_demo_audit_logs_actor
  ON tenant_demo.audit_logs (actor_id, created_at DESC);

-- audit_logs (tenant): event type (filter by action)
CREATE INDEX IF NOT EXISTS idx_tenant_demo_audit_logs_event_type
  ON tenant_demo.audit_logs (event_type, created_at DESC);

-- audit_logs (tenant): entity lookup
CREATE INDEX IF NOT EXISTS idx_tenant_demo_audit_logs_entity
  ON tenant_demo.audit_logs (entity_type, entity_id)
  WHERE entity_type IS NOT NULL;


-- =============================================================================
-- 6. FUNCTIONS & TRIGGERS — auto-update updated_at
-- =============================================================================
-- A single reusable trigger function keeps updated_at accurate without
-- requiring the application layer to set it on every UPDATE.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_set_updated_at() IS
  'Generic trigger function: sets updated_at = now() on every UPDATE.';

-- Helper macro to attach the trigger to any table
-- Usage: SELECT public.create_updated_at_trigger('schema', 'table');
CREATE OR REPLACE FUNCTION public.create_updated_at_trigger(
  p_schema TEXT,
  p_table  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  trigger_name TEXT := 'trg_' || p_table || '_set_updated_at';
BEGIN
  EXECUTE format(
    'CREATE OR REPLACE TRIGGER %I
     BEFORE UPDATE ON %I.%I
     FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at()',
    trigger_name, p_schema, p_table
  );
END;
$$;

COMMENT ON FUNCTION public.create_updated_at_trigger(TEXT, TEXT) IS
  'Attaches the fn_set_updated_at trigger to the specified table.  Call once per table.';

-- Attach to PUBLIC schema tables
SELECT public.create_updated_at_trigger('public', 'tenants');
SELECT public.create_updated_at_trigger('public', 'platform_plans');
SELECT public.create_updated_at_trigger('public', 'tenant_subscriptions');
SELECT public.create_updated_at_trigger('public', 'platform_add_ons');

-- Attach to tenant_demo tables
SELECT public.create_updated_at_trigger('tenant_demo', 'users');
SELECT public.create_updated_at_trigger('tenant_demo', 'members');
SELECT public.create_updated_at_trigger('tenant_demo', 'plans');
SELECT public.create_updated_at_trigger('tenant_demo', 'subscriptions');
SELECT public.create_updated_at_trigger('tenant_demo', 'invoices');
SELECT public.create_updated_at_trigger('tenant_demo', 'payments');
SELECT public.create_updated_at_trigger('tenant_demo', 'notifications');


-- =============================================================================
-- 7. ROW-LEVEL SECURITY (FOUNDATION)
-- =============================================================================
-- Production hardening: the application connects via a role that has no
-- direct cross-schema SELECT.  Each tenant schema is owned by the app role
-- but search_path is set per-connection to prevent accidental cross-tenant
-- access.  Platform tables use explicit public.* qualification.
--
-- Enable RLS on public.audit_logs to prevent tampering:
-- =============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow the application role to INSERT but never UPDATE or DELETE
-- (adjust role name to match your deployment).
-- Example (uncomment and set correct role name):
-- CREATE POLICY audit_insert_only ON public.audit_logs
--   AS RESTRICTIVE
--   FOR ALL
--   TO feeautomate_app
--   USING (TRUE)
--   WITH CHECK (TRUE);

ALTER TABLE tenant_demo.audit_logs ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 8. SEED DATA
-- =============================================================================
-- Provides a working demo dataset:
--   • 1 platform plan per (tier × cycle) combination
--   • 2 tenants: "demo" (gym) and "hostel1" (hostel)
--   • Each tenant has an admin user and 2 members
--   • Plans, subscriptions, invoices, payments, and notifications
-- All UUIDs are deterministic via gen_random_uuid() replacement with explicit
-- values so they can be referenced across tables safely.
-- =============================================================================

-- ---- 8.1 Platform Plans (FeeAutomate's own billing catalog) -----------------

INSERT INTO public.platform_plans
  (id, tier, billing_cycle, name, description, amount_cents,
   member_limit, invoice_limit_monthly, admin_limit, email_limit_monthly,
   data_retention_months, features, status)
VALUES
  -- Starter — free, no Razorpay plan needed
  ('00000000-0000-0000-0001-000000000001'::uuid,
   'starter', 'monthly', 'Starter — Monthly',
   'Free forever for micro-businesses up to 50 members.', 0,
   50, 100, 1, 100, 6,
   '{"autoInvoicing":false,"paymentReminders":false,"defaulterDetection":false,
     "receiptGeneration":false,"customWorkflows":false,"analyticsLevel":"basic",
     "customBranding":false,"apiAccess":"none","whatsappNotifications":"none",
     "prioritySupport":false}'::jsonb,
   'active'),

  ('00000000-0000-0000-0001-000000000002'::uuid,
   'starter', 'yearly', 'Starter — Yearly',
   'Free forever.', 0,
   50, 100, 1, 100, 6,
   '{"autoInvoicing":false,"paymentReminders":false,"defaulterDetection":false,
     "receiptGeneration":false,"customWorkflows":false,"analyticsLevel":"basic",
     "customBranding":false,"apiAccess":"none","whatsappNotifications":"none",
     "prioritySupport":false}'::jsonb,
   'active'),

  -- Growth — ₹999/mo, ₹9,990/yr
  ('00000000-0000-0000-0001-000000000003'::uuid,
   'growth', 'monthly', 'Growth — Monthly',
   'For growing businesses: 500 members, 3 admins, automation & analytics.', 99900,
   500, 2000, 3, 2000, 12,
   '{"autoInvoicing":true,"paymentReminders":true,"defaulterDetection":false,
     "receiptGeneration":false,"customWorkflows":false,"analyticsLevel":"standard",
     "customBranding":false,"apiAccess":"none","whatsappNotifications":"none",
     "prioritySupport":false}'::jsonb,
   'active'),

  ('00000000-0000-0000-0001-000000000004'::uuid,
   'growth', 'yearly', 'Growth — Yearly',
   'Growth plan billed annually (~17% discount).', 999000,
   500, 2000, 3, 2000, 12,
   '{"autoInvoicing":true,"paymentReminders":true,"defaulterDetection":false,
     "receiptGeneration":false,"customWorkflows":false,"analyticsLevel":"standard",
     "customBranding":false,"apiAccess":"none","whatsappNotifications":"none",
     "prioritySupport":false}'::jsonb,
   'active'),

  -- Pro — ₹2,499/mo, ₹24,990/yr
  ('00000000-0000-0000-0001-000000000005'::uuid,
   'pro', 'monthly', 'Pro — Monthly',
   'Full-featured for established businesses: 2,000 members, advanced analytics.', 249900,
   2000, 10000, 10, 10000, 24,
   '{"autoInvoicing":true,"paymentReminders":true,"defaulterDetection":true,
     "receiptGeneration":true,"customWorkflows":false,"analyticsLevel":"advanced",
     "customBranding":true,"apiAccess":"readonly","whatsappNotifications":"addon",
     "prioritySupport":true}'::jsonb,
   'active'),

  ('00000000-0000-0000-0001-000000000006'::uuid,
   'pro', 'yearly', 'Pro — Yearly',
   'Pro plan billed annually (~17% discount).', 2499000,
   2000, 10000, 10, 10000, 24,
   '{"autoInvoicing":true,"paymentReminders":true,"defaulterDetection":true,
     "receiptGeneration":true,"customWorkflows":false,"analyticsLevel":"advanced",
     "customBranding":true,"apiAccess":"readonly","whatsappNotifications":"addon",
     "prioritySupport":true}'::jsonb,
   'active'),

  -- Enterprise — custom pricing
  ('00000000-0000-0000-0001-000000000007'::uuid,
   'enterprise', 'monthly', 'Enterprise — Monthly',
   'Custom solution for large organisations. Contact sales.', 0,
   2147483647, 2147483647, 2147483647, 2147483647, 2147483647,
   '{"autoInvoicing":true,"paymentReminders":true,"defaulterDetection":true,
     "receiptGeneration":true,"customWorkflows":true,"analyticsLevel":"custom",
     "customBranding":true,"apiAccess":"full","whatsappNotifications":"included",
     "prioritySupport":true}'::jsonb,
   'active'),

  ('00000000-0000-0000-0001-000000000008'::uuid,
   'enterprise', 'yearly', 'Enterprise — Yearly',
   'Enterprise plan billed annually. Custom pricing.', 0,
   2147483647, 2147483647, 2147483647, 2147483647, 2147483647,
   '{"autoInvoicing":true,"paymentReminders":true,"defaulterDetection":true,
     "receiptGeneration":true,"customWorkflows":true,"analyticsLevel":"custom",
     "customBranding":true,"apiAccess":"full","whatsappNotifications":"included",
     "prioritySupport":true}'::jsonb,
   'active')
ON CONFLICT (tier, billing_cycle) DO NOTHING;


-- ---- 8.2 Platform Add-Ons ---------------------------------------------------

INSERT INTO public.platform_add_ons
  (id, add_on_code, name, description, monthly_cents, yearly_cents,
   applicable_tiers, unit, max_quantity, status)
VALUES
  ('00000000-0000-0000-0002-000000000001'::uuid,
   'extra_members_100', 'Extra Members Pack',
   'Add 100 additional members to your plan limit.',
   19900, 199000, '["growth","pro"]'::jsonb, '100 members', 5, 'active'),

  ('00000000-0000-0000-0002-000000000002'::uuid,
   'whatsapp_notifications', 'WhatsApp Notifications',
   'Invoice reminders & receipts via WhatsApp. Includes 1,000 messages/mo.',
   49900, 499000, '["growth","pro"]'::jsonb, '1,000 messages/mo', 1, 'active'),

  ('00000000-0000-0000-0002-000000000003'::uuid,
   'extra_admin_user', 'Extra Admin User',
   'Add one additional admin user beyond your plan limit.',
   14900, 149000, '["growth","pro"]'::jsonb, '1 admin user', 10, 'active'),

  ('00000000-0000-0000-0002-000000000004'::uuid,
   'sms_notifications', 'SMS Notifications',
   'SMS reminders and receipts. Includes 500 SMS/mo.',
   29900, 299000, '["growth","pro"]'::jsonb, '500 SMS/mo', 1, 'active'),

  ('00000000-0000-0000-0002-000000000005'::uuid,
   'custom_domain', 'Custom Domain',
   'Use your own domain for the member portal.',
   19900, 199000, '["growth","pro"]'::jsonb, '1 domain', 1, 'active'),

  ('00000000-0000-0000-0002-000000000006'::uuid,
   'priority_support', 'Priority Support Upgrade',
   'Upgrade to priority email and chat support.',
   49900, 499000, '["growth"]'::jsonb, 'support upgrade', 1, 'active')
ON CONFLICT (add_on_code) DO NOTHING;


-- ---- 8.3 Demo Tenant (gym) --------------------------------------------------

INSERT INTO public.tenants
  (id, tenant_code, name, schema_name, status,
   contact_email, billing_email, settings, is_early_adopter)
VALUES
  ('00000000-0000-0000-0003-000000000001'::uuid,
   'demo', 'Demo Gym', 'tenant_demo', 'active',
   'admin@demogym.com', 'billing@demogym.com',
   '{"timezone":"Asia/Kolkata","currency":"INR"}'::jsonb, TRUE)
ON CONFLICT (tenant_code) DO NOTHING;

-- Demo tenant is on a 14-day Pro trial
INSERT INTO public.tenant_subscriptions
  (id, tenant_id, platform_plan_id, status, trial_ends_at, add_ons)
VALUES
  ('00000000-0000-0000-0004-000000000001'::uuid,
   '00000000-0000-0000-0003-000000000001'::uuid,  -- demo tenant
   '00000000-0000-0000-0001-000000000005'::uuid,  -- Pro Monthly (trial)
   'trialing',
   now() + INTERVAL '14 days',
   '[]'::jsonb)
ON CONFLICT (tenant_id) DO NOTHING;


-- ---- 8.4 Hostel Tenant ------------------------------------------------------

INSERT INTO public.tenants
  (id, tenant_code, name, schema_name, status,
   contact_email, billing_email, settings)
VALUES
  ('00000000-0000-0000-0003-000000000002'::uuid,
   'hostel1', 'Sunrise Hostel', 'tenant_hostel1', 'active',
   'owner@sunrisehostel.com', 'billing@sunrisehostel.com',
   '{"timezone":"Asia/Kolkata","currency":"INR"}'::jsonb)
ON CONFLICT (tenant_code) DO NOTHING;

-- Hostel tenant is on Growth Monthly (active, paid)
INSERT INTO public.tenant_subscriptions
  (id, tenant_id, platform_plan_id, status,
   current_period_start, current_period_end, add_ons)
VALUES
  ('00000000-0000-0000-0004-000000000002'::uuid,
   '00000000-0000-0000-0003-000000000002'::uuid,  -- hostel1 tenant
   '00000000-0000-0000-0001-000000000003'::uuid,  -- Growth Monthly
   'active',
   date_trunc('month', now()),
   date_trunc('month', now()) + INTERVAL '1 month' - INTERVAL '1 second',
   '[{"addOnId":"extra_members_100","quantity":1}]'::jsonb)
ON CONFLICT (tenant_id) DO NOTHING;


-- ---- 8.5 Demo Tenant Domain Data (tenant_demo schema) -----------------------

-- Admin user
INSERT INTO tenant_demo.users
  (id, email, full_name, password_hash, role, is_active)
VALUES
  ('00000000-0000-0000-0010-000000000001'::uuid,
   'admin@demogym.com', 'Demo Admin',
   -- bcrypt hash of 'Admin@12345' (cost 12) — replace in production
   '$2b$12$PlaceholderHashForSeedDataDoNotUseInProductionEnviron',
   'Admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Member user account
INSERT INTO tenant_demo.users
  (id, email, full_name, password_hash, role, is_active)
VALUES
  ('00000000-0000-0000-0010-000000000002'::uuid,
   'alice@example.com', 'Alice Johnson',
   '$2b$12$PlaceholderHashForSeedDataDoNotUseInProductionEnviron',
   'Member', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Members
INSERT INTO tenant_demo.members
  (id, full_name, email, phone, status, user_id)
VALUES
  ('00000000-0000-0000-0011-000000000001'::uuid,
   'Alice Johnson', 'alice@example.com', '+91-9876543210', 'active',
   '00000000-0000-0000-0010-000000000002'::uuid),
  ('00000000-0000-0000-0011-000000000002'::uuid,
   'Bob Smith', 'bob@example.com', '+91-9123456789', 'active', NULL)
ON CONFLICT (email) DO NOTHING;

-- Plans offered by Demo Gym
INSERT INTO tenant_demo.plans
  (id, name, description, amount_cents, billing_cycle, status)
VALUES
  ('00000000-0000-0000-0012-000000000001'::uuid,
   'Monthly Membership', 'Standard monthly gym access.', 99900, 'monthly', 'active'),
  ('00000000-0000-0000-0012-000000000002'::uuid,
   'Annual Membership', 'Full-year gym access with 2 months free.', 999000, 'yearly', 'active')
ON CONFLICT DO NOTHING;

-- Subscriptions
INSERT INTO tenant_demo.subscriptions
  (id, member_id, plan_id, status, start_date, end_date)
VALUES
  ('00000000-0000-0000-0013-000000000001'::uuid,
   '00000000-0000-0000-0011-000000000001'::uuid,  -- Alice
   '00000000-0000-0000-0012-000000000001'::uuid,  -- Monthly
   'active',
   date_trunc('month', CURRENT_DATE)::date,
   (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date),
  ('00000000-0000-0000-0013-000000000002'::uuid,
   '00000000-0000-0000-0011-000000000002'::uuid,  -- Bob
   '00000000-0000-0000-0012-000000000001'::uuid,  -- Monthly
   'active',
   date_trunc('month', CURRENT_DATE)::date,
   (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date)
ON CONFLICT DO NOTHING;

-- Invoices
INSERT INTO tenant_demo.invoices
  (id, member_id, subscription_id, invoice_number, amount_cents, due_date, status, issued_at)
VALUES
  -- Alice — current month, paid
  ('00000000-0000-0000-0014-000000000001'::uuid,
   '00000000-0000-0000-0011-000000000001'::uuid,
   '00000000-0000-0000-0013-000000000001'::uuid,
   'DEMO-INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-00001',
   99900,
   (date_trunc('month', CURRENT_DATE) + INTERVAL '7 days')::date,
   'paid',
   now() - INTERVAL '5 days'),
  -- Bob — current month, pending
  ('00000000-0000-0000-0014-000000000002'::uuid,
   '00000000-0000-0000-0011-000000000002'::uuid,
   '00000000-0000-0000-0013-000000000002'::uuid,
   'DEMO-INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-00002',
   99900,
   (date_trunc('month', CURRENT_DATE) + INTERVAL '7 days')::date,
   'pending',
   now() - INTERVAL '2 days')
ON CONFLICT (invoice_number) DO NOTHING;

-- Payment for Alice's paid invoice
INSERT INTO tenant_demo.payments
  (id, invoice_id, amount_cents, method, status, transaction_ref, metadata, paid_at)
VALUES
  ('00000000-0000-0000-0015-000000000001'::uuid,
   '00000000-0000-0000-0014-000000000001'::uuid,
   99900,
   'razorpay',
   'paid',
   'pay_seed_demo_alice_01',
   jsonb_build_object(
     'razorpay_order_id', 'order_seed_demo_01',
     'razorpay_payment_id', 'pay_seed_demo_alice_01',
     'receiptNumber', 'DEMO-RCT-' || to_char(now(), 'YYYYMM') || '-ab12cd34',
     'receiptGeneratedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
   ),
   now() - INTERVAL '4 days')
ON CONFLICT (transaction_ref) DO NOTHING;

-- Update Alice's invoice paid_at (since it was inserted as 'paid')
UPDATE tenant_demo.invoices
SET paid_at = now() - INTERVAL '4 days', updated_at = now()
WHERE id = '00000000-0000-0000-0014-000000000001'::uuid
  AND paid_at IS NULL;

-- Notification: invoice created for Bob
INSERT INTO tenant_demo.notifications
  (id, member_id, type, channel, message, status, metadata)
VALUES
  ('00000000-0000-0000-0016-000000000001'::uuid,
   '00000000-0000-0000-0011-000000000002'::uuid,  -- Bob
   'invoice_created',
   'email',
   'Your invoice DEMO-INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-00002 for ₹999 is due in 7 days.',
   'sent',
   jsonb_build_object('invoiceId', '00000000-0000-0000-0014-000000000002'))
ON CONFLICT DO NOTHING;

-- Notification: payment reminder for Bob (3 days before due)
INSERT INTO tenant_demo.notifications
  (id, member_id, type, channel, message, status, metadata)
VALUES
  ('00000000-0000-0000-0016-000000000002'::uuid,
   '00000000-0000-0000-0011-000000000002'::uuid,  -- Bob
   'payment_reminder_before_due',
   'in_app',
   'Reminder: Invoice DEMO-INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-00002 is due in 3 days.',
   'pending',
   jsonb_build_object(
     'invoiceId', '00000000-0000-0000-0014-000000000002',
     'stage', 'before_due'
   ))
ON CONFLICT DO NOTHING;

-- Audit log: tenant registration
INSERT INTO public.audit_logs
  (id, tenant_id, actor_id, actor_role, event_type, entity_type, entity_id, payload, ip_address)
VALUES
  ('00000000-0000-0000-0017-000000000001'::uuid,
   '00000000-0000-0000-0003-000000000001'::uuid,
   NULL, 'system',
   'tenant.registered',
   'tenants', '00000000-0000-0000-0003-000000000001'::uuid,
   jsonb_build_object('tenantCode', 'demo', 'planTier', 'pro', 'trialDays', 14),
   '127.0.0.1'::inet)
ON CONFLICT DO NOTHING;

-- Tenant-domain audit: admin created Alice
INSERT INTO tenant_demo.audit_logs
  (id, actor_id, actor_email, actor_role, event_type, entity_type, entity_id, payload)
VALUES
  ('00000000-0000-0000-0018-000000000001'::uuid,
   '00000000-0000-0000-0010-000000000001'::uuid,
   'admin@demogym.com', 'Admin',
   'member.created',
   'members', '00000000-0000-0000-0011-000000000001'::uuid,
   jsonb_build_object(
     'after', jsonb_build_object(
       'fullName', 'Alice Johnson',
       'email', 'alice@example.com',
       'status', 'active'
     )
   ))
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 9. HOSTEL TENANT SCHEMA (tenant_hostel1)
-- =============================================================================
-- We create the hostel1 schema here so the seed is self-contained.
-- In production, the application creates this automatically on tenant
-- registration via the repositories.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS tenant_hostel1;

CREATE TABLE IF NOT EXISTS tenant_hostel1.users (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  email          CITEXT  NOT NULL UNIQUE,
  full_name      TEXT    NOT NULL,
  password_hash  TEXT    NOT NULL,
  role           TEXT    NOT NULL CHECK (role IN ('Admin', 'Member')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_hostel1.members (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT    NOT NULL,
  email       CITEXT  NOT NULL UNIQUE,
  phone       TEXT,
  address     TEXT,
  notes       TEXT,
  status      TEXT    NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  avatar_url  TEXT,
  deleted_at  TIMESTAMPTZ,
  user_id     UUID    REFERENCES tenant_hostel1.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_hostel1.plans (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT    NOT NULL,
  description       TEXT,
  amount_cents      BIGINT  NOT NULL CHECK (amount_cents >= 0),
  billing_cycle     TEXT    NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status            TEXT    NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  grace_period_days INT     NOT NULL DEFAULT 0 CHECK (grace_period_days >= 0),
  razorpay_plan_id  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_hostel1.subscriptions (
  id                          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id                   UUID    NOT NULL REFERENCES tenant_hostel1.members(id) ON DELETE CASCADE,
  plan_id                     UUID    NOT NULL REFERENCES tenant_hostel1.plans(id),
  status                      TEXT    NOT NULL CHECK (status IN ('active', 'pending', 'expired', 'canceled')) DEFAULT 'pending',
  start_date                  DATE    NOT NULL,
  end_date                    DATE,
  next_renewal_date           DATE,
  razorpay_subscription_id    TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hostel1_subscriptions_dates_valid CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS tenant_hostel1.invoices (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id               UUID    NOT NULL REFERENCES tenant_hostel1.members(id) ON DELETE CASCADE,
  subscription_id         UUID    REFERENCES tenant_hostel1.subscriptions(id) ON DELETE SET NULL,
  invoice_number          TEXT    NOT NULL UNIQUE,
  amount_cents            BIGINT  NOT NULL CHECK (amount_cents >= 0),
  due_date                DATE    NOT NULL,
  status                  TEXT    NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
  issued_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at                 TIMESTAMPTZ,
  notes                   TEXT,
  razorpay_order_id       TEXT,
  razorpay_payment_link   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_hostel1.payments (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID    NOT NULL REFERENCES tenant_hostel1.invoices(id) ON DELETE CASCADE,
  amount_cents     BIGINT  NOT NULL CHECK (amount_cents >= 0),
  method           TEXT,
  status           TEXT    NOT NULL CHECK (status IN ('pending', 'paid', 'failed')) DEFAULT 'pending',
  transaction_ref  TEXT    UNIQUE,
  metadata         JSONB   NOT NULL DEFAULT '{}'::jsonb,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_hostel1.notifications (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID    REFERENCES tenant_hostel1.members(id) ON DELETE SET NULL,
  type          TEXT    NOT NULL,
  channel       TEXT    NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp')) DEFAULT 'in_app',
  message       TEXT    NOT NULL,
  status        TEXT    NOT NULL CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  metadata      JSONB   NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_hostel1.audit_logs (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID    REFERENCES tenant_hostel1.users(id) ON DELETE SET NULL,
  actor_email  CITEXT,
  actor_role   TEXT,
  event_type   TEXT    NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  payload      JSONB   NOT NULL DEFAULT '{}'::jsonb,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for tenant_hostel1 (mirrors tenant_demo set)
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_users_email           ON tenant_hostel1.users (email);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_members_status        ON tenant_hostel1.members (status);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_members_not_deleted   ON tenant_hostel1.members (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_plans_status          ON tenant_hostel1.plans (status);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_subs_member_id        ON tenant_hostel1.subscriptions (member_id);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_subs_plan_id          ON tenant_hostel1.subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_subs_status           ON tenant_hostel1.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_invoices_member_id    ON tenant_hostel1.invoices (member_id);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_invoices_status_due   ON tenant_hostel1.invoices (status, due_date);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_invoices_sub_id       ON tenant_hostel1.invoices (subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_payments_invoice_id   ON tenant_hostel1.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_payments_status       ON tenant_hostel1.payments (status);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_payments_txn_ref      ON tenant_hostel1.payments (transaction_ref) WHERE transaction_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_payments_meta_gin     ON tenant_hostel1.payments USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_notifs_member_id      ON tenant_hostel1.notifications (member_id);
CREATE INDEX IF NOT EXISTS idx_tenant_hostel1_notifs_type_status    ON tenant_hostel1.notifications (type, status);

-- Triggers for tenant_hostel1
SELECT public.create_updated_at_trigger('tenant_hostel1', 'users');
SELECT public.create_updated_at_trigger('tenant_hostel1', 'members');
SELECT public.create_updated_at_trigger('tenant_hostel1', 'plans');
SELECT public.create_updated_at_trigger('tenant_hostel1', 'subscriptions');
SELECT public.create_updated_at_trigger('tenant_hostel1', 'invoices');
SELECT public.create_updated_at_trigger('tenant_hostel1', 'payments');
SELECT public.create_updated_at_trigger('tenant_hostel1', 'notifications');

ALTER TABLE tenant_hostel1.audit_logs ENABLE ROW LEVEL SECURITY;

-- Hostel1 seed data
INSERT INTO tenant_hostel1.users
  (id, email, full_name, password_hash, role, is_active)
VALUES
  ('00000000-0000-0000-0020-000000000001'::uuid,
   'owner@sunrisehostel.com', 'Hostel Owner',
   '$2b$12$PlaceholderHashForSeedDataDoNotUseInProductionEnviron',
   'Admin', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO tenant_hostel1.members
  (id, full_name, email, phone, status)
VALUES
  ('00000000-0000-0000-0021-000000000001'::uuid,
   'Ravi Kumar', 'ravi@example.com', '+91-9000012345', 'active'),
  ('00000000-0000-0000-0021-000000000002'::uuid,
   'Priya Sharma', 'priya@example.com', '+91-9000098765', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO tenant_hostel1.plans
  (id, name, description, amount_cents, billing_cycle, status)
VALUES
  ('00000000-0000-0000-0022-000000000001'::uuid,
   'Monthly Bed Rent', 'Standard single-room bed for one month.', 600000, 'monthly', 'active'),
  ('00000000-0000-0000-0022-000000000002'::uuid,
   'Yearly Bed Rent', 'Full-year bed with 1-month discount.', 6600000, 'yearly', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO tenant_hostel1.subscriptions
  (id, member_id, plan_id, status, start_date, end_date)
VALUES
  ('00000000-0000-0000-0023-000000000001'::uuid,
   '00000000-0000-0000-0021-000000000001'::uuid,
   '00000000-0000-0000-0022-000000000001'::uuid,
   'active',
   date_trunc('month', CURRENT_DATE)::date,
   (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date)
ON CONFLICT DO NOTHING;

INSERT INTO tenant_hostel1.invoices
  (id, member_id, subscription_id, invoice_number, amount_cents, due_date, status)
VALUES
  ('00000000-0000-0000-0024-000000000001'::uuid,
   '00000000-0000-0000-0021-000000000001'::uuid,
   '00000000-0000-0000-0023-000000000001'::uuid,
   'HOSTEL1-INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-00001',
   600000,
   (date_trunc('month', CURRENT_DATE) + INTERVAL '7 days')::date,
   'pending')
ON CONFLICT (invoice_number) DO NOTHING;


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
-- Summary of objects created:
--
-- PUBLIC SCHEMA
--   Tables   : tenants, platform_plans, tenant_subscriptions,
--              platform_add_ons, platform_invoices, audit_logs
--   Indexes  : 18 indexes on public tables
--   Functions: fn_set_updated_at(), create_updated_at_trigger()
--   Triggers : updated_at auto-maintenance on all mutable tables
--
-- TENANT_DEMO SCHEMA (template / demo gym)
--   Tables   : users, members, plans, subscriptions, invoices,
--              payments, notifications, audit_logs
--   Indexes  : 24 indexes
--   Triggers : updated_at on all mutable tables
--   Seed data: 1 admin, 2 members, 2 plans, 2 subscriptions,
--              2 invoices, 1 payment, 2 notifications, 2 audit rows
--
-- TENANT_HOSTEL1 SCHEMA (second tenant sample)
--   Tables   : same 8 as tenant_demo
--   Indexes  : 15 indexes
--   Triggers : updated_at on all mutable tables
--   Seed data: 1 admin, 2 members, 2 plans, 1 subscription, 1 invoice
-- =============================================================================
