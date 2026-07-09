.PHONY: lint lint-backend lint-frontend format

lint: lint-backend lint-frontend

lint-backend:
	cd backend && ruff check app tests
	cd backend && ruff format --check app tests

lint-frontend:
	@echo "Checking frontend lint..."
	@if [ -d "frontend/node_modules" ]; then \
		cd frontend && npm run lint; \
	else \
		echo "Skipping frontend lint (node_modules not installed)."; \
	endif

format:
	cd backend && ruff format app tests
