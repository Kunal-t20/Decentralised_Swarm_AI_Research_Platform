FROM python:3.11-slim

# Install system dependencies (curl is needed for container/health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Configure uv to install into system Python environment and compile bytecode
ENV UV_PROJECT_ENVIRONMENT="/usr/local"
ENV UV_COMPILE_BYTECODE=1

# Copy dependency specifications and lockfile
COPY pyproject.toml uv.lock requirements.txt ./

# Synchronize dependencies directly from the lockfile into system Python
RUN uv sync --frozen --no-dev --no-install-project

# Copy the application code
COPY . .

# Expose the API port
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
