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

## Tests

```
pytest
```
