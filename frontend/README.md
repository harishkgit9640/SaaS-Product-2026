# FeeAutomate Frontend

Modern, responsive SaaS frontend for FeeAutomate — automated fee management for organizations.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Zustand** (state management)
- **Tailwind CSS** (styling)
- **Axios** (HTTP client)
- **React Router v6** (routing)
- **React Hot Toast** (notifications)
- **React Icons** (HeroIcons v2)

## Features

- Role-based routing (Admin / Member)
- Dark mode with system preference detection
- Responsive sidebar navigation
- Reusable component library (Button, Card, Table, Modal, Input, Badge, etc.)
- Loading, error, and empty states throughout
- Receipt generation with print/download
- Full API integration with backend

## Folder Structure

```
frontend/
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── api/                  # Axios client + API modules
    │   ├── client.ts
    │   ├── auth.ts
    │   ├── members.ts
    │   ├── plans.ts
    │   ├── subscriptions.ts
    │   ├── invoices.ts
    │   ├── payments.ts
    │   ├── razorpay.ts
    │   └── tenant.ts
    ├── components/
    │   ├── layout/           # AdminLayout, MemberLayout, Sidebar, Header
    │   └── ui/               # Reusable components
    ├── hooks/                # Custom hooks
    ├── pages/
    │   ├── auth/             # Login
    │   ├── admin/            # Dashboard, Members, Plans, Invoices, Defaulters
    │   └── member/           # Dashboard, Invoices, Payment, Receipt
    ├── stores/               # Zustand stores
    ├── types/                # TypeScript interfaces
    └── utils/                # Formatting helpers
```

## Pages

### Admin Portal
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin` | MRR, revenue stats, collection rate, recent invoices |
| Members | `/admin/members` | CRUD members with search and status filter |
| Plans | `/admin/plans` | CRUD subscription plans |
| Invoices | `/admin/invoices` | Create and filter invoices |
| Defaulters | `/admin/defaulters` | Members with overdue invoices |

### Member Portal
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/member` | Personal invoice summary and upcoming payments |
| Invoices | `/member/invoices` | View all invoices with pay/receipt actions |
| Payments | `/member/payments` | Make payments for invoices |
| Receipt | `/member/receipt/:invoiceId` | View and download payment receipt |

## Getting Started

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The dev server runs at `http://localhost:3000` with API proxy to `http://localhost:4000`.

## Build

```bash
npm run build
```

Output goes to `frontend/dist/`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `/api/v1` |
| `VITE_APP_NAME` | Application display name | `FeeAutomate` |
