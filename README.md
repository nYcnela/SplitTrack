# SplitTrack

SplitTrack to aplikacja do rozliczen wydatkow dla 2 osob:

- frontend: Next.js (`frontend/`)
- backend: Spring Boot + PostgreSQL + Flyway (`backend/`)

Ten README opisuje uruchomienie:

- na Raspberry Pi (Docker Compose, zalecane),
- lokalnie (backend + frontend bez Dockera).

---

## 1) Uruchomienie na Raspberry Pi (Docker, zalecane)

### Wymagania

- Docker + Docker Compose
- Raspberry Pi OS 64-bit (arm64) - zalecane
- (opcjonalnie) Tailscale do dostepu zdalnego

### Krok 1: konfiguracja `.env`

W katalogu projektu:

```bash
cp .env.example .env
```

Nastepnie edytuj `.env` i ustaw minimum:

- `APP_CORS_ALLOWED_ORIGINS` - origin frontendu (np. Tailscale IP RPi)

`APP_PASSWORD` jest opcjonalne. Gdy zostanie puste, logowanie haslem jest wylaczone.

Przyklad dla Tailscale:

```env
APP_CORS_ALLOWED_ORIGINS=http://100.x.y.z:3000
```

### Krok 2: start

```bash
docker compose up -d --build
```

### Krok 3: weryfikacja

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
curl http://127.0.0.1:8080/api/health
```

Domyslne porty:

- frontend: `3000`
- backend: `8080`
- postgres: `5432` (wewnatrz compose)

### Dostep z innego urzadzenia (Tailscale)

Na RPi:

```bash
tailscale ip -4
```

W przegladarce:

- `http://<TAILSCALE_IP_RPI>:3000`

---

## 2) Uruchomienie lokalne (bez Dockera)

### 2.1 PostgreSQL

Uruchom lokalny PostgreSQL i utworz baze `splittrack` (lub ustaw wlasne parametry).

### 2.2 Backend

W katalogu `backend/`:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/splittrack
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=admin

mvn -DskipTests spring-boot:run
```

Backend bedzie pod:

- `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger-ui/index.html`

### 2.3 Frontend

W katalogu `frontend/`:

```bash
npm install
npm run dev
```

Frontend bedzie pod:

- `http://localhost:3000`

---

## 3) Pliki deploymentu

- `docker-compose.yml` - postgres + backend + frontend
- `backend/Dockerfile` - obraz backendu
- `frontend/Dockerfile` - obraz frontendu
- `.env.example` - przykladowe zmienne srodowiskowe

---

## 4) Przydatne komendy

```bash
# zatrzymanie
docker compose down

# zatrzymanie + usuniecie wolumenow (UWAGA: usunie dane bazy)
docker compose down -v

# rebuild tylko frontendu (np. po zmianie BACKEND_INTERNAL_URL)
docker compose up -d --build frontend
```
