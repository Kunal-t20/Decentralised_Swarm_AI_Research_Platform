@echo off
REM Launches the FastAPI backend using python -m uvicorn to avoid Windows Application Control policy blocks on .exe wrappers
uv run python -m uvicorn app.main:app --reload
