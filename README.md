# Stands

Simple FastAPI service that allows a Property Sales Manager to manage real estate projects and stands.
It also supports submission workflows for offers, property applications, and account opening requests with
basic status tracking and notification storage.

## Account Opening Workflow

Realtors capture account opening requests from the dashboard or by submitting the multipart form at
`POST /applications/account`. The initial submission only stores the request and marks it as `submitted`.
Managers review new requests, upload any missing documents, and approve them via the
`POST /account-openings/{id}/approve` (or `/applications/account/{id}/approve` for file uploads) endpoints.
Approval sets the status to `manager_approved`, records a notification, and triggers the email dispatch to the
deposit mailbox. Once a request is approved, management can provision the target account and track incoming
deposits using the existing `/account-openings/{id}/open` and `/account-openings/{id}/deposit` endpoints.

## Setup

```
pip install -r requirements.txt
```

Create a `.env` file based on `.env.example` and set strong values for both `SECRET_KEY` and
`INITIAL_ADMIN_TOKEN`.

```bash
cp .env.example .env
# edit .env and provide a SECRET_KEY
```

To automatically create the first administrator during startup, set
`INITIAL_ADMIN_USERNAME` along with either `INITIAL_ADMIN_PASSWORD` or
`INITIAL_ADMIN_PASSWORD_HASH`. When both are provided the plaintext password wins and is
hashed before storage.

## Running

```
SECRET_KEY=your-secret-key \
INITIAL_ADMIN_TOKEN=bootstrap-token \
INITIAL_ADMIN_USERNAME=admin \
INITIAL_ADMIN_PASSWORD=Secret123 \
FRONTEND_ORIGINS="http://localhost:5173" \
uvicorn app.main:app --reload
```

Interactive docs will be available at `http://127.0.0.1:8000/docs`.

Set `FRONTEND_ORIGINS` to a comma-separated list of allowed origins if your frontend runs somewhere other than
`http://localhost:5173`.

## Inbound Email Processor

The `InboundEmailProcessor` can be executed as a standalone worker that polls an Outlook/IMAP inbox and
creates or updates customer profiles when new emails arrive. Configure the connection via environment
variables (examples are available in `.env.example`):

- `IMAP_HOST` / `IMAP_PORT`
- `IMAP_USERNAME` / `IMAP_PASSWORD`
- `IMAP_FOLDER` (defaults to `INBOX`)
- `IMAP_USE_SSL` (defaults to `true`)
- `INBOUND_EMAIL_POLL_INTERVAL` (polling interval in seconds, defaults to `60`)

Run the worker once to verify connectivity:

```bash
python -m app.inbox_runner --once
```

Omit `--once` to keep the loop running in the foreground. The command reuses the same database configuration
as the API so processed messages immediately update the shared customer profiles table.

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
When running the dev server against Docker Compose, set `VITE_API_PROXY_TARGET=http://web:8000` so the proxy reaches the existing `web` service container.

## Importing Projects and Stands

Administrators can bulk import projects and stand/unit details from a CSV or Excel file:

```
POST /import/properties
```

The file must contain the columns `project_id`, `project_name`, `stand_id`, `stand_name`, `size`, and `price`.
Rows missing required fields are reported with clear error messages and skipped.

**Manual verification:** Uploading a file that contains at least one invalid row now displays the backend-provided error text in the dashboard import form.

## Synchronising External Bank Accounts

Deposit and loan account records can be synchronised from an external core-banking system using the ingestion
service in `app/accounts.py`. Provide adapters that expose `fetch_deposit_accounts()` and
`fetch_loan_accounts()` methods (they can return dictionaries or the `ImportedDepositAccount`/
`ImportedLoanAccount` Pydantic models) and pass them to the CLI runner:

```bash
python -m app.accounts --deposit-adapter myproject.adapters:DepositAdapterFactory \
  --loan-adapter myproject.adapters:LoanAdapterFactory --source-system "Core Banking"
```

The script loads the dotted paths, instantiates the adapters (callables are invoked) and persists the returned
records via the existing repositories. Schedule the command with cron or a containerised task runner to keep the
read-only management dashboards up to date. When the adapters omit the source metadata, the CLI uses the
`--source-system` value as the default audit label so every imported record retains traceability back to its
originating system.

## Docker Compose

To build and run the API and dashboard together with Docker Compose:

```bash
docker compose up --build
```

This builds the FastAPI backend from the repository root and the production dashboard image defined in `dashboard/Dockerfile`.
Once the containers are running you can reach:

- Dashboard: <http://localhost:8080>
- API: <http://localhost:8000> (interactive docs at <http://localhost:8000/docs>)
- Inbound email worker: runs in the background and shares the same SQLite volume

To seed the initial administrator in Docker, export the optional variables before running
Compose so the startup hook can create the account when the database is empty:

```bash
INITIAL_ADMIN_USERNAME=admin \
INITIAL_ADMIN_PASSWORD=Secret123 \
docker compose up --build
```

The backend persists the SQLite database using the named volume `sqlite_data` mounted at `/app/data` and reads environment values from `.env`.
By default it allows requests from both `http://localhost:8080` and `http://localhost:5173` so the static dashboard and the Vite dev server can call the API.
The frontend image is built with `VITE_API_BASE=http://web:8000`, which points API calls from the bundled code to the backend service on the Docker network.
The `inbox-worker` service (defined in `docker-compose.yml`) runs `python -m app.inbox_runner` so inbound replies are processed
alongside the API and frontend containers.

## Authentication

Agents are created with a password hash. The first administrator must be created with the bootstrap
token so that deployments start with a known secret:

```
POST /agents {"username": "alice", "role": "admin", "password": "secret"}
X-Bootstrap-Token: <INITIAL_ADMIN_TOKEN>
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
