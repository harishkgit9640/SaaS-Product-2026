# FeeAutomate Pricing Model

## Executive Summary

FeeAutomate is a multi-tenant SaaS platform for fee collection, targeting gyms, hostels, coaching centres, and subscription businesses across India. This document defines the complete pricing architecture: tiers, feature limits, trial strategy, add-ons, discounts, Razorpay integration, and upgrade/downgrade flow.

---

## 1. Pricing Tiers

### 1.1 Tier Overview

| Feature | Starter (Free) | Growth | Pro | Enterprise |
|---|---|---|---|---|
| **Monthly Price** | ₹0 | ₹999/mo | ₹2,499/mo | Custom |
| **Yearly Price** | ₹0 | ₹9,990/yr (₹833/mo) | ₹24,990/yr (₹2,083/mo) | Custom |
| **Yearly Discount** | — | ~17% off | ~17% off | Negotiated |
| **Members** | 50 | 500 | 2,000 | Unlimited |
| **Invoices/month** | 100 | 2,000 | 10,000 | Unlimited |
| **Admin Users** | 1 | 3 | 10 | Unlimited |
| **Automation** | Manual only | Basic (auto-invoice, reminders) | Full (auto-invoice, reminders, defaulter detection, receipt gen) | Full + Custom workflows |
| **Analytics** | Basic dashboard | Standard reports + MRR tracking | Advanced analytics + export | Custom BI + API access |
| **Payment Gateway** | Razorpay (2% + ₹3 per txn)* | Razorpay (standard rates) | Razorpay (standard rates) | Negotiated rates |
| **Email Notifications** | 100/mo | 2,000/mo | 10,000/mo | Unlimited |
| **WhatsApp Notifications** | — | — | Add-on | Included |
| **Custom Branding** | — | — | Yes | Yes |
| **API Access** | — | — | Read-only | Full CRUD |
| **Support** | Community / Docs | Email (48hr) | Priority Email (24hr) + Chat | Dedicated Account Manager |
| **Data Retention** | 6 months | 12 months | 24 months | Unlimited |

*Razorpay's standard transaction fee is passed through to the end customer; FeeAutomate does not mark up payment gateway charges.

### 1.2 Pricing Justification (Indian Market Context)

**Starter (₹0):** The free tier is deliberately generous (50 members) to capture micro-businesses — personal trainers, small PGs, tuition teachers — who are currently using spreadsheets or WhatsApp. The goal is adoption and word-of-mouth, not revenue. At 50 members, the cost-to-serve per tenant is negligible (< ₹50/mo infra).

**Growth (₹999/mo):** Priced at the psychological sweet spot for Indian SMBs. Comparable billing/invoicing SaaS in India ranges from ₹299/mo (barebones) to ₹1,999/mo (feature-rich). At ₹999, FeeAutomate positions as a "serious but affordable" solution. The 500-member cap covers 90%+ of small gyms, hostels, and coaching centres. The ₹9,990/yr annual plan (₹833/mo effective) undercuts monthly billing competitors while improving retention.

**Pro (₹2,499/mo):** Targets growing businesses — gym chains with 500–2,000 members, mid-size hostels, or subscription box companies. At this tier, automation and analytics justify the premium. The ₹24,990/yr annual option makes it competitive with enterprise billing tools that charge ₹5,000+/mo.

**Enterprise (Custom):** For businesses with 2,000+ members or specific compliance/integration needs. Custom pricing allows negotiation on volume, SLA, and features. Minimum expected deal size: ₹5,000/mo or ₹50,000/yr.

### 1.3 Competitor-Inspired Positioning

| Positioning Axis | FeeAutomate Strategy |
|---|---|
| **vs. Generic Invoicing Tools** | FeeAutomate is purpose-built for recurring fee collection (gyms, hostels), not general invoicing. Subscription lifecycle, defaulter detection, and member management are first-class features, not afterthoughts. |
| **vs. Expensive Enterprise Billing** | Mid-market billing platforms charge ₹5,000–₹15,000/mo with long sales cycles. FeeAutomate offers self-serve onboarding, pay-as-you-grow pricing, and no lock-in. |
| **vs. Spreadsheet/Manual Processes** | The Starter tier is free, making the switch from spreadsheets zero-risk. Automation features create immediate time savings that justify upgrading. |
| **vs. Payment-Gateway-Bundled Tools** | Some payment gateways bundle basic subscription tools. FeeAutomate offers deeper member management, multi-channel notifications, and analytics that gateway tools lack. |

