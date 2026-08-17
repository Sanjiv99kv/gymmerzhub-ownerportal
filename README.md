# GymmerzHub Hub

Gym owner portal for GymmerzHub. Manage members, attendance, plans, payments, workouts, diet plans, notices, and team from one dashboard.

## Stack

- React 19 + TypeScript + Vite
- TanStack Router + TanStack Query
- Tailwind CSS v4
- Radix UI + Recharts

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Dev server: `http://localhost:5173`  
API default: `http://localhost:8800` (see `VITE_API_BASE_URL`)

Requires [gymmerzhub-backend](../gymmerzhub-backend) running locally.

## Environment

```bash
VITE_API_BASE_URL=http://localhost:8800
```

Register or log in as a gym owner against the backend. Staff can join via invite links (`/invite/:token`). Member invites use `/member-invite/:token`.

## Scripts

```bash
npm run dev          # local dev
npm run build        # production build
npm run build:dev   # development-mode build
npm run preview      # preview production build
npm run lint
npm run format
```

## Features

- Member management, profiles, and join approvals
- Attendance dashboard
- Membership plans and discounts
- Payments and revenue views
- Workout and diet plan assignment
- Notices, trainers, roles, and team invites
- Revenue share for linked member platform subscriptions

## Main routes

| Path | Purpose |
|------|---------|
| `/login`, `/register` | Owner auth |
| `/invite/$token` | Staff invite accept |
| `/member-invite/$token` | Member invite accept |
| `/` | Dashboard |
| `/members`, `/members/$id` | Members |
| `/approvals` | Join requests |
| `/attendance` | Attendance |
| `/plans` | Membership plans |
| `/payments`, `/revenue`, `/revenue-share` | Money |
| `/workouts`, `/diet` | Plans |
| `/notices`, `/trainers`, `/team`, `/roles` | Ops |
| `/reports`, `/settings`, `/profile` | Reports & account |

## Project layout

```
src/
  components/     # Layout, UI, feature components
  lib/            # API, auth/session, permissions, helpers
  routes/         # File-based routes (_app + auth)
public/
```

## Related repos

- `gymmerzhub-backend` — API
- `gymmerzhub-admin` — platform ops console
- `gymmerzhub-launch` — marketing site
