-- ============================================================================
-- FeeAutomate — Sample Seed Data
-- ============================================================================
--
-- Prerequisites:
--   1. Run database/schema.sql first
--   2. The citext extension must be enabled
--
-- This script:
--   1. Seeds platform plans (FeeAutomate's own SaaS pricing tiers)
--   2. Creates a sample tenant "mygym"
--   3. Provisions the tenant schema using the provision_tenant_schema() function
--   4. Creates a sample admin user, members, plans, subscriptions, invoices,
--      payments, and notifications inside the tenant schema
--
-- Password for all sample users: "password123"
-- bcrypt hash generated with 12 salt rounds
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PLATFORM PLANS (FeeAutomate SaaS Tiers)
-- ============================================================================

INSERT INTO public.platform_plans (tier, billing_cycle, name, description, amount_cents, member_limit, invoice_limit_monthly, admin_limit, email_limit_monthly, features, status)
VALUES
    -- Starter (Free)
    ('starter', 'monthly', 'Starter - Monthly', 'Perfect for solo operators and micro-businesses.', 0, 50, 100, 1, 100,
     '{"autoInvoicing": false, "paymentReminders": false, "defaulterDetection": false, "receiptGeneration": false, "customWorkflows": false, "analyticsLevel": "basic", "customBranding": false, "apiAccess": "none", "whatsappNotifications": "none", "prioritySupport": false}'::jsonb, 'active'),

    ('starter', 'yearly', 'Starter - Yearly', 'Perfect for solo operators and micro-businesses.', 0, 50, 100, 1, 100,
     '{"autoInvoicing": false, "paymentReminders": false, "defaulterDetection": false, "receiptGeneration": false, "customWorkflows": false, "analyticsLevel": "basic", "customBranding": false, "apiAccess": "none", "whatsappNotifications": "none", "prioritySupport": false}'::jsonb, 'active'),

    -- Growth
    ('growth', 'monthly', 'Growth - Monthly', 'For growing businesses that need automation and deeper insights.', 99900, 500, 2000, 3, 2000,
     '{"autoInvoicing": true, "paymentReminders": true, "defaulterDetection": false, "receiptGeneration": false, "customWorkflows": false, "analyticsLevel": "standard", "customBranding": false, "apiAccess": "none", "whatsappNotifications": "none", "prioritySupport": false}'::jsonb, 'active'),

    ('growth', 'yearly', 'Growth - Yearly', 'For growing businesses that need automation and deeper insights.', 999000, 500, 2000, 3, 2000,
     '{"autoInvoicing": true, "paymentReminders": true, "defaulterDetection": false, "receiptGeneration": false, "customWorkflows": false, "analyticsLevel": "standard", "customBranding": false, "apiAccess": "none", "whatsappNotifications": "none", "prioritySupport": false}'::jsonb, 'active'),

    -- Pro
    ('pro', 'monthly', 'Pro - Monthly', 'Full-featured plan for established businesses.', 249900, 2000, 10000, 10, 10000,
     '{"autoInvoicing": true, "paymentReminders": true, "defaulterDetection": true, "receiptGeneration": true, "customWorkflows": false, "analyticsLevel": "advanced", "customBranding": true, "apiAccess": "readonly", "whatsappNotifications": "addon", "prioritySupport": true}'::jsonb, 'active'),

    ('pro', 'yearly', 'Pro - Yearly', 'Full-featured plan for established businesses.', 2499000, 2000, 10000, 10, 10000,
     '{"autoInvoicing": true, "paymentReminders": true, "defaulterDetection": true, "receiptGeneration": true, "customWorkflows": false, "analyticsLevel": "advanced", "customBranding": true, "apiAccess": "readonly", "whatsappNotifications": "addon", "prioritySupport": true}'::jsonb, 'active'),

    -- Enterprise
    ('enterprise', 'monthly', 'Enterprise - Monthly', 'Custom solution for large organisations.', 0, 2147483647, 2147483647, 2147483647, 2147483647,
     '{"autoInvoicing": true, "paymentReminders": true, "defaulterDetection": true, "receiptGeneration": true, "customWorkflows": true, "analyticsLevel": "custom", "customBranding": true, "apiAccess": "full", "whatsappNotifications": "included", "prioritySupport": true}'::jsonb, 'active'),

    ('enterprise', 'yearly', 'Enterprise - Yearly', 'Custom solution for large organisations.', 0, 2147483647, 2147483647, 2147483647, 2147483647,
     '{"autoInvoicing": true, "paymentReminders": true, "defaulterDetection": true, "receiptGeneration": true, "customWorkflows": true, "analyticsLevel": "custom", "customBranding": true, "apiAccess": "full", "whatsappNotifications": "included", "prioritySupport": true}'::jsonb, 'active')

ON CONFLICT (tier, billing_cycle) DO NOTHING;


-- ============================================================================
-- 2. SAMPLE TENANT
-- ============================================================================

INSERT INTO public.tenants (id, tenant_code, name, schema_name, contact_email, billing_email, status)
VALUES (
    'a0000000-0000-4000-8000-000000000001',
    'mygym',
    'My Gym',
    'tenant_mygym',
    'admin@mygym.com',
    'admin@mygym.com',
    'active'
)
ON CONFLICT (tenant_code) DO NOTHING;

-- Subscribe the sample tenant to Growth monthly
INSERT INTO public.tenant_subscriptions (tenant_id, platform_plan_id, status)
SELECT
    'a0000000-0000-4000-8000-000000000001',
    pp.id,
    'active'
FROM public.platform_plans pp
WHERE pp.tier = 'growth' AND pp.billing_cycle = 'monthly'
ON CONFLICT (tenant_id) DO NOTHING;


-- ============================================================================
-- 3. PROVISION TENANT SCHEMA
-- ============================================================================

SELECT public.provision_tenant_schema('tenant_mygym');


-- ============================================================================
-- 4. SAMPLE ADMIN USER
-- ============================================================================
-- Password: password123
-- bcrypt hash ($2b$12$...) for "password123" with 12 rounds

INSERT INTO tenant_mygym.users (id, email, full_name, password_hash, role, is_active)
VALUES (
    'b0000000-0000-4000-8000-000000000001',
    'admin@mygym.com',
    'Admin User',
    '$2b$12$LJ3m4ys3Lk0TSwMCKf6JXuPVHhGInMVsFnwKOaHW.wSsCpbxu7Hhe',
    'Admin',
    TRUE
)
ON CONFLICT (email) DO NOTHING;


-- ============================================================================
-- 5. SAMPLE MEMBERS
-- ============================================================================

INSERT INTO tenant_mygym.members (id, full_name, email, status)
VALUES
    ('c0000000-0000-4000-8000-000000000001', 'Rahul Sharma',  'rahul@example.com',  'active'),
    ('c0000000-0000-4000-8000-000000000002', 'Priya Patel',   'priya@example.com',  'active'),
    ('c0000000-0000-4000-8000-000000000003', 'Amit Verma',    'amit@example.com',   'active'),
    ('c0000000-0000-4000-8000-000000000004', 'Sneha Gupta',   'sneha@example.com',  'active'),
    ('c0000000-0000-4000-8000-000000000005', 'Vikram Singh',  'vikram@example.com', 'inactive')
ON CONFLICT (email) DO NOTHING;


-- ============================================================================
-- 6. SAMPLE PLANS (tenant's own billing plans for their members)
-- ============================================================================

INSERT INTO tenant_mygym.plans (id, name, description, amount_cents, billing_cycle, status)
VALUES
    ('d0000000-0000-4000-8000-000000000001', 'Monthly Basic',   'Basic gym access — cardio and weights',                   99900,  'monthly', 'active'),
    ('d0000000-0000-4000-8000-000000000002', 'Monthly Premium', 'Premium gym access — all equipment + group classes',       199900, 'monthly', 'active'),
    ('d0000000-0000-4000-8000-000000000003', 'Yearly Basic',    'Basic gym access — full year (2 months free)',             999000, 'yearly',  'active'),
    ('d0000000-0000-4000-8000-000000000004', 'Personal Training', 'One-on-one personal training sessions — 12 per month',  499900, 'monthly', 'active')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 7. SAMPLE SUBSCRIPTIONS
-- ============================================================================

INSERT INTO tenant_mygym.subscriptions (id, member_id, plan_id, status, start_date, end_date)
VALUES
    ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'active',  '2026-01-01', '2026-12-31'),
    ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'active',  '2026-02-01', '2026-07-31'),
    ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'active',  '2026-01-01', '2027-01-01'),
    ('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'active',  '2026-03-01', NULL),
    ('e0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'canceled','2025-06-01', '2025-12-31')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 8. SAMPLE INVOICES
-- ============================================================================

INSERT INTO tenant_mygym.invoices (id, member_id, subscription_id, invoice_number, amount_cents, due_date, status, paid_at)
VALUES
    -- Rahul — paid invoices
    ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
     'MYGYM-INV-202601-00001', 99900, '2026-01-08', 'paid', '2026-01-05 10:30:00+05:30'),
    ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
     'MYGYM-INV-202602-00001', 99900, '2026-02-08', 'paid', '2026-02-06 14:15:00+05:30'),
    ('f0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
     'MYGYM-INV-202603-00001', 99900, '2026-03-08', 'pending', NULL),

    -- Priya — paid + pending
    ('f0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002',
     'MYGYM-INV-202602-00002', 199900, '2026-02-08', 'paid', '2026-02-07 09:00:00+05:30'),
    ('f0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002',
     'MYGYM-INV-202603-00002', 199900, '2026-03-08', 'pending', NULL),

    -- Amit — yearly (single large invoice)
    ('f0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003',
     'MYGYM-INV-202601-00002', 999000, '2026-01-08', 'paid', '2026-01-03 16:45:00+05:30'),

    -- Sneha — overdue
    ('f0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004',
     'MYGYM-INV-202603-00003', 99900, '2026-03-08', 'overdue', NULL)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 9. SAMPLE PAYMENTS
