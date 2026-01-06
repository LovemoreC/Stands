import os
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = "Stands Portfolio API"
    secret_key: str = Field(default="change-this-secret")
    access_token_expire_minutes: int = 60 * 24
    algorithm: str = "HS256"
    database_url: str = Field(default="postgresql+psycopg2://postgres:postgres@db:5432/stands")
    env: str = Field(default="local")

    class Config:
        env_file = ".env"


def get_settings() -> Settings:
    return Settings()
