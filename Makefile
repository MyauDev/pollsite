SHELL := /bin/sh

.PHONY: up up-recreate down logs ps build restart-all migrate createsuperuser shell webshell web-restart web-logs web-dev

# Main commands
up:
	docker compose up -d --build
	sleep 2
	docker compose ps

up-recreate:
	docker compose down -v
	docker compose up -d --force-recreate
	sleep 2
	docker compose ps

down:
	docker compose down -v

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

build:
	docker compose build --no-cache

restart-all:
	@echo "🔄 Restarting all containers with code changes..."
	@echo "📦 Rebuilding web container (Next.js)..."
	docker compose stop web
	docker compose rm -f web
	docker compose build web --no-cache
	docker compose up -d web
	@echo "🔧 Restarting API container (Django)..."
	docker compose restart api
	@echo "✅ All containers restarted!"
	docker compose ps

# Django commands
migrate:
	docker compose exec api python manage.py migrate --noinput
	
createsuperuser:
	docker compose exec api python manage.py createsuperuser --email admin@example.com || true

shell:
	docker compose exec api python manage.py shell

# Web commands (simplified)
webshell:
	docker compose exec web sh

web-restart:
	docker compose stop web
	docker compose rm -f web
	docker compose build web --no-cache
	docker compose up -d web
	docker compose ps web

web-logs:
	docker compose logs -f web --tail=50

web-dev:
	cd web && npm run dev
