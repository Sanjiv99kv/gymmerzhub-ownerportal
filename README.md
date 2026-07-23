# GymmerzHub Hub

GymmerzHub Hub is a modern gym management dashboard built with React and TanStack Router.  
It helps gyms manage members, attendance, payments, plans, workouts, diet plans, and revenue analytics from one place.

## Features

- Member management with filters, sorting, status tags, and action menus
- Detailed member profile with payments, attendance, fitness, plans, communication, and notes
- Attendance dashboard with KPI cards and GitHub-style heatmap
- Membership plan and discount management
- Payments tracking with transaction views
- Revenue analytics with charts, trends, and plan performance
- Workout programs with structured day-by-day schedules
- Diet plan management with add/edit/remove workflows

## Tech Stack

- React 19
- TypeScript
- TanStack Router + TanStack Query
- Vite
- Tailwind CSS
- Radix UI
- Recharts
- Lucide React Icons
- Sonner (toast notifications)

## Project Structure

```bash
src/
  components/        # Shared UI + layout components
  lib/               # Data, helpers, utilities
  routes/            # Route pages
  styles.css         # Global styles
public/
  favicon.svg
```

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Start development server

```bash
npm run dev
```

### 3) Build for production

```bash
npm run build
```

### 4) Preview production build

```bash
npm run preview
```

## Scripts

- `npm run dev` - Run local development server
- `npm run build` - Create production build
- `npm run build:dev` - Create development-mode build
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run format` - Run Prettier

## Main Routes

- `/` - Dashboard
- `/members` - Members list
- `/members/$id` - Member detail
- `/attendance` - Attendance tracking
- `/plans` - Membership and discounts
- `/payments` - Payments
- `/revenue` - Revenue analytics
- `/workouts` - Workout plans
- `/diet` - Diet plans
- `/reports`, `/notices`, `/settings`, `/trainers`

## Notes

- Current data is seeded/demo data from `src/lib/data.ts`.
- Most screens are UI-ready and can be connected to backend APIs.
- App metadata and favicon are configured in `src/routes/__root.tsx` and `public/favicon.svg`.

## Roadmap

- Backend integration for persistent data
- Role-based access (admin/staff/trainer)
- Real-time attendance and payment updates
- Exportable reports, invoices, and receipts
- Notification channels (WhatsApp, SMS, Email)

## License

Private project for internal or business use.
