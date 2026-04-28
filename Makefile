# Sanliurfa.com Makefile

.PHONY: help install dev build test test-e2e docker-up docker-down migrate seed backup lint format clean

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm ci

dev: ## Start development server
	npm run dev

build: ## Build for production
	npm run build

test: ## Run all tests
	npm run test:unit

test-e2e: ## Run E2E tests
	npx playwright test

test-e2e-ui: ## Run E2E tests with UI
	npx playwright test --ui

docker-up: ## Start Docker containers
	docker-compose -f docker-compose.production.yml up -d

docker-down: ## Stop Docker containers
	docker-compose -f docker-compose.production.yml down

docker-logs: ## View Docker logs
	docker-compose -f docker-compose.production.yml logs -f

migrate: ## Run database migrations
	npm run db:migrate

seed: ## Seed database
	npm run db:seed

backup: ## Create database backup
	bash scripts/backup.sh

lint: ## Run linter
	npm run lint

lint-fix: ## Fix linting issues
	npm run lint:fix

format: ## Format code
	npx prettier --write "src/**/*.{ts,tsx,astro}"

load-test: ## Run load tests
	k6 run load-tests/load-test.js

clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf node_modules/.cache

update: ## Update dependencies
	npm update
	npm audit fix
