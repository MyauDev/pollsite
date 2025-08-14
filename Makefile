SHELL := /bin/sh

.PHONY: up down logs ps build migrate createsuperuser shell webshell collectstatic

up:
	docker compose up -d --build
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

migrate:
	docker compose exec api python manage.py migrate --noinput

createsuperuser:
	docker compose exec api python manage.py createsuperuser --email admin@example.com || true

shell:
	docker compose exec api python manage.py shell

webshell:
	docker compose exec web sh