FROM python:3.11-slim

# Install system dependencies (curl is needed for container/health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy and install python dependencies
COPY requirements.txt pyproject.toml ./
RUN uv pip install --system -r requirements.txt

# Copy the application code
COPY . .

# Expose the API port
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
