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
    # Base URL for a locally‑running Ollama instance. When not set the
    # fallback tier (Tier 3) is disabled and a clear `ValueError` will be
    # raised by the LLM client. Historically the code expected a default of
    # ``http://localhost:11434`` but the Settings class left the field as ``None``.
    # Providing the commonly‑used default improves the out‑of‑the‑box developer
    # experience while still allowing the user to override it via ``.env``.
    OLLAMA_BASE_URL: str = "http://localhost:11434"
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

    # How long the HTTP client should wait for a response from Ollama. The
    # default (30 s) matches the LLM client timeout, but projects with slower
    # hardware can override it via ``OLLAMA_TIMEOUT`` in ``.env``.
    OLLAMA_TIMEOUT: float = 30.0

    @property
    def cors_origins_list(self) -> list[str]:

        return [
            origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()
        ]


settings = Settings()
