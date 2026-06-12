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
docker run -d -p 4000:4000 -v ./data:/data -e JWT_SECRET=changeme nebrix001/simple-books:latest
```

Then open **http://localhost:4000** — frontend and API are served from the same container.

Default login: `admin@accounts.local` / `admin123` — **change the password on first login.**

## Environment Variables

Set in `docker-compose.yml`. Key variables:

| Variable       | Default                              | Notes                        |
|----------------|--------------------------------------|------------------------------|
| `JWT_SECRET`   | `change-this-in-production-please`   | **Must be changed**          |
| `DATABASE_URL` | `/data/accounts.db`                  | SQLite file path             |
| `PORT`         | `4000`                               | Exposed port                 |

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
