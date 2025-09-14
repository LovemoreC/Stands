# Stands

Simple FastAPI service that allows a Property Sales Manager to manage real estate projects and stands.
It also supports submission workflows for offers, property applications, and account opening requests with
basic status tracking and notification storage.

## Setup

```
pip install -r requirements.txt
```

## Running

```
uvicorn app.main:app --reload
```

Interactive docs will be available at `http://127.0.0.1:8000/docs`.

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
 docker-compose up --build
```

This will build the image from the included `Dockerfile`, start the `web` service on port 8000, and persist the SQLite database in a named volume (`sqlite_data`). The environment variable `DATABASE_URL=sqlite:///app.db` is provided to the container.

## Authentication

Agents are created with a password hash:

```
POST /agents {"username": "alice", "role": "admin", "password": "secret"}
```

Log in to receive an API token and use it in the `X-Token` header:

```
POST /login {"username": "alice", "password": "secret"}
X-Token: <token from login>
```

## Reports

Download a CSV report of all properties and mandate statuses. Optionally filter by
property status using the `status` query parameter:

```bash
curl -H "X-Token: <token>" -o properties.csv \
  "http://127.0.0.1:8000/reports/properties?status=available"
```

## Tests

```
pytest
```
