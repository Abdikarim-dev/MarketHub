# MarketHub

Multi-vendor e-commerce platform.

## Structure

```
market-hub/
├── market-hub-backend/   # Django REST API
└── market-hub-frontend/  # Next.js App Router storefront & dashboards
```

## Backend

```bash
cd market-hub-backend
python -m venv venv
# Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, Stripe, etc.
python manage.py migrate
python manage.py runserver
```

API docs: http://127.0.0.1:8000/api/docs/

## Frontend

```bash
cd market-hub-frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev
```

App: http://localhost:3000

## Stack

| Layer    | Tech |
|----------|------|
| Backend  | Django, DRF, PostgreSQL, JWT, Stripe |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind, TanStack Query |
