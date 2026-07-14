# MarketHub Frontend

Next.js 15 App Router storefront + seller/admin dashboards for the MarketHub Django API.

## Setup

```bash
cd market-hub-frontend
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
npm run dev
```

App: http://localhost:3000

## Scripts

- `npm run dev` — Turbopack dev server
- `npm run build` — production build
- `npm start` — serve production build
- `npm run lint` — ESLint

## Features

- JWT auth (login/register, refresh interceptor, role routing)
- MegaMart-style storefront (hero, categories, product grid)
- Cart + wishlist (Zustand, persisted)
- Checkout → Django orders + payment intent
- Order history + tracking timeline
- Seller dashboard (products, inventory, charts)
- Admin dashboard (categories, orders, analytics)
- Dark mode toggle (next-themes)
- TanStack Query caching

## Demo accounts (from backend seed)

| Role     | Username  | Password         |
|----------|-----------|------------------|
| Admin    | admin     | AdminPass123     |
| Seller   | seller    | SellerPass123    |
| Customer | customer  | CustomerPass123  |
