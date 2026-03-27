# FeeAutomate — Installation & Deployment Guide

Complete guide to set up, run, and deploy FeeAutomate in development and production environments.

**Audience:** Developers, DevOps engineers, startup founders.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Database Setup](#3-database-setup)
4. [Environment Variables Reference](#4-environment-variables-reference)
5. [Razorpay Setup](#5-razorpay-setup)
6. [Email (SMTP) Setup](#6-email-smtp-setup)
7. [Running Cron Jobs Locally](#7-running-cron-jobs-locally)
8. [Production Deployment — Backend](#8-production-deployment--backend)
9. [Production Deployment — Frontend](#9-production-deployment--frontend)
10. [Production Deployment — Database](#10-production-deployment--database)
11. [Domain & Multi-Tenant Setup](#11-domain--multi-tenant-setup)
12. [Cron Jobs in Production](#12-cron-jobs-in-production)
13. [Logging & Monitoring](#13-logging--monitoring)
14. [Security Best Practices](#14-security-best-practices)
15. [Testing](#15-testing)
16. [Project Structure Overview](#16-project-structure-overview)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Prerequisites

Install these before starting:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | >= 20.0.0 | Runtime for backend and frontend build |
| **npm** | >= 10.x (ships with Node 20) | Package manager |
| **PostgreSQL** | >= 15.x | Primary database |
| **Git** | >= 2.x | Version control |

**Optional but recommended:**

| Tool | Purpose |
|------|---------|
| **ngrok** | Expose local server for Razorpay webhooks |
| **Postman** | API testing |
| **PM2** | Process manager for production |
| **Docker** | Containerized deployment |
| **Nginx** | Reverse proxy for production |

**Verify installations:**

```bash
node --version    # Should print v20.x.x or higher
npm --version     # Should print 10.x.x or higher
psql --version    # Should print psql (PostgreSQL) 15.x or higher
git --version     # Should print git version 2.x.x
```

---

## 2. Local Development Setup

### 2.1 Clone the Repository

```bash
git clone https://github.com/harishkgit9640/SaaS-Product-2026.git
cd SaaS-Product-2026
```

### 2.2 Install Backend Dependencies

From the project root:

```bash
npm install
```

### 2.3 Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 2.4 Configure Environment Variables

**Backend** — create `.env` in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your actual values (see [Section 4](#4-environment-variables-reference) for details).

**Frontend** — create `.env` in the `frontend/` directory:

```bash
cp frontend/.env.example frontend/.env
```

The defaults work for local development — the Vite dev server proxies `/api` to `http://localhost:4000`.

### 2.5 Set Up the Database

Follow [Section 3](#3-database-setup) to create the PostgreSQL database.

### 2.6 Start the Backend Server

```bash
npm run dev
```

This starts the Express server on `http://localhost:4000` using `tsx watch` (auto-restarts on file changes).

**Verify it's running:**

```bash
curl http://localhost:4000/api/v1/health
# Expected: {"success":true,"data":{"service":"feeautomate-backend","status":"ok"}}
```

**Browse the API docs:**

Open [http://localhost:4000/api-docs](http://localhost:4000/api-docs) in your browser to access the interactive Swagger UI with all endpoints documented.

The raw OpenAPI 3.0 JSON spec is available at `http://localhost:4000/api/v1/docs/openapi.json` (useful for importing into Postman or generating client SDKs).

### 2.7 Start the Frontend App

In a separate terminal:

```bash
cd frontend
npm run dev
```

The React app starts at `http://localhost:3000`. API calls are automatically proxied to the backend via the Vite dev server.

### 2.8 Register Your First Tenant

```bash
curl -X POST http://localhost:4000/api/v1/auth/register-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "My Gym",
    "tenantCode": "mygym",
    "adminName": "Admin User",
    "adminEmail": "admin@mygym.com",
    "password": "securepassword123"
  }'
```

This creates:
- A tenant record in the `public.tenants` table
- A PostgreSQL schema `tenant_mygym` with all domain tables
- An admin user in `tenant_mygym.users`

You can now log in via the frontend at `http://localhost:3000`.

---

## 3. Database Setup

### 3.1 Install PostgreSQL

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**

```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:**

Download the installer from [postgresql.org/download](https://www.postgresql.org/download/windows/) and follow the setup wizard.

### 3.2 Create the Database

```bash
# Switch to the postgres system user (Linux)
sudo -u postgres psql

# Or connect directly (macOS/Windows)
psql -U postgres
```

Inside the PostgreSQL shell:

```sql
-- Create the database
CREATE DATABASE feeautomate;
\q
```

### 3.3 Run the Schema Script

The complete schema is defined in `database/schema.sql`. Run it to create all public tables, the tenant provisioning function, triggers, and indexes:

```bash
psql -U postgres -d feeautomate -f database/schema.sql
```

This creates:
- `citext` and `pgcrypto` extensions
- `public.tenants` — tenant registry
- `public.platform_plans` — FeeAutomate SaaS pricing tiers
- `public.tenant_subscriptions` — tenant billing state
- `public.platform_invoices` — platform billing records
- `public.platform_audit_logs` — platform audit trail
- `provision_tenant_schema()` function — creates all per-tenant tables
- `set_updated_at()` trigger function — auto-updates `updated_at` columns

### 3.4 Seed Sample Data (Optional)

Load the sample dataset with a demo tenant, members, plans, invoices, and payments:

```bash
psql -U postgres -d feeautomate -f database/seed.sql
```

This creates:
- Platform plans for all 4 tiers (Starter, Growth, Pro, Enterprise)
- A demo tenant `mygym` with schema `tenant_mygym`
- An admin user (`admin@mygym.com` / `password123`)
- 5 sample members, 4 plans, 5 subscriptions
- 7 invoices (mix of paid, pending, overdue)
- 4 payments (Razorpay and cash)
- Notifications and audit log entries

After seeding, you can log in at `http://localhost:3000` with:
- **Tenant Code:** `mygym`
- **Email:** `admin@mygym.com`
- **Password:** `password123`

### 3.5 Schema-Per-Tenant Architecture

FeeAutomate uses **schema-per-tenant** isolation:

```
PostgreSQL Database: feeautomate
├── public schema
│   ├── tenants                 (tenant registry)
│   ├── platform_plans          (SaaS pricing tiers)
│   ├── tenant_subscriptions    (tenant billing state)
│   ├── platform_invoices       (platform billing records)
│   └── platform_audit_logs     (platform audit trail)
├── tenant_mygym schema
│   ├── users                   (admin + member login accounts)
│   ├── members                 (people being billed)
│   ├── plans                   (billing plans offered by tenant)
│   ├── subscriptions           (member → plan assignments)
│   ├── invoices                (bills to members)
│   ├── payments                (payment records + gateway data)
│   ├── notifications           (in-app + email alerts)
│   └── audit_logs              (per-tenant admin action trail)
├── tenant_anothergym schema
│   └── ... (same tables, fully isolated)
└── ...
```

**You do NOT need to create tenant schemas manually.** They are created automatically when a tenant registers via the `POST /api/v1/auth/register-tenant` endpoint. The registration flow:

1. Creates the tenant record in `public.tenants`
2. Calls `provision_tenant_schema()` to create all per-tenant tables
3. Creates the first admin user

The full SQL definitions are in [`database/schema.sql`](../database/schema.sql).

---

## 4. Environment Variables Reference

### 4.1 Backend `.env`

Create this file at the project root (`/.env`):

```env
# ─── Application ─────────────────────────────────────────────
NODE_ENV=development          # development | production
PORT=4000                     # Backend HTTP port
BCRYPT_SALT_ROUNDS=12         # Password hashing rounds (12 is recommended)
CRON_ENABLED=true             # Enable/disable background cron jobs

# ─── Database ────────────────────────────────────────────────
DB_HOST=localhost             # PostgreSQL host
DB_PORT=5432                  # PostgreSQL port
DB_NAME=feeautomate           # Database name
DB_USER=postgres              # Database user
DB_PASSWORD=postgres          # Database password
DB_SSL=false                  # true for production (AWS RDS, Supabase, etc.)

# ─── JWT Authentication ─────────────────────────────────────
JWT_ACCESS_SECRET=your-access-secret-min-32-chars-random
JWT_ACCESS_EXPIRES_IN=15m     # Access token lifetime
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-random
JWT_REFRESH_EXPIRES_IN=7d     # Refresh token lifetime

# ─── Razorpay Payment Gateway ───────────────────────────────
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret

# ─── Email Notifications ────────────────────────────────────
EMAIL_ENABLED=true            # Set false to disable all email sending
SMTP_HOST=smtp.gmail.com      # SMTP server host
SMTP_PORT=587                 # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false             # true for port 465, false for 587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password   # Gmail App Password (NOT your Google password)
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=FeeAutomate    # Display name in sent emails
```

**Generate strong JWT secrets:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run this twice — once for `JWT_ACCESS_SECRET` and once for `JWT_REFRESH_SECRET`.

### 4.2 Frontend `.env`

Create this file at `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
VITE_APP_NAME=FeeAutomate
```

**For production:**

```env
VITE_API_BASE_URL=https://api.feeautomate.com/api/v1
VITE_APP_NAME=FeeAutomate
```

---

## 5. Razorpay Setup

### 5.1 Create a Razorpay Account

1. Go to [razorpay.com](https://razorpay.com) and sign up
2. Complete KYC verification (required for live mode; test mode works immediately)
3. Navigate to **Settings → API Keys**

### 5.2 Get API Keys

1. In the Razorpay Dashboard, go to **Settings → API Keys → Generate Key**
2. Copy:
   - **Key ID** → `RAZORPAY_KEY_ID` (starts with `rzp_test_` in test mode, `rzp_live_` in production)
   - **Key Secret** → `RAZORPAY_KEY_SECRET` (shown only once — save it securely)

### 5.3 Set Up Webhook URL

Razorpay sends webhook events when payments are captured/failed. FeeAutomate handles these at:

```
POST /api/v1/webhooks/razorpay
```

**In the Razorpay Dashboard:**

1. Go to **Settings → Webhooks → Add New Webhook**
2. Set the webhook URL:
   - **Local dev (via ngrok):** `https://your-ngrok-url.ngrok-free.app/api/v1/webhooks/razorpay`
   - **Production:** `https://api.feeautomate.com/api/v1/webhooks/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.pending`
   - `subscription.halted`
   - `subscription.cancelled`
4. Enter a **Webhook Secret** and copy it → `RAZORPAY_WEBHOOK_SECRET`
5. Click **Create Webhook**

### 5.4 Test Payments Locally with ngrok

ngrok creates a public tunnel to your local server:

```bash
# Install ngrok (if not installed)
npm install -g ngrok
# or: brew install ngrok (macOS)
# or download from https://ngrok.com/download

# Start your backend server first
npm run dev

# In another terminal, create the tunnel
ngrok http 4000
```

ngrok will display a URL like `https://abc123.ngrok-free.app`. Use this as your webhook URL in the Razorpay Dashboard.

**Test a payment flow:**

1. Create a tenant and log in
2. Create a plan, member, subscription, and invoice via the API or UI
3. Create a Razorpay order:

```bash
curl -X POST http://localhost:4000/api/v1/razorpay/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: mygym" \
  -d '{"invoiceId":"<invoice-id>"}'
```

4. Use the returned `orderId` with the [Razorpay test cards](https://razorpay.com/docs/payments/payments/test-card-upi-details/) to simulate payment
5. Check your terminal logs — the webhook should fire and update the invoice to `paid`

---

## 6. Email (SMTP) Setup

### 6.1 Gmail SMTP (Recommended for Development)

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. **Prerequisite:** You must have 2-Step Verification enabled on your Google account
3. Select **Mail** as the app and your device type
4. Click **Generate** — Google will show a 16-character app password
5. Use this password as `SMTP_PASS` in your `.env` (NOT your regular Google password)

**`.env` for Gmail:**

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=FeeAutomate
```

### 6.2 Alternative Free SMTP Providers

| Provider | SMTP Host | Port | Free Tier |
|----------|-----------|------|-----------|
| **Brevo (formerly Sendinblue)** | smtp-relay.brevo.com | 587 | 300 emails/day |
| **Mailgun** | smtp.mailgun.org | 587 | 100 emails/day (sandbox) |
| **Mailtrap** | sandbox.smtp.mailtrap.io | 587 | Test inbox (no real delivery) |

For **Mailtrap** (best for development — catches emails without sending):

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
```

### 6.3 Test Email Sending

After configuring SMTP:

1. Register a tenant with a real email address
2. Create a member with a real email
3. Create an invoice for that member — FeeAutomate sends an invoice notification email
4. Check the member's inbox (or Mailtrap inbox)

To disable email entirely during development:

```env
EMAIL_ENABLED=false
```

---

## 7. Running Cron Jobs Locally

Cron jobs start automatically when the backend server starts (if `CRON_ENABLED=true`).

**Five scheduled jobs run:**

| Schedule | Job | What It Does |
|----------|-----|-------------|
| `0 0 1 * *` (1st of month, midnight UTC) | Monthly Invoice Generation | Creates invoices for all active subscriptions |
| `0 9 * * *` (daily at 09:00 UTC) | Payment Reminders | Sends in-app + email reminders around due dates |
| `30 1 * * *` (daily at 01:30 UTC) | Defaulter Detection | Marks overdue invoices; flags 30+ day defaulters |
| `0 * * * *` (every hour) | Receipt Generation | Generates receipt metadata for paid payments |
| `0 8 * * *` (daily at 08:00 UTC) | Subscription Renewal Reminder | Notifies members 7 days before subscription ends |

**To test a cron job immediately** without waiting for its schedule, temporarily change the cron expression in `src/jobs/jobScheduler.ts`:

```typescript
// Change a daily job to run every minute for testing:
cron.schedule("* * * * *", () => {
  // ...
});
```

**To disable cron jobs:**

```env
CRON_ENABLED=false
```

---

## 8. Production Deployment — Backend

### 8.1 Option A: VPS / EC2 / DigitalOcean with PM2

**1. Provision a server:**

- Ubuntu 22.04+ recommended
- Minimum: 1 vCPU, 1 GB RAM, 25 GB SSD
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

**2. Install Node.js:**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version
```

**3. Install PM2:**

```bash
sudo npm install -g pm2
```

**4. Clone and build:**

```bash
cd /var/www
git clone https://github.com/harishkgit9640/SaaS-Product-2026.git feeautomate
cd feeautomate
npm install --production=false  # Need devDependencies for tsc
npm run build                   # Compiles TypeScript → dist/
```

**5. Configure environment:**

```bash
cp .env.example .env
nano .env
# Set NODE_ENV=production and all production values
```

**6. Start with PM2:**

```bash
pm2 start dist/server.js --name feeautomate-api \
  --max-memory-restart 512M \
  --log /var/log/feeautomate/api.log \
  --time

# Save the process list so PM2 restarts on reboot
pm2 save

# Set PM2 to start on system boot
pm2 startup
# (Follow the instructions PM2 prints)
```

**7. Verify:**

```bash
pm2 status
curl http://localhost:4000/api/v1/health
```

### 8.2 Option B: Docker

**Create `Dockerfile` at the project root:**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4000
USER node
CMD ["node", "dist/server.js"]
```

**Create `docker-compose.yml`:**

```yaml
version: "3.8"

services:
  api:
    build: .
    ports:
      - "4000:4000"
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: feeautomate
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

**Create `init-db.sql`:**

```sql
CREATE EXTENSION IF NOT EXISTS citext;
```

**Run:**

```bash
docker compose up -d
docker compose logs -f api
```

### 8.3 Nginx Reverse Proxy

Install Nginx:

```bash
sudo apt install -y nginx
```

Create `/etc/nginx/sites-available/feeautomate-api`:

```nginx
server {
    listen 80;
    server_name api.feeautomate.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/feeautomate-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8.4 HTTPS with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.feeautomate.com

# Auto-renewal is set up automatically. Test it:
sudo certbot renew --dry-run
```

---

## 9. Production Deployment — Frontend

### 9.1 Build the React App

```bash
cd frontend
npm run build
```

This outputs optimized static files to `frontend/dist/`.

### 9.2 Option A: Deploy on Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Set the configuration:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variables:
   - `VITE_API_BASE_URL` = `https://api.feeautomate.com/api/v1`
   - `VITE_APP_NAME` = `FeeAutomate`
5. Deploy

**For automatic deployments:** Vercel redeploys on every push to `main`.

### 9.3 Option B: Deploy on Netlify

1. Go to [netlify.com](https://netlify.com) and import your GitHub repo
2. Settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
3. Add environment variables (same as Vercel)
4. Add a `frontend/_redirects` file for SPA routing:

```
/*    /index.html   200
```

### 9.4 Option C: Serve via Nginx (Same Server as Backend)

```bash
# Copy build output to the server
scp -r frontend/dist/* user@your-server:/var/www/feeautomate-frontend/
```

Nginx config at `/etc/nginx/sites-available/feeautomate-frontend`:

```nginx
server {
    listen 80;
    server_name app.feeautomate.com;

    root /var/www/feeautomate-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable, test, and add SSL:

```bash
sudo ln -s /etc/nginx/sites-available/feeautomate-frontend /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d app.feeautomate.com
```

### 9.5 Option D: AWS S3 + CloudFront

```bash
# Create S3 bucket
aws s3 mb s3://feeautomate-frontend

# Sync build output
aws s3 sync frontend/dist/ s3://feeautomate-frontend --delete

# Enable static website hosting
aws s3 website s3://feeautomate-frontend --index-document index.html --error-document index.html
```

Then create a CloudFront distribution pointing to the S3 bucket for HTTPS and CDN caching.

---

## 10. Production Deployment — Database

### 10.1 Option A: AWS RDS (PostgreSQL)

1. In the AWS Console, go to **RDS → Create Database**
2. Settings:
   - Engine: PostgreSQL 15
   - Instance: `db.t3.micro` (free tier) or `db.t3.small` (production)
   - Storage: 20 GB GP3 with auto-scaling
   - Multi-AZ: Enable for production
3. After creation, note the **endpoint**, **port**, **username**, and **password**
4. Connect and set up:

```bash
psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d postgres
```

```sql
CREATE DATABASE feeautomate;
\c feeautomate
CREATE EXTENSION IF NOT EXISTS citext;
```

5. Update your backend `.env`:

```env
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=feeautomate
DB_USER=postgres
DB_PASSWORD=your-rds-password
DB_SSL=true
```

### 10.2 Option B: Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database**
3. Copy the connection details (host, port, user, password)
4. Enable the `citext` extension via the SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS citext;
```

5. Update your backend `.env` with the Supabase connection details and `DB_SSL=true`

### 10.3 Option C: DigitalOcean Managed Database

1. In the DigitalOcean panel, create a **Managed PostgreSQL** cluster
2. Choose a plan (Basic $15/mo is sufficient for starting)
3. Copy the connection details from the dashboard
4. Connect and create the database:

```bash
psql "postgresql://doadmin:password@host:25060/defaultdb?sslmode=require"
```

```sql
CREATE DATABASE feeautomate;
\c feeautomate
CREATE EXTENSION IF NOT EXISTS citext;
```

### 10.4 Database Backups

For any managed database, enable automated backups. For self-hosted PostgreSQL:

```bash
# Daily backup via cron
pg_dump -h localhost -U postgres feeautomate | gzip > /backups/feeautomate_$(date +%Y%m%d).sql.gz

# Add to crontab:
0 2 * * * pg_dump -h localhost -U postgres feeautomate | gzip > /backups/feeautomate_$(date +\%Y\%m\%d).sql.gz
```

---

## 11. Domain & Multi-Tenant Setup

### 11.1 Domain Configuration

| Subdomain | Points To | Purpose |
|-----------|-----------|---------|
| `api.feeautomate.com` | Backend server IP | REST API |
| `app.feeautomate.com` | Frontend (Vercel/Nginx/CDN) | Admin & Member UI |
| `*.feeautomate.com` | Backend or frontend | Tenant-specific routing |

**DNS Records (in your domain registrar):**

```
A     api.feeautomate.com    → 123.45.67.89
A     app.feeautomate.com    → 123.45.67.89  (or CNAME to Vercel)
A     *.feeautomate.com      → 123.45.67.89
```

### 11.2 Multi-Tenant Routing

FeeAutomate resolves tenants in two ways:

1. **HTTP header** (`x-tenant-id`): Used by the frontend — the Axios client sends this header with every request.
2. **Subdomain**: e.g., `mygym.feeautomate.com` — the `tenantResolverMiddleware` extracts the first segment of the hostname.

The subdomain approach requires a **wildcard SSL certificate**:

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d feeautomate.com -d "*.feeautomate.com"
```

### 11.3 Nginx Configuration for Tenant Subdomains

```nginx
# Wildcard server block for tenant subdomains
server {
    listen 443 ssl http2;
    server_name ~^(?<tenant>[a-z0-9_]+)\.feeautomate\.com$;

    ssl_certificate /etc/letsencrypt/live/feeautomate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/feeautomate.com/privkey.pem;

    # Serve the same frontend SPA for all tenants
    root /var/www/feeautomate-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 12. Cron Jobs in Production

### 12.1 Built-In (node-cron, via PM2)

When you run the backend with PM2 (`pm2 start dist/server.js`), the `node-cron` scheduler starts automatically. PM2 ensures the process stays alive, so cron jobs persist.

**Verify cron is running:** Check PM2 logs:

```bash
pm2 logs feeautomate-api --lines 50
# Look for: "Cron scheduler started"
```

### 12.2 System Cron (Alternative)

If you prefer OS-level cron for certain jobs, you can disable `node-cron` (`CRON_ENABLED=false`) and trigger jobs via HTTP endpoints or scripts:

```bash
# /etc/crontab
0 0 1 * * node /var/www/feeautomate/scripts/run-job.js monthly-invoice-generation
0 9 * * * node /var/www/feeautomate/scripts/run-job.js payment-reminders
```

### 12.3 Docker with Cron

In Docker, the cron scheduler runs inside the Node.js process. With `docker compose`, PM2 is not needed — Docker's `restart: unless-stopped` handles restarts.

---

## 13. Logging & Monitoring

### 13.1 Logging (Winston)

FeeAutomate uses [Winston](https://github.com/winstonjs/winston) for structured logging:

- **Development:** Logs to console with colorized output
- **Production:** Logs in JSON format (structured for log aggregation)

**PM2 log management:**

```bash
pm2 logs feeautomate-api            # Stream live logs
pm2 logs feeautomate-api --lines 200 # Last 200 lines
pm2 flush                            # Clear all logs
pm2 install pm2-logrotate            # Auto-rotate logs
```

### 13.2 Error Tracking (Recommendations)

| Tool | Free Tier | Notes |
|------|-----------|-------|
| **Sentry** | 5,000 events/mo | Best-in-class error tracking; Node.js + React SDKs |
| **Betterstack (Logtail)** | 1 GB/mo | Log aggregation with search and alerts |
| **Grafana Cloud** | 50 GB logs/mo | Full observability stack |

To add Sentry:

```bash
npm install @sentry/node
cd frontend && npm install @sentry/react
```

### 13.3 Health Checks

The `/api/v1/health` endpoint returns `{"status":"ok"}` — use this for:

- **Uptime monitoring:** UptimeRobot, Betterstack, Pingdom (free tiers available)
- **Load balancer health checks** (AWS ALB, DigitalOcean)
- **Docker health checks**

### 13.4 PM2 Monitoring Dashboard

```bash
pm2 monit  # Real-time CPU, memory, and log monitoring in terminal
```

For a web dashboard:

```bash
pm2 plus   # PM2's hosted monitoring (free tier with 1 server)
```

---

## 14. Security Best Practices

### 14.1 HTTPS Enforcement

All production traffic must use HTTPS. Add this to your Nginx config:

```nginx
server {
    listen 80;
    server_name api.feeautomate.com app.feeautomate.com;
    return 301 https://$host$request_uri;
}
```

### 14.2 Secure JWT Handling

- Store JWT secrets in environment variables, never in code
- Use strong random secrets (64+ bytes)
- Keep access token lifetime short (15 minutes)
- Refresh tokens expire in 7 days and are rotated on use
- The backend verifies the token's `tenantId` matches the request context to prevent cross-tenant access

### 14.3 Helmet Security Headers

FeeAutomate uses [Helmet](https://helmetjs.github.io/) which sets these headers automatically:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `X-XSS-Protection`
- Content Security Policy (CSP)

### 14.4 Rate Limiting

FeeAutomate includes built-in rate limiting via `express-rate-limit`:

- **Production:** 100 requests per 15-minute window per IP
- **Development:** 1,000 requests per 15-minute window per IP

Rate limit headers (`RateLimit-Policy`, `RateLimit-Remaining`, `RateLimit-Reset`) are included in all API responses.

For additional protection, you can also add Nginx rate limiting:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://127.0.0.1:4000;
}
```

### 14.5 Input Validation

- All request bodies are validated in controllers before processing
- PostgreSQL parameterized queries (`$1`, `$2`) prevent SQL injection
- The `assertSafeDbIdentifier` utility prevents schema name injection in multi-tenant queries
- `tenantCode` is normalized and validated with `/^[a-z0-9_]+$/`

### 14.6 Razorpay Webhook Verification

Webhook payloads are verified using HMAC-SHA256 signature comparison with `crypto.timingSafeEqual` to prevent timing attacks.

### 14.7 CORS

FeeAutomate includes built-in CORS configuration:

- **Development:** All origins allowed (for local frontend dev on `:3000`)
- **Production:** Restricted to `*.feeautomate.com` subdomains
- Allowed headers: `Content-Type`, `Authorization`, `x-tenant-id`
- Credentials: enabled

The CORS configuration is in `src/app.ts` and adjusts automatically based on `NODE_ENV`.

---

## 15. Testing

### 15.1 API Testing with Postman

**Option 1: Import from OpenAPI spec (recommended)**

1. Start the backend server (`npm run dev`)
2. In Postman, click **Import → Link**
3. Enter: `http://localhost:4000/api/v1/docs/openapi.json`
4. Postman will generate a complete collection with all endpoints, schemas, and examples

**Option 2: Create manually**

Create a Postman collection with these requests:

| # | Method | URL | Auth | Body |
|---|--------|-----|------|------|
| 1 | POST | `/api/v1/auth/register-tenant` | None | `{ businessName, tenantCode, adminName, adminEmail, password }` |
| 2 | POST | `/api/v1/auth/login` | None | `{ tenantCode, email, password }` |
| 3 | GET | `/api/v1/auth/me` | Bearer Token | — |
| 4 | POST | `/api/v1/members` | Bearer + `x-tenant-id` | `{ fullName, email, status }` |
| 5 | GET | `/api/v1/members` | Bearer + `x-tenant-id` | — |
| 6 | POST | `/api/v1/plans` | Bearer + `x-tenant-id` | `{ name, amountCents, billingCycle }` |
| 7 | GET | `/api/v1/plans` | Bearer + `x-tenant-id` | — |
| 8 | POST | `/api/v1/subscriptions` | Bearer + `x-tenant-id` | `{ memberId, planId, startDate }` |
| 9 | POST | `/api/v1/invoices` | Bearer + `x-tenant-id` | `{ memberId, invoiceNumber, amountCents, dueDate }` |
| 10 | GET | `/api/v1/invoices` | Bearer + `x-tenant-id` | — |
| 11 | POST | `/api/v1/razorpay/order` | Bearer + `x-tenant-id` | `{ invoiceId }` |
| 12 | GET | `/api/v1/health` | None | — |

**Postman environment variables:**

```
base_url = http://localhost:4000
tenant_code = mygym
access_token = (set after login)
```

**Tip:** Use Postman's **Tests** tab to auto-extract the token:

```javascript
if (pm.response.code === 200) {
    pm.environment.set("access_token", pm.response.json().data.accessToken);
}
```

### 15.2 Test Payment Flow

1. Set up ngrok and configure the webhook URL (see [Section 5.4](#54-test-payments-locally-with-ngrok))
2. Create an invoice via the API
3. Create a Razorpay order for that invoice
4. Use [Razorpay test cards](https://razorpay.com/docs/payments/payments/test-card-upi-details/):
   - **Success:** Card `4111 1111 1111 1111`, any future expiry, any CVV
   - **Failure:** Card `4111 1111 1111 1234`
5. Verify:
   - Webhook received (check terminal logs)
   - Invoice status changed to `paid`
   - Payment record created/updated

### 15.3 Test Cron Jobs

Temporarily change a cron schedule to `* * * * *` (every minute) in `src/jobs/jobScheduler.ts`, restart the server, and watch the logs:

```bash
# Watch for job execution
npm run dev 2>&1 | grep -i "cron\|job"
```

After verifying, revert the cron expression.

### 15.4 Test Multi-Tenant Isolation

Register two tenants and verify data isolation:

```bash
# Register tenant A
curl -X POST http://localhost:4000/api/v1/auth/register-tenant \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Gym A","tenantCode":"gyma","adminName":"Admin A","adminEmail":"a@gym.com","password":"password123"}'

# Register tenant B
curl -X POST http://localhost:4000/api/v1/auth/register-tenant \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Gym B","tenantCode":"gymb","adminName":"Admin B","adminEmail":"b@gym.com","password":"password123"}'

# Login as tenant A and create a member
# Login as tenant B and list members — should be empty
# Verify tenant A's data is invisible to tenant B
```

### 15.5 TypeScript Type Checking

```bash
# Backend
npm run typecheck

# Frontend
cd frontend && npx tsc --noEmit
```

---

## 16. Project Structure Overview

```
SaaS-Product-2026/
├── docs/                              # Project documentation
│   ├── INSTALLATION.md                # This file
│   └── PRICING_MODEL.md              # Pricing tiers, Razorpay integration strategy
│
├── frontend/                          # React SPA (Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── api/                      # Axios HTTP client + API modules
│   │   │   ├── client.ts            #   Base Axios instance with interceptors
│   │   │   ├── auth.ts              #   Login, register, refresh
│   │   │   ├── members.ts           #   Member CRUD
│   │   │   ├── plans.ts             #   Plan CRUD
│   │   │   ├── subscriptions.ts     #   Subscription CRUD
│   │   │   ├── invoices.ts          #   Invoice operations
│   │   │   ├── payments.ts          #   Payment operations
│   │   │   ├── razorpay.ts          #   Razorpay order/payment link
│   │   │   └── tenant.ts            #   Tenant user listing
│   │   ├── components/
│   │   │   ├── layout/              #   AdminLayout, MemberLayout, Sidebar, Header
│   │   │   └── ui/                  #   Reusable components (Button, Card, Table, Modal, etc.)
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── pages/
│   │   │   ├── auth/                #   LoginPage
│   │   │   ├── admin/               #   Dashboard, Members, Plans, Invoices, Defaulters
│   │   │   └── member/              #   Dashboard, Invoices, Payment, Receipt
│   │   ├── stores/                   # Zustand state management
│   │   ├── types/                    # TypeScript interfaces (Plan, Member, Invoice, etc.)
│   │   ├── utils/                    # Formatting helpers
│   │   ├── App.tsx                   # Router + layout
│   │   ├── main.tsx                  # Entry point
│   │   └── index.css                 # Tailwind imports
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts                # Dev server on :3000, API proxy to :4000
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── src/                               # Express.js Backend (TypeScript)
│   ├── app.ts                        # Express app: middleware stack, route mounting
│   ├── server.ts                     # Entry: DB ping, listen, start cron scheduler
│   ├── config/
│   │   ├── db.ts                    #   PostgreSQL connection pool (pg)
│   │   ├── env.ts                   #   Environment variable loader + validation
│   │   └── pricing.ts              #   Platform pricing tiers, limits, add-ons, proration
│   ├── controllers/                  # Request handlers (thin — delegate to services)
│   │   ├── healthController.ts
│   │   ├── authController.ts
│   │   ├── memberController.ts
│   │   ├── planController.ts
│   │   ├── subscriptionController.ts
│   │   ├── invoiceController.ts
│   │   ├── paymentController.ts
│   │   ├── razorpayController.ts
│   │   ├── tenantController.ts
│   │   └── webhookController.ts
│   ├── middleware/
│   │   ├── auth.ts                  #   JWT verification + role-based access
│   │   ├── errorHandler.ts          #   404 + global error handler
│   │   ├── planLimitEnforcer.ts     #   Enforce pricing tier limits per request
│   │   ├── requestContext.ts        #   Attach requestId to every request
│   │   ├── requestLogger.ts        #   Morgan → Winston HTTP request logging
│   │   └── tenantResolver.ts       #   Resolve tenant from header or subdomain
│   ├── routes/                       # Express Router definitions
│   │   ├── index.ts                 #   Main API router (mounts all sub-routers)
│   │   ├── authRoutes.ts
│   │   ├── memberRoutes.ts
│   │   ├── planRoutes.ts
│   │   ├── subscriptionRoutes.ts
│   │   ├── invoiceRoutes.ts
│   │   ├── paymentRoutes.ts
│   │   ├── razorpayRoutes.ts
│   │   ├── tenantRoutes.ts
│   │   └── webhookRoutes.ts        #   Razorpay webhook (raw body for sig verify)
│   ├── services/                     # Business logic
│   │   ├── authService.ts          #   Tenant registration + login
│   │   ├── memberService.ts
│   │   ├── planService.ts
│   │   ├── subscriptionService.ts
│   │   ├── invoiceService.ts
│   │   ├── paymentService.ts
│   │   ├── razorpayService.ts      #   Razorpay orders, payment links, webhooks
│   │   ├── platformSubscriptionService.ts  # FeeAutomate's own billing via Razorpay
│   │   └── platformBillingService.ts       # Upgrade/downgrade/cancel orchestration
│   ├── repositories/                 # Data access layer (raw SQL via pg)
│   │   ├── tenantRepository.ts
│   │   ├── tenantSchemaRepository.ts  # Creates per-tenant tables + indexes
│   │   ├── userRepository.ts
│   │   ├── memberRepository.ts
│   │   ├── planRepository.ts
│   │   ├── subscriptionRepository.ts
│   │   ├── invoiceRepository.ts
│   │   └── paymentRepository.ts
│   ├── jobs/
│   │   ├── jobScheduler.ts         #   node-cron scheduler (5 recurring jobs)
│   │   ├── utils/
│   │   │   └── tenantJobRunner.ts  #   Fan-out: runs a job for every active tenant
│   │   └── services/
│   │       ├── monthlyInvoiceJobService.ts
│   │       ├── paymentReminderJobService.ts
│   │       ├── defaulterDetectionJobService.ts
│   │       ├── receiptGenerationJobService.ts
│   │       └── subscriptionRenewalReminderJobService.ts
│   ├── notifications/
│   │   ├── services/
│   │   │   ├── emailService.ts     #   Nodemailer SMTP sender
│   │   │   └── whatsappService.ts  #   WhatsApp placeholder
│   │   └── templates/
│   │       └── emailTemplates.ts   #   HTML email templates
│   ├── types/
│   │   ├── auth.ts                 #   JwtPayload, UserRole
│   │   ├── env.ts                  #   EnvConfig type
│   │   └── platformSubscription.ts #   Platform billing types
│   └── utils/
│       ├── httpError.ts            #   Custom HTTP error class
│       ├── jwt.ts                  #   Sign + verify JWT helpers
│       ├── logger.ts               #   Winston logger instance
│       ├── password.ts             #   bcrypt hash + compare
│       ├── tenantDb.ts             #   Run queries in tenant schema transaction
│       └── dbIdentifier.ts         #   Safe SQL identifier validation
│
├── .env.example                       # Backend environment template
├── package.json                       # Backend dependencies + scripts
├── tsconfig.json                      # Backend TypeScript config
└── README.md                          # Project overview + quick start
```

---

## 17. Troubleshooting

### Database Connection Issues

**Error:** `Missing required environment variable: DB_HOST`

```bash
# Ensure .env file exists and is in the project root
ls -la .env
# If missing:
cp .env.example .env
```

**Error:** `FATAL: password authentication failed for user "postgres"`

```bash
# Reset PostgreSQL password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your-new-password';"
# Update DB_PASSWORD in .env
```

**Error:** `FATAL: database "feeautomate" does not exist`

```bash
sudo -u postgres createdb feeautomate
# Or via psql:
sudo -u postgres psql -c "CREATE DATABASE feeautomate;"
```

### CITEXT Extension Missing

**Error:** `type "citext" does not exist`

```bash
sudo -u postgres psql -d feeautomate -c "CREATE EXTENSION IF NOT EXISTS citext;"
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::4000`

```bash
# Find and kill the process using port 4000
lsof -ti:4000 | xargs kill -9
# Or change PORT in .env
```

### Frontend Proxy Issues

**Error:** API calls fail with CORS errors in development

Ensure the Vite dev server is running (`cd frontend && npm run dev`). The proxy in `vite.config.ts` forwards `/api` requests to `http://localhost:4000`. If you access the frontend at any URL other than `http://localhost:3000`, the proxy won't work.

### Razorpay Webhook Not Firing

1. Verify ngrok is running and the tunnel URL matches the Razorpay Dashboard webhook URL
2. Check the Razorpay Dashboard → **Webhooks → Events** tab for delivery attempts
3. Ensure the webhook secret in `.env` matches the one in the Razorpay Dashboard
4. Check terminal logs for `x-razorpay-signature` verification errors

### Email Not Sending

```bash
# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({host:'smtp.gmail.com',port:587,secure:false,auth:{user:'your@gmail.com',pass:'your-app-password'}});
t.verify().then(() => console.log('SMTP OK')).catch(e => console.error('SMTP FAIL:', e.message));
"
```

- **Gmail:** Ensure 2-Step Verification is ON and you're using an App Password
- **Firewall:** Ensure outbound port 587 is open on your server

### TypeScript Build Errors

```bash
# Run type check without building
npm run typecheck

# Common fix: install missing type declarations
npm install -D @types/pg
```
