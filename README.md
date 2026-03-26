# FeeAutomate

Multi-tenant SaaS platform for automated fee collection — built for gyms, hostels, coaching centres, and subscription businesses.

## Features

**Multi-Tenant Architecture**
- Schema-per-tenant PostgreSQL isolation
- Subdomain and header-based tenant routing
- Per-tenant data, users, and billing

**Member & Subscription Management**
- Member CRUD with status tracking
- Flexible billing plans (monthly / yearly)
- Subscription lifecycle management

**Invoicing & Payments**
- Automated monthly invoice generation
- Razorpay payment gateway integration (orders, payment links, webhooks)
- Payment tracking with receipt generation
- Defaulter detection and overdue management

**Notifications**
- Email notifications via SMTP (invoice alerts, payment reminders, receipts)
- In-app notification system
- WhatsApp notifications (add-on)

**Admin & Member Portals**
- Admin dashboard: MRR, revenue stats, collection rates
- Member management, plan management, invoice management
- Member portal: invoice history, payments, receipt download
- Role-based access control (Admin / Member)

**Background Jobs**
- Monthly invoice generation
- Payment reminders (before, on, and after due date)
- Defaulter detection (30+ day overdue flagging)
- Receipt metadata generation
- Subscription renewal reminders

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express, TypeScript |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Zustand |
| **Database** | PostgreSQL 15+ (schema-per-tenant) |
| **Payments** | Razorpay (Orders, Payment Links, Subscriptions, Webhooks) |
| **Email** | Nodemailer (SMTP) |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **Logging** | Winston + Morgan |
| **Scheduling** | node-cron |

## Quick Start

**Prerequisites:** Node.js >= 20, PostgreSQL >= 15

```bash
# Clone
git clone https://github.com/harishkgit9640/SaaS-Product-2026.git
cd SaaS-Product-2026

# Backend setup
cp .env.example .env           # Edit with your DB/Razorpay/SMTP credentials
npm install
npm run dev                    # Starts on http://localhost:4000

# Frontend setup (in a separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                    # Starts on http://localhost:3000
```

**Database setup:**

```bash
sudo -u postgres psql -c "CREATE DATABASE feeautomate;"
sudo -u postgres psql -d feeautomate -c "CREATE EXTENSION IF NOT EXISTS citext;"
```

**Register your first tenant:**

```bash
curl -X POST http://localhost:4000/api/v1/auth/register-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "My Gym",
    "tenantCode": "mygym",
    "adminName": "Admin",
    "adminEmail": "admin@mygym.com",
    "password": "securepassword123"
  }'
```

Open `http://localhost:3000` and log in.

## API Documentation

**Interactive API docs** are available at `/api-docs` when the server is running:

- **Local:** [http://localhost:4000/api-docs](http://localhost:4000/api-docs)
- **Raw OpenAPI spec:** [http://localhost:4000/api/v1/docs/openapi.json](http://localhost:4000/api/v1/docs/openapi.json)

The Swagger UI lets you explore all endpoints, view request/response schemas, and test API calls directly in the browser.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/health` | — | Health check |
| POST | `/api/v1/auth/register-tenant` | — | Register a new tenant + admin |
| POST | `/api/v1/auth/login` | — | Login (returns JWT tokens) |
| GET | `/api/v1/auth/me` | Bearer | Current user profile |
| GET | `/api/v1/tenant/users` | Bearer + Tenant | List tenant users |
| POST | `/api/v1/members` | Bearer + Tenant | Create member |
| GET | `/api/v1/members` | Bearer + Tenant | List members |
| GET | `/api/v1/members/:id` | Bearer + Tenant | Get member by ID |
| PUT | `/api/v1/members/:id` | Bearer + Tenant | Update member |
| DELETE | `/api/v1/members/:id` | Bearer + Tenant (Admin) | Delete member |
| POST | `/api/v1/plans` | Bearer + Tenant (Admin) | Create plan |
| GET | `/api/v1/plans` | Bearer + Tenant | List plans |
| GET | `/api/v1/plans/:id` | Bearer + Tenant | Get plan by ID |
| PUT | `/api/v1/plans/:id` | Bearer + Tenant (Admin) | Update plan |
| DELETE | `/api/v1/plans/:id` | Bearer + Tenant (Admin) | Delete plan |
| POST | `/api/v1/subscriptions` | Bearer + Tenant | Create subscription |
| GET | `/api/v1/subscriptions` | Bearer + Tenant | List subscriptions |
| GET | `/api/v1/subscriptions/:id` | Bearer + Tenant | Get subscription |
| PUT | `/api/v1/subscriptions/:id` | Bearer + Tenant | Update subscription |
| DELETE | `/api/v1/subscriptions/:id` | Bearer + Tenant (Admin) | Delete subscription |
| POST | `/api/v1/invoices` | Bearer + Tenant (Admin) | Create invoice |
| GET | `/api/v1/invoices` | Bearer + Tenant | List invoices |
| POST | `/api/v1/payments` | Bearer + Tenant (Admin) | Record payment |
| GET | `/api/v1/payments` | Bearer + Tenant | List payments by invoice |
| PATCH | `/api/v1/payments/:id/status` | Bearer + Tenant (Admin) | Update payment status |
| POST | `/api/v1/razorpay/order` | Bearer + Tenant (Admin) | Create Razorpay order |
| POST | `/api/v1/razorpay/payment-link` | Bearer + Tenant (Admin) | Create payment link |
| POST | `/api/v1/webhooks/razorpay` | Signature | Razorpay webhook handler |

**Tenant context:** Pass `x-tenant-id: <tenantCode>` header or use a tenant subdomain.

## Scripts

**Backend** (project root):

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start dev server with hot reload |
| `build` | `npm run build` | Compile TypeScript to `dist/` |
| `start` | `npm start` | Run compiled production server |
| `typecheck` | `npm run typecheck` | Type-check without emitting |
| `lint` | `npm run lint` | Run ESLint |

**Frontend** (`frontend/`):

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Vite dev server on :3000 |
| `build` | `npm run build` | Build for production to `dist/` |
| `preview` | `npm run preview` | Preview production build locally |
| `lint` | `npm run lint` | Run ESLint |

## Environment Variables

See [`.env.example`](.env.example) (backend) and [`frontend/.env.example`](frontend/.env.example) (frontend) for all required variables.

Key variables:

| Variable | Description |
|----------|-------------|
| `DB_*` | PostgreSQL connection (host, port, name, user, password) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay API credentials |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification |
| `SMTP_*` | Email server configuration |
| `CRON_ENABLED` | Enable/disable background jobs |

## Project Structure

```
├── docs/                        # Documentation
│   ├── INSTALLATION.md         #   Full setup & deployment guide
│   └── PRICING_MODEL.md        #   SaaS pricing strategy
├── frontend/                    # React SPA
│   └── src/
│       ├── api/                #   HTTP client modules
│       ├── components/         #   Layout + reusable UI
│       ├── pages/              #   Admin + Member pages
│       ├── stores/             #   Zustand state
│       └── types/              #   TypeScript interfaces
└── src/                         # Express.js backend
    ├── config/                 #   DB, env, pricing config
    ├── controllers/            #   Route handlers
    ├── middleware/              #   Auth, tenant, error, plan limits
    ├── routes/                 #   API route definitions
    ├── services/               #   Business logic
    ├── repositories/           #   Data access (SQL via pg)
    ├── jobs/                   #   Cron job scheduler + services
    ├── notifications/          #   Email/WhatsApp services + templates
    ├── types/                  #   TypeScript types
    └── utils/                  #   JWT, logger, password, HTTP errors
```

## Deployment

See [`docs/INSTALLATION.md`](docs/INSTALLATION.md) for comprehensive deployment instructions covering:

- VPS / AWS EC2 / DigitalOcean with PM2 + Nginx + SSL
- Docker and Docker Compose
- Frontend on Vercel / Netlify / S3 + CloudFront
- Managed PostgreSQL (AWS RDS / Supabase / DigitalOcean)
- Domain setup and multi-tenant subdomain routing
- Production cron jobs, logging, monitoring, and security

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md) | Complete installation, setup, deployment, security, and testing guide |
| [`docs/PRICING_MODEL.md`](docs/PRICING_MODEL.md) | SaaS pricing tiers, Razorpay subscription integration, upgrade/downgrade flows |
| [`frontend/README.md`](frontend/README.md) | Frontend architecture, pages, components, and setup |

## License

This project is private. All rights reserved.