---

## 2. Free Trial & Freemium Strategy

### 2.1 Recommendation: Freemium + Trial Hybrid

FeeAutomate should use a **freemium model** (permanent Starter tier) combined with a **14-day free trial of the Pro tier** for new sign-ups.

**Rationale:**

- **Freemium for adoption:** Indian SMBs are highly price-sensitive. A permanent free tier removes the #1 barrier to adoption. Once a business has configured their members, plans, and payment flows in FeeAutomate, switching cost is high — driving organic upgrades.
- **Pro trial for conversion:** New tenants get 14 days of Pro features. This lets them experience automation, analytics, and higher limits before being asked to pay. At the end of the trial, they gracefully downgrade to Starter (no disruption) or choose a paid plan.
- **No credit card required for trial:** Reduces sign-up friction. Card is captured only at conversion.

### 2.2 Trial Flow

```
Sign Up → 14-day Pro Trial → Trial Expires
  ├── User selects paid plan → Razorpay subscription created
  └── No action → Auto-downgrade to Starter
       ├── Data preserved (within Starter limits)
       └── Features exceeding Starter limits become read-only
```

### 2.3 Post-Trial Behaviour

- Members beyond the 50-member Starter limit become **read-only** (visible but cannot create invoices for them).
- Existing invoices and payment history are **never deleted**.
- Automations are **paused** (not deleted) so they can resume on upgrade.
- Admin users beyond the 1-admin Starter limit are **deactivated** (can reactivate on upgrade).
- A persistent **in-app banner** nudges upgrade with a summary of what is gated.

---

## 3. Add-Ons

Add-ons are available on Growth and Pro tiers. Enterprise includes everything.

| Add-On | Price | Details |
|---|---|---|
| **Extra Members Pack (100)** | ₹199/mo or ₹1,990/yr | Adds 100 members to the plan limit. Stackable up to 5x on Growth, unlimited on Pro. |
| **WhatsApp Notifications** | ₹499/mo or ₹4,990/yr | Sends invoice reminders, payment receipts, and due-date alerts via WhatsApp Business API. Includes 1,000 messages/mo; ₹0.50 per extra message. |
| **Extra Admin Users (per user)** | ₹149/mo or ₹1,490/yr | Adds 1 admin user beyond the plan limit. |
| **SMS Notifications** | ₹299/mo or ₹2,990/yr | SMS reminders and receipts. Includes 500 SMS/mo; ₹0.30 per extra SMS. |
| **Custom Domain** | ₹199/mo or ₹1,990/yr | Use your own domain for the member portal (e.g., `pay.yourgym.com`). |
| **Priority Support Upgrade** | ₹499/mo | Upgrades Growth plan to priority email + chat support. |

### 3.1 Add-On Billing

- Add-ons follow the same billing cycle as the base plan (monthly or yearly).
- Add-ons can be added or removed mid-cycle; charges are prorated.
- On downgrade, active add-ons that are incompatible with the new tier are cancelled with notice.

---

## 4. Discount Strategy

### 4.1 Annual Billing Discount

- **~17% discount** on annual plans (effectively 2 months free).
- Displayed as: "Save ₹2,000/yr" (Growth) or "Save ₹5,000/yr" (Pro).

### 4.2 Early-Adopter Discount

- First 500 paying tenants get **25% off for life** on their initial plan.
- Implemented as a Razorpay coupon code: `EARLYFEE25`.
- Locked to the plan tier chosen at activation; upgrading resets to standard pricing.

### 4.3 Referral Credits

- Existing tenants earn **₹500 credit** for each referred tenant that converts to a paid plan.
- Referred tenant gets **₹250 off** their first month.
- Credits applied as Razorpay offer/discount on next billing cycle.

### 4.4 Non-Profit / Education Discount

- Verified educational institutions and registered non-profits: **30% off** any paid tier.
- Manual verification process; applied as a permanent coupon.

---

## 5. Razorpay Subscription Integration

### 5.1 Architecture Overview

