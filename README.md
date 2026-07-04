# FRAS Nutrayu — Stock & Sales Console

A multi-workspace inventory and sales management console built for a nutraceutical supplement business, tracking stock levels, sales, and revenue across two separate operations (retail supplement line and a clinic) from a single admin dashboard.

## Features

- **Multi-workspace architecture** — switch between independent stock lists (e.g. "FRAS Nutrayu" and "Clinic") without the data ever mixing, backed by a single shared database
- **PIN-gated admin panel** for sensitive actions (stock adjustments, category management, deletions)
- **Live sales analytics** — revenue trends, category performance, and stock movement visualized with Recharts
- **Full inventory CRUD** — products, categories, pricing, cost, reorder thresholds, and stock levels
- **Cloud-synced via Supabase** — Postgres database + authentication, so data is consistent across devices
- **Responsive dashboard UI** with custom iconography per product category

## Tech stack

- React 19 + Vite
- Supabase (Postgres + Auth)
- Recharts (data visualization)
- lucide-react (icons)

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root (never committed — already in `.gitignore`):
   ```
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
3. Run locally:
   ```bash
   npm run dev
   ```

## Build for production

```bash
npm run build
```
Outputs a static site to `dist/`, deployable to Vercel, Netlify, or any static host.

## Project structure

```
src/
  App.jsx               # main dashboard: inventory, sales, analytics
  Login.jsx              # authentication screen
  WorkspaceSelect.jsx     # switch between business workspaces
  supabaseClient.js       # Supabase client + data access helpers
```

## License

MIT
