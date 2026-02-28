# SplitTrack

Backend API for two-person expense tracking (MACIEK + EMILKA) with a single shared app password.

## Structure
- `backend/` Spring Boot 3 + Java 21 + PostgreSQL + Flyway
- `frontend/` placeholder for the UI

## Run with Docker
```bash
docker compose up -d --build
```

The API will be available at `http://localhost:8080`.

## Health
```bash
curl http://localhost:8080/api/health
```

## Example request
```bash
curl -X POST http://localhost:8080/api/expenses \
  -H 'Content-Type: application/json' \
  -H 'X-App-Password: testhaslo' \
  -d '{
    "expenseDate": "2026-02-23",
    "description": "Zakupy Lidl",
    "payer": "MACIEK",
    "settlementMode": "HALF",
    "inputCurrency": "PLN",
    "inputAmount": 123.45
  }'
```

## Swagger / OpenAPI
Open `http://localhost:8080/swagger-ui/index.html`.

## Configuration
- `APP_PASSWORD` sets the required `X-App-Password` header (default `testhaslo`).
- `APP_CORS_ALLOWED_ORIGINS` can be set as comma-separated origins (default `*`).

## Notes
- Expenses are append-only (no edit/delete endpoints).
- Currency handling: for non-PLN, provide `exchangeRateToPLN`.
- Docker resources are set for small VPS (1GB RAM).
