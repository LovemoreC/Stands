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

## Tests

```
pytest
```
