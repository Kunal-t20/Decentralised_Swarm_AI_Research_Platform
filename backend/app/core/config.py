from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str
    REDIS_URL: str
    QDRANT_URL: str
    GROQ_API_KEY: str
    OPENROUTER_API_KEY: str
    TAVILY_API_KEY: str
    OLLAMA_BASE_URL: str | None = None
    SECRET_KEY: str

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:3000"
    EVENT_LOG_TTL_SECONDS: int = 3600
    VITE_API_BASE_URL: str = "http://localhost:8000"
    VITE_POLL_INTERVAL_MS: int = 1500

    @property
    def cors_origins_list(self) -> list[str]:

        return [
            origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()
        ]


settings = Settings()