FeeAutomate uses Razorpay Subscriptions API to manage its **own** billing (platform subscription for each tenant). This is distinct from the existing Razorpay integration that tenants use to collect fees from their members.

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: FeeAutomate Platform Billing                       │
│  (Razorpay Subscriptions API — FeeAutomate is the merchant)  │
│                                                              │
│  Tenants subscribe to FeeAutomate plans (Starter/Growth/Pro) │
│  via Razorpay recurring payments.                            │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: Tenant Fee Collection                              │
│  (Razorpay Orders/Payment Links — Tenant is the sub-merchant)│
│                                                              │
│  Each tenant collects fees from their members via Razorpay.  │
│  (This is the existing integration in the codebase.)         │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Razorpay Plan Creation

Each FeeAutomate pricing tier maps to Razorpay Plan objects:

```
Razorpay Plans (created once, immutable):
├── feeautomate_growth_monthly    → ₹999/mo
├── feeautomate_growth_yearly     → ₹9,990/yr
├── feeautomate_pro_monthly       → ₹2,499/mo
├── feeautomate_pro_yearly        → ₹24,990/yr
└── (Enterprise: custom invoicing, not Razorpay subscriptions)
```

**Razorpay Plan Creation Payload:**

```json
{
  "period": "monthly",
  "interval": 1,
  "item": {
    "name": "FeeAutomate Growth - Monthly",
    "amount": 99900,
    "currency": "INR",
    "description": "Growth plan: 500 members, 3 admins, automation & analytics"
  }
}
```

### 5.3 Subscription Lifecycle

```
Tenant signs up
  → 14-day Pro trial (no Razorpay subscription)
  → Tenant chooses paid plan
    → POST /v1/subscriptions (Razorpay)
      {
        plan_id: "plan_xxxxx",
        total_count: 12,          // 12 months for monthly; 1 for yearly
        quantity: 1,
        customer_notify: 1,
        offer_id: "offer_xxxxx"   // if coupon applied
      }
    → Razorpay returns subscription with short_url
    → Tenant completes payment via short_url or embedded checkout
    → Webhook: subscription.activated → update tenant plan in DB
    → Recurring: Razorpay auto-charges → webhook confirms each cycle
    → subscription.charged → extend access, send receipt
    → subscription.pending → grace period (3 days), notify tenant
    → subscription.halted → downgrade to Starter, notify
    → subscription.cancelled → downgrade to Starter
```

### 5.4 Webhook Events to Handle

| Event | Action |
|---|---|
| `subscription.activated` | Set tenant plan to selected tier; record Razorpay subscription ID |
| `subscription.charged` | Extend plan validity; generate platform receipt |
| `subscription.pending` | Send "payment failed" notification; 3-day grace period |
| `subscription.halted` | Downgrade tenant to Starter; send "plan expired" notification |
| `subscription.cancelled` | Downgrade tenant to Starter at end of current billing period |
| `subscription.updated` | Sync plan tier change (upgrade/downgrade) |

### 5.5 Subscription Metadata

Each Razorpay subscription stores FeeAutomate-specific metadata:

```json
{
  "notes": {
    "tenant_id": "uuid",
    "tenant_code": "mygym",
    "plan_tier": "growth",
    "billing_cycle": "monthly"
  }
}
```

---

## 6. Upgrade / Downgrade Flow

### 6.1 Upgrade Flow

```
Tenant on Growth wants Pro:
  1. Tenant selects "Upgrade to Pro" in billing settings
  2. Backend calculates proration:
     - Unused days on Growth plan → credit
     - Pro plan charge for remaining cycle → debit
     - Net charge = debit - credit
  3. Razorpay subscription updated:
     - Cancel existing Growth subscription (at_cycle_end: false)
     - Create new Pro subscription with prorated first charge
  4. Tenant limits updated immediately in DB
  5. Confirmation email + in-app notification sent
```

**Proration Formula:**

```
daysRemaining = (currentPeriodEnd - today)
dailyRateOld  = oldPlanPrice / daysInCurrentCycle
dailyRateNew  = newPlanPrice / daysInCurrentCycle
credit        = daysRemaining × dailyRateOld
charge        = daysRemaining × dailyRateNew
netCharge     = charge - credit
```

### 6.2 Downgrade Flow

