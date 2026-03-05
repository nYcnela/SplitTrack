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

- `APP_PASSWORD` - haslo aplikacji (naglowek `X-App-Password`)
- `NEXT_PUBLIC_API_BASE_URL` - publiczny URL backendu widoczny z przegladarki

Przyklad dla Tailscale:

```env
NEXT_PUBLIC_API_BASE_URL=http://100.x.y.z:8080
APP_CORS_ALLOWED_ORIGINS=http://100.x.y.z:3000
```

> `NEXT_PUBLIC_API_BASE_URL` jest wartoscia build-time dla frontendu.
> Po zmianie tej zmiennej trzeba przebudowac frontend (`docker compose up -d --build frontend`).

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
export APP_PASSWORD=testhaslo

mvn -DskipTests spring-boot:run
```

Backend bedzie pod:

- `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger-ui/index.html`

### 2.3 Frontend

W katalogu `frontend/`:

```bash
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 npm run dev
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

# rebuild tylko frontendu (np. po zmianie NEXT_PUBLIC_API_BASE_URL)
docker compose up -d --build frontend
```
