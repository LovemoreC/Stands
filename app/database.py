from sqlalchemy import create_engine, Column, String, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator

DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Record(Base):
    __tablename__ = "records"
    store = Column(String, primary_key=True)
    key = Column(String, primary_key=True)
    data = Column(JSON, nullable=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def drop_db() -> None:
    Base.metadata.drop_all(bind=engine)


def get_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
