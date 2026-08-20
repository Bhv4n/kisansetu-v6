.PHONY: up down db-reset db-seed logs test

up:
	docker compose up --build

down:
	docker compose down

# Drop + recreate schema + reseed demo data (inside the running api container)
db-reset:
	docker compose exec api python -m app.seed

# Alias — the seed script is idempotent-by-reset, so seed == reset here
db-seed: db-reset

logs:
	docker compose logs -f

test:
	docker compose exec api pytest -v
