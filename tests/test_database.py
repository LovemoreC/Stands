import importlib
import sys


def test_non_sqlite_database_url_omits_sqlite_args(monkeypatch):
    """Ensure non-SQLite URLs do not receive SQLite-specific connect args."""

    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/db")

    # Ensure a clean import for the module under test.
    sys.modules.pop("app.database", None)

    recorded_kwargs = {}

    def fake_create_engine(url, **kwargs):  # pragma: no cover - trivial
        recorded_kwargs.update(kwargs)
        if "connect_args" in kwargs:
            raise TypeError("connect_args should not be provided for non-SQLite URLs")
        return object()

    monkeypatch.setattr("sqlalchemy.create_engine", fake_create_engine)

    importlib.import_module("app.database")

    assert "connect_args" not in recorded_kwargs

    # Allow subsequent imports to load the real module.
    sys.modules.pop("app.database", None)