```
Tenant on Pro wants Growth:
  1. Tenant selects "Downgrade to Growth" in billing settings
  2. Backend validates:
     - Current member count ≤ Growth limit (500)?
     - Current admin count ≤ Growth limit (3)?
     - If not: show warning with items that need to be reduced
  3. Downgrade scheduled for end of current billing period:
     - Razorpay subscription cancelled (at_cycle_end: true)
     - New Growth subscription created (starts at next cycle)
  4. During remainder of current period: Pro features remain active
  5. At cycle end:
     - Limits enforced (excess members become read-only)
     - Automations beyond Growth tier are paused
     - Analytics downgraded
  6. Confirmation email sent immediately; reminder 3 days before switch
```

### 6.3 Cancellation Flow

```
Tenant cancels paid plan:
  1. Razorpay subscription cancelled (at_cycle_end: true)
  2. Paid features remain until end of current billing period
  3. At cycle end: auto-downgrade to Starter
  4. All data preserved (within Starter limits)
  5. Re-activation: tenant can re-subscribe at any time
```

### 6.4 Edge Cases

| Scenario | Handling |
|---|---|
| Upgrade during trial | Trial ends immediately; paid plan begins |
| Downgrade during trial | Switch to lower trial (not common); or end trial early |
| Payment failure on upgrade | Upgrade not applied; stay on current plan; notify tenant |
| Mid-cycle add-on changes | Prorated charges via Razorpay |
| Annual-to-monthly switch | Treated as downgrade: takes effect at annual renewal |
| Monthly-to-annual switch | Treated as upgrade: immediate, with credit for remaining monthly period |

---

## 7. Platform Database Schema Additions

To support FeeAutomate's own billing, the **public schema** (not tenant schemas) needs:

```sql
CREATE TABLE public.platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('starter','growth','pro','enterprise')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  name TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  razorpay_plan_id TEXT,
  member_limit INT NOT NULL,
  invoice_limit_monthly INT NOT NULL,
  admin_limit INT NOT NULL,
  email_limit_monthly INT NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('active','inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform_plan_id UUID NOT NULL REFERENCES public.platform_plans(id),
  razorpay_subscription_id TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'trialing','active','pending','halted','cancelled','expired'
  )),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  add_ons JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

CREATE TABLE public.platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_subscription_id UUID REFERENCES public.tenant_subscriptions(id),
  amount_cents BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','paid','failed','refunded')),
  razorpay_payment_id TEXT,
  razorpay_invoice_id TEXT,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_subscriptions_tenant ON public.tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON public.tenant_subscriptions(status);
CREATE INDEX idx_platform_invoices_tenant ON public.platform_invoices(tenant_id);
```

---

## 8. Revenue Projections (Illustrative)

Assuming organic growth over 18 months:

| Month | Free Tenants | Growth | Pro | Enterprise | MRR (₹) |
|---|---|---|---|---|---|
| 1–3 | 200 | 10 | 2 | 0 | ₹14,988 |
| 4–6 | 500 | 40 | 8 | 1 | ₹64,952 |
| 7–12 | 1,200 | 120 | 30 | 3 | ₹2,09,870 |
| 13–18 | 2,500 | 300 | 80 | 8 | ₹5,39,700 |

**Assumptions:**
- ~5% free-to-paid conversion rate (industry average for Indian SaaS: 3–7%)
- 70% of paid tenants choose Growth; 25% choose Pro; 5% Enterprise
- Add-on revenue adds ~15% on top of base subscription revenue
- Annual plan adoption: ~40% (improves cash flow by ~2 months of runway)
- Churn rate: ~5% monthly for Growth; ~3% for Pro; ~1% for Enterprise

---

## 9. Implementation Checklist

- [x] Define pricing tiers and feature limits
- [x] Document Razorpay integration approach
- [x] Design upgrade/downgrade flow
- [x] Define database schema additions
- [ ] Implement `src/config/pricing.ts` — tier definitions and limit constants
- [ ] Implement `src/types/platformSubscription.ts` — TypeScript interfaces
- [ ] Implement `src/services/platformSubscriptionService.ts` — Razorpay plan management
- [ ] Implement `src/services/platformBillingService.ts` — upgrade/downgrade/proration
- [ ] Implement `src/middleware/planLimitEnforcer.ts` — enforce feature limits per tier
- [ ] Add platform webhook handlers for `subscription.*` events
- [ ] Add billing settings UI in frontend
- [ ] Seed Razorpay plans via admin script
- [ ] Write integration tests for billing flows
