# Stands

Simple FastAPI service that allows a Property Sales Manager to manage real estate projects and stands.
It also supports submission workflows for offers, property applications, and account opening requests with
basic status tracking and notification storage.

## Setup

```
pip install -r requirements.txt
```

Create a `.env` file based on `.env.example` and set a strong value for `SECRET_KEY`.

```bash
cp .env.example .env
# edit .env and provide a SECRET_KEY
```

## Running

```
SECRET_KEY=your-secret-key \
FRONTEND_ORIGINS="http://localhost:5173" \
uvicorn app.main:app --reload
```

Interactive docs will be available at `http://127.0.0.1:8000/docs`.

Set `FRONTEND_ORIGINS` to a comma-separated list of allowed origins if your frontend runs somewhere other than
`http://localhost:5173`.

## Admin Dashboard

A simple React + TypeScript dashboard is available in the `dashboard/` directory. It offers role-based routing and CRUD views for projects, stands, and mandate assignments.

```
cd dashboard
npm install
npm run dev
```

The dev server proxies API requests to the FastAPI backend using the `/api` prefix.
Set `VITE_API_PROXY_TARGET` to control where that proxy points (defaults to `http://localhost:8000`).
Client requests use the `VITE_API_BASE` prefix (defaults to `/api`), which lets the dashboard talk to a backend hosted elsewhere.
When running with Docker Compose, set `VITE_API_PROXY_TARGET=http://web:8000` so the proxy reaches the existing `web` service container.

## Importing Projects and Stands

Administrators can bulk import projects and stand/unit details from a CSV or Excel file:

```
POST /import/properties
```

The file must contain the columns `project_id`, `project_name`, `stand_id`, `stand_name`, `size`, and `price`.
Rows missing required fields are reported with clear error messages and skipped.

## Docker Compose

To build and run the application with Docker Compose:

```bash
docker compose up --build
```

This builds the image from the included `Dockerfile`, starts the `web` service on port 8000, and persists the SQLite database using a named volume (`sqlite_data`) mounted at `/app/data`. The environment variable `DATABASE_URL=sqlite:///data/app.db` is provided to the container.
The `SECRET_KEY` used for JWT signing is also read from the environment. Use `FRONTEND_ORIGINS` to expose a comma-separated list
of allowed CORS origins (defaults to `http://localhost:5173`).

## Authentication

Agents are created with a password hash:

```
POST /agents {"username": "alice", "role": "admin", "password": "secret"}
```

Log in to receive a JWT and use it in the `Authorization` header:

```
POST /auth/login {"username": "alice", "password": "secret"}
Authorization: Bearer <token from login>
```

## Reports

Download a CSV report of all properties and mandate statuses. Optionally filter by
property status using the `status` query parameter:

```bash
curl -H "Authorization: Bearer <token>" -o properties.csv \
  "http://127.0.0.1:8000/reports/properties?status=available"
```

## Tests

```
pytest
```
