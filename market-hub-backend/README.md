# MarketHub API

A production-style **multi-vendor e-commerce backend** built with **Django** and
**Django REST Framework**. Customers buy products from many independent sellers,
sellers manage their own stores and inventory, and admins oversee the platform.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Getting Started](#getting-started)
5. [Running with Docker](#running-with-docker)
6. [API Overview](#api-overview)
7. [Authentication & Roles](#authentication--roles)
8. [Testing](#testing)
9. [Configuration Reference](#configuration-reference)
10. [Future Improvements](#future-improvements)

---

## Features

- Custom `User` model with **CUSTOMER / SELLER / ADMIN** roles
- **JWT authentication** (access + refresh tokens, rotation & blacklisting)
- **Role-based authorization** enforced with custom DRF permissions
- **Product catalog** with categories, image uploads, search, filtering, ordering, pagination
- **Inventory management** as an append-only transaction ledger (STOCK_IN / SALE / RETURN / DAMAGE)
- **Order workflow** with stock reservation, totals, and a guarded status state machine
- **Stripe payments** with PaymentIntents and **signature-verified webhooks**
- **Reviews** limited to verified purchasers (one review per product)
- **Swagger / OpenAPI** documentation via drf-spectacular
- **Automated test suite** (58 tests) covering business logic and permissions
- Production hardening: env-driven settings, rate limiting, custom exception handling,
  rotating logs, query optimization, and a **Docker / PostgreSQL / Redis** stack

---

## Tech Stack

| Concern           | Choice                                            |
|-------------------|---------------------------------------------------|
| Language          | Python 3.12+                                      |
| Framework         | Django 5.2, Django REST Framework 3.16            |
| Auth              | djangorestframework-simplejwt                     |
| Database          | PostgreSQL (SQLite fallback for quick local dev)  |
| Docs              | drf-spectacular (Swagger UI + ReDoc)              |
| Search / Filter   | django-filter + DRF SearchFilter/OrderingFilter   |
| Payments          | Stripe                                            |
| Cache / Broker    | Redis (optional; in-memory fallback)              |
| Media storage     | Local (dev) / Cloudinary (production, optional)   |
| Static files      | WhiteNoise                                        |
| Server            | Gunicorn                                          |

---

## Architecture

```
market-hub-backend/
├── config/                 # Project settings, root URLs, WSGI/ASGI
├── apps/
│   ├── accounts/           # Custom user, registration, JWT auth
│   ├── products/           # Categories & products (CRUD, search, filter)
│   ├── inventory/          # Stock ledger & adjustments
│   ├── orders/             # Order + OrderItem, order workflow
│   ├── payments/           # Stripe PaymentIntents & webhooks
│   └── reviews/            # Product reviews
├── common/                 # Shared base model, pagination, permissions, exceptions
├── manage.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── entrypoint.sh
├── .env / .env.example
└── README.md
```

Each app follows the same layout: `models.py`, `serializers.py`, `views.py`,
`urls.py`, `permissions.py`, `services.py`, `admin.py`, and `tests/`.

**Design principles**

- **Thin views** — HTTP concerns only; they delegate to the service layer.
- **Services own business logic** — order creation, stock movements, payment
  handling, and review rules live in `services.py` and are independently testable.
- **Serializers validate** — input validation and output shaping.
- **Consistent authorization** — reusable role permissions in `common/permissions.py`.
- **Atomic, race-safe writes** — stock changes use `select_for_update()` inside
  `transaction.atomic()`.

---

## Getting Started

### 1. Prerequisites

- Python 3.12+
- (Optional) PostgreSQL 14+ and Redis 6+ — or just use Docker (below)

### 2. Set up the environment

```bash
cd market-hub-backend

# Create & activate a virtual environment
python -m venv venv
# Windows (PowerShell)
venv\Scripts\Activate.ps1
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env      # then edit as needed
```

For the fastest local start, the provided `.env` uses `USE_SQLITE=True`.
To use PostgreSQL locally, set `USE_SQLITE=False` and fill in the `POSTGRES_*`
values (or provide a single `DATABASE_URL`).

### 4. Migrate, seed and run

```bash
python manage.py migrate
python manage.py seed_demo          # optional: demo users + products
python manage.py runserver
```

Visit:

- Swagger UI: <http://127.0.0.1:8000/api/docs/>
- ReDoc: <http://127.0.0.1:8000/api/redoc/>
- OpenAPI schema: <http://127.0.0.1:8000/api/schema/>
- Django admin: <http://127.0.0.1:8000/admin/>

**Demo credentials** (after `seed_demo`):

| Role     | Username   | Password         |
|----------|------------|------------------|
| Admin    | `admin`    | `AdminPass123`   |
| Seller   | `seller`   | `SellerPass123`  |
| Customer | `customer` | `CustomerPass123`|

---

## Running with Docker

The Compose stack provides **Django + PostgreSQL + Redis**:

```bash
docker compose up --build
```

The `web` container waits for PostgreSQL, applies migrations, collects static
files, then serves the app with Gunicorn on <http://localhost:8000>.

To seed demo data inside the container:

```bash
docker compose exec web python manage.py seed_demo
```

---

## API Overview

All endpoints are under `/api/`.

### Auth
| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| POST   | `/api/auth/register/`       | Register (customer or seller)  |
| POST   | `/api/auth/login/`          | Obtain JWT access/refresh pair |
| POST   | `/api/auth/token/refresh/`  | Refresh an access token        |
| GET    | `/api/auth/profile/`        | Get/patch current user profile |

### Products & Categories
| Method | Endpoint                  | Access                       |
|--------|---------------------------|------------------------------|
| GET    | `/api/products/`          | Public (search/filter/sort)  |
| POST   | `/api/products/`          | Seller / Admin               |
| GET    | `/api/products/{id}/`     | Public                       |
| PUT/PATCH | `/api/products/{id}/`  | Owning seller / Admin        |
| DELETE | `/api/products/{id}/`     | Owning seller / Admin        |
| GET    | `/api/categories/`        | Public                       |
| POST   | `/api/categories/`        | Admin                        |

Query examples:

```
/api/products/?search=laptop
/api/products/?category=electronics
/api/products/?min_price=100&max_price=500
/api/products/?ordering=-price
/api/products/?mine=true            # seller's own products (auth required)
```

### Inventory
| Method | Endpoint             | Access             |
|--------|----------------------|--------------------|
| GET    | `/api/inventory/`    | Seller / Admin     |
| POST   | `/api/inventory/`    | Seller / Admin     |

### Orders
| Method | Endpoint                    | Access                            |
|--------|-----------------------------|-----------------------------------|
| POST   | `/api/orders/`              | Customer                          |
| GET    | `/api/orders/`              | Own (customer) / related (seller) / all (admin) |
| GET    | `/api/orders/{id}/`         | Order participant                 |
| PATCH  | `/api/orders/{id}/status/`  | Admin/seller (advance), customer (cancel) |

Create order body:

```json
{ "items": [ { "product": 1, "quantity": 2 }, { "product": 3, "quantity": 1 } ] }
```

### Payments
| Method | Endpoint                        | Access        |
|--------|---------------------------------|---------------|
| POST   | `/api/payments/create-intent/`  | Order owner   |
| GET    | `/api/payments/`                | Own / Admin   |
| POST   | `/api/payments/webhook/`        | Stripe (verified) |

### Reviews
| Method | Endpoint             | Access                          |
|--------|----------------------|---------------------------------|
| GET    | `/api/reviews/`      | Public                          |
| POST   | `/api/reviews/`      | Customer who purchased the item |
| PATCH/DELETE | `/api/reviews/{id}/` | Author / Admin             |

---

## Authentication & Roles

Authenticate by sending the JWT access token:

```
Authorization: Bearer <access_token>
```

| Capability                         | Customer | Seller | Admin |
|------------------------------------|:--------:|:------:|:-----:|
| Browse / search products           | ✅        | ✅      | ✅     |
| Create orders                      | ✅        | ❌      | ✅     |
| View own orders                    | ✅        | —      | ✅     |
| Write reviews (purchased only)     | ✅        | ❌      | —     |
| Create / edit own products         | ❌        | ✅      | ✅     |
| Manage own inventory               | ❌        | ✅      | ✅     |
| Manage categories & all resources  | ❌        | ❌      | ✅     |

Rules enforced: sellers cannot modify another seller's products or inventory,
customers cannot create products, and unauthenticated users cannot access
protected resources.

---

## Testing

```bash
python manage.py test
```

Tests run against an in-memory SQLite database with fast password hashing and
disabled throttling (auto-configured when `test` is in the command). Coverage
includes authentication, product CRUD & permissions, search/filtering,
inventory adjustments, the order workflow, payment success/failure & webhook
verification, and review rules.

---

## Configuration Reference

See [`.env.example`](.env.example) for all variables. Key ones:

| Variable            | Purpose                                            |
|---------------------|----------------------------------------------------|
| `SECRET_KEY`        | Django secret key (set a long random value)        |
| `DEBUG`             | `True` for development, `False` for production      |
| `ALLOWED_HOSTS`     | Comma-separated allowed hosts                       |
| `DATABASE_URL`      | Full DB URL (overrides `POSTGRES_*`)               |
| `USE_SQLITE`        | Use SQLite for quick local dev                      |
| `POSTGRES_*`        | Discrete PostgreSQL connection settings            |
| `REDIS_URL`         | Redis cache location (optional)                    |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe integration      |
| `THROTTLE_ANON` / `THROTTLE_USER` | Rate limits                          |
| `USE_CLOUDINARY` + `CLOUDINARY_*` | Cloud media storage in production    |

When `DEBUG=False`, the project automatically enables HSTS, secure cookies,
SSL redirect, and content-type nosniff protections.

---

## Future Improvements

- Asynchronous tasks with **Celery** (email receipts, webhook retries, reports)
- **Shopping cart** and multi-address checkout
- Per-seller **payouts / commission** and settlement reporting
- **Coupons / discounts** and tax calculation
- **Product variants** (size, color) and richer media galleries
- **Full-text search** with PostgreSQL `search` or OpenSearch/Elasticsearch
- Aggregated **product ratings** cached on the product record
- **CI/CD** pipeline, coverage gating, and observability (Sentry, metrics)
```
