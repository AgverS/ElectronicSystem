# Everything this project needs, from the terminal.
#
#   make help     lists every command
#
# Docker runs under Colima, not Docker Desktop. `make up` starts Colima if it is
# not already running, so there is nothing to click.

SHELL := /bin/bash
COMPOSE := docker compose

# Keep this in step with docker-compose.yml.
DB_CONTAINER := ejdemo_postgres
DB_USER ?= ejdemo
DB_NAME ?= ej_demo

.DEFAULT_GOAL := help
.PHONY: help colima up down restart logs ps db psql migrate migrate-new seed reset backup restore build dev check clean nuke

help: ## Show this help
	@echo ""
	@echo "  Electronic Journal — demo"
	@echo ""
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""

colima: ## Start Colima if it is not running
	@if ! colima status >/dev/null 2>&1; then \
		echo "→ starting Colima…"; \
		colima start --cpu 2 --memory 4 --disk 20; \
	else \
		echo "→ Colima is already running"; \
	fi
	@docker context use colima >/dev/null 2>&1 || true

up: colima ## Start everything (app + database)
	$(COMPOSE) up -d --build
	@echo ""
	@echo "→ http://localhost:$${APP_PORT:-8080}"

db: colima ## Start only the database, for local development
	$(COMPOSE) up -d postgres
	@echo "→ database on localhost:$${POSTGRES_PORT:-5434}"

down: ## Stop everything (data is kept)
	$(COMPOSE) down

restart: ## Restart everything
	$(COMPOSE) restart

logs: ## Follow the logs
	$(COMPOSE) logs -f --tail=100

ps: ## Show what is running
	@$(COMPOSE) ps

psql: ## Open a database shell
	docker exec -it $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME)

migrate: ## Apply pending migrations
	pnpm prisma migrate deploy

migrate-new: ## Create a migration from schema changes: make migrate-new name=add_field
	@test -n "$(name)" || (echo "give it a name: make migrate-new name=add_field" && exit 1)
	pnpm prisma migrate dev --name $(name)

seed: ## Fill the database with the demo college
	pnpm prisma db seed

reset: ## Wipe the database and re-seed it
	pnpm prisma migrate reset --force

backup: ## Dump the database into backups/
	@mkdir -p backups
	@f="backups/ejdemo-$$(date +%Y%m%d-%H%M%S).sql"; \
	docker exec $(DB_CONTAINER) pg_dump -U $(DB_USER) -d $(DB_NAME) --clean --if-exists > "$$f"; \
	echo "→ $$f"

restore: ## Restore a dump: make restore file=backups/....sql
	@test -n "$(file)" || (echo "give it a file: make restore file=backups/….sql" && exit 1)
	docker exec -i $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME) < $(file)
	@echo "→ restored from $(file)"

build: ## Build the application image
	$(COMPOSE) build

dev: ## Run the app locally against the database in Docker
	pnpm dev

check: ## Type check, lint and build
	pnpm typecheck && pnpm lint && pnpm build

clean: ## Stop everything and remove the containers (data is kept)
	$(COMPOSE) down --remove-orphans

nuke: ## Remove the containers AND the data of this project only
	@read -p "Delete this project's database? Type yes: " a; [ "$$a" = "yes" ] || exit 1
	$(COMPOSE) down -v --remove-orphans
	@echo "→ removed. kbpej was not touched."
