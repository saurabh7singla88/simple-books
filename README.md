# Accounts — Self-Hosted Accounting App

A lightweight, self-hosted accounting app for small businesses. Invoices, bills, expenses, journal entries, and financial reports with role-based access control.

## Features

- Invoices, Bills (with file attachments), Recurring Expenses
- Chart of Accounts, Contacts, Manual Journal Entries
- Profit & Loss, Balance Sheet, Dashboard reports
- Role-based users: `ADMIN`, `ACCOUNTANT`, `VIEWER`
- JWT authentication, SQLite database, zero external dependencies

## Stack

React 18 · Vite · Tailwind CSS · Node.js 20 · Express · Drizzle ORM · SQLite

## Quick Start

```bash
git clone https://github.com/your-username/accounts.git
cd accounts
docker compose up --build
```

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3002  |
| API      | http://localhost:4000  |

Default login: `admin@example.com` / `admin123` — **change the password on first login.**

## Environment Variables

Set in `docker-compose.yml`. Key variables:

| Variable       | Default                              | Notes                        |
|----------------|--------------------------------------|------------------------------|
| `JWT_SECRET`   | `change-this-in-production-please`   | **Must be changed**          |
| `DATABASE_URL` | `/data/accounts.db`                  | SQLite file path             |
| `CORS_ORIGIN`  | `http://localhost:3002`              | Allowed frontend origin      |

Data is persisted in `./data/accounts.db` and `./backend/uploads/` on the host.

## Development (without Docker)

```bash
# Backend (port 4000)
cd backend && npm install && npm run dev

# Frontend (port 3002)
cd frontend && npm install && npm run dev
```

## License

MIT