-- ============================================================================

INSERT INTO tenant_mygym.payments (id, invoice_id, amount_cents, method, status, transaction_ref, metadata, paid_at)
VALUES
    -- Rahul's Jan payment (Razorpay)
    ('10000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 99900, 'razorpay', 'paid',
     'order_SampleOrder001',
     '{"gateway": "razorpay", "orderId": "order_SampleOrder001", "razorpayPaymentId": "pay_SamplePay001", "receiptGeneratedAt": "2026-01-05T11:00:00Z", "receiptNumber": "MYGYM-RCT-202601-f0000000"}'::jsonb,
     '2026-01-05 10:30:00+05:30'),

    -- Rahul's Feb payment (Razorpay)
    ('10000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 99900, 'razorpay', 'paid',
     'order_SampleOrder002',
     '{"gateway": "razorpay", "orderId": "order_SampleOrder002", "razorpayPaymentId": "pay_SamplePay002", "receiptGeneratedAt": "2026-02-06T15:00:00Z", "receiptNumber": "MYGYM-RCT-202602-f0000000"}'::jsonb,
     '2026-02-06 14:15:00+05:30'),

    -- Priya's payment (cash)
    ('10000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000004', 199900, 'cash', 'paid',
     NULL,
     '{"receiptGeneratedAt": "2026-02-07T10:00:00Z", "receiptNumber": "MYGYM-RCT-202602-f0000004"}'::jsonb,
     '2026-02-07 09:00:00+05:30'),

    -- Amit's yearly payment (Razorpay payment link)
    ('10000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000006', 999000, 'razorpay', 'paid',
     'plink_SampleLink001',
     '{"gateway": "razorpay", "paymentLinkId": "plink_SampleLink001", "createdFor": "payment_link", "shortUrl": "https://rzp.io/i/sample", "razorpayPaymentId": "pay_SamplePay003"}'::jsonb,
     '2026-01-03 16:45:00+05:30')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 10. SAMPLE NOTIFICATIONS
