.PHONY: help up down restart logs ps health install web dev stop onboard-test env-check

FRONT_DIR := front
DOCKER_COMPOSE := docker compose

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

env-check: ## Check CURSOR_API_KEY / mock mode
	@if [ -z "$$CURSOR_API_KEY" ] || [ "$$USE_MOCK_AI" = "true" ]; then \
		echo "AI mode: MOCK (set CURSOR_API_KEY and USE_MOCK_AI=false for Cursor Agent)"; \
	else \
		echo "AI mode: Cursor Agent (CURSOR_API_KEY is set)"; \
	fi

up: env-check ## Start PostgreSQL + AI service + backend in Docker
	$(DOCKER_COMPOSE) up -d --build

down: ## Stop Docker services
	$(DOCKER_COMPOSE) down

restart: down up ## Restart Docker services

stop: down ## Alias for down

logs: ## Follow Docker logs
	$(DOCKER_COMPOSE) logs -f

ps: ## Show Docker service status
	$(DOCKER_COMPOSE) ps

health: ## Check backend + AI health
	@echo "backend:"; curl -sf http://localhost:3000/health || true; echo
	@echo "ai-service:"; curl -sf http://localhost:3001/health || true; echo

onboard-test: ## Smoke test: create user, onboard, poll course
	@EMAIL="demo+$$(date +%s)@selfdev.local"; \
	USER=$$(curl -sf -X POST http://localhost:3000/api/users \
		-H 'Content-Type: application/json' \
		-d "{\"email\":\"$$EMAIL\",\"name\":\"Demo\"}"); \
	echo "$$USER"; \
	UID=$$(echo "$$USER" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"); \
	curl -sf -X POST "http://localhost:3000/api/users/$$UID/onboard" \
		-H 'Content-Type: application/json' \
		-d '{"profession_slug":"frontend","level_slug":"complete_beginner","weekly_hours":10,"preferred_language":"ru"}'; \
	echo; \
	for i in 1 2 3 4 5 6 7 8 9 10; do \
		COURSE=$$(curl -sf "http://localhost:3000/api/users/$$UID/course" || true); \
		STATUS=$$(echo "$$COURSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('generation_status',''))" 2>/dev/null || true); \
		echo "poll $$i: $$STATUS"; \
		[ "$$STATUS" = "ready" ] && echo "$$COURSE" && break; \
		sleep 1; \
	done

install: ## Install frontend dependencies
	cd $(FRONT_DIR) && npm install

web: ## Run Expo web dev server
	cd $(FRONT_DIR) && npm run web

dev: up ## Start Docker, then Expo web
	@echo "Waiting for backend..."
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
		curl -sf http://localhost:3000/health >/dev/null && break; \
		sleep 2; \
	done
	cd $(FRONT_DIR) && npm run web
