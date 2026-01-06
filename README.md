# Stands Portfolio Administration MVP

Local dockerized MVP for managing land stands from project setup through payments.

## Stack
- FastAPI + SQLAlchemy + Alembic
- PostgreSQL
- React (Vite)
- JWT auth
- Docker Compose

## Getting started
1. Copy environment defaults and adjust as needed:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Start services:
   ```bash
   docker-compose up --build
   ```
3. Run migrations inside the API container:
   ```bash
   docker-compose exec api alembic upgrade head
   ```
4. Seed the default admin user (admin@stands.local / admin123):
   ```bash
   docker-compose exec api python -m app.seed
   ```
5. Open the web app at http://localhost:5173 and sign in.

## Services
- API: http://localhost:8000 (docs at /docs)
- Web: http://localhost:5173
- Postgres: localhost:5432

## Notes
- RBAC roles: System Admin, Property Manager, Realtor, Credit Manager.
- Minimal pages are provided for login, stands, reservations, approvals, sales, payments, and dashboards.