-- ============================================================================

INSERT INTO tenant_mygym.notifications (member_id, type, channel, message, status, metadata)
VALUES
    -- Payment reminder for Sneha (overdue)
    ('c0000000-0000-4000-8000-000000000004', 'payment_reminder_after_due', 'in_app',
     'Invoice MYGYM-INV-202603-00003 is overdue. Please pay immediately.', 'sent',
     '{"invoiceId": "f0000000-0000-4000-8000-000000000007", "stage": "after_due"}'::jsonb),

    -- Defaulter notification for Sneha
    ('c0000000-0000-4000-8000-000000000004', 'defaulter_detected', 'in_app',
     'Member marked as defaulter due to overdue invoice MYGYM-INV-202603-00003', 'pending',
     '{"invoiceId": "f0000000-0000-4000-8000-000000000007", "daysOverdue": 18}'::jsonb),

    -- Subscription renewal reminder for Priya
    ('c0000000-0000-4000-8000-000000000002', 'subscription_renewal_reminder', 'in_app',
     'Your subscription will renew in 7 days', 'sent',
     '{"subscriptionId": "e0000000-0000-4000-8000-000000000002", "renewalDate": "2026-07-31"}'::jsonb),

    -- Payment reminder for Rahul (upcoming March)
    ('c0000000-0000-4000-8000-000000000001', 'payment_reminder_before_due', 'in_app',
     'Reminder: Invoice MYGYM-INV-202603-00001 is due on 2026-03-08', 'sent',
     '{"invoiceId": "f0000000-0000-4000-8000-000000000003", "stage": "before_due"}'::jsonb);


-- ============================================================================
-- 11. SAMPLE AUDIT LOG ENTRIES
-- ============================================================================

INSERT INTO tenant_mygym.audit_logs (user_id, action, resource, resource_id, new_values)
VALUES
    ('b0000000-0000-4000-8000-000000000001', 'member.created', 'member', 'c0000000-0000-4000-8000-000000000001',
     '{"fullName": "Rahul Sharma", "email": "rahul@example.com"}'::jsonb),
    ('b0000000-0000-4000-8000-000000000001', 'plan.created', 'plan', 'd0000000-0000-4000-8000-000000000001',
     '{"name": "Monthly Basic", "amountCents": 99900}'::jsonb),
    ('b0000000-0000-4000-8000-000000000001', 'invoice.created', 'invoice', 'f0000000-0000-4000-8000-000000000001',
     '{"invoiceNumber": "MYGYM-INV-202601-00001", "amountCents": 99900}'::jsonb),
    ('b0000000-0000-4000-8000-000000000001', 'payment.status_updated', 'payment', '10000000-0000-4000-8000-000000000001',
     '{"status": "paid", "method": "razorpay"}'::jsonb);

-- Platform-level audit
INSERT INTO public.platform_audit_logs (tenant_id, actor_id, actor_role, action, resource, resource_id, details)
VALUES
    ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Admin',
     'tenant.registered', 'tenant', 'a0000000-0000-4000-8000-000000000001',
     '{"tenantCode": "mygym", "businessName": "My Gym"}'::jsonb);


COMMIT;
