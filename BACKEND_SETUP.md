# Backend Setup (NestJS + Prisma + Postgres + Swagger)

## 1) Go to backend

```bash
cd backend
```

## 2) Install dependencies

```bash
npm install
```

## 3) Environment

```bash
cp .env.example .env
```

Update `.env` values:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

## 4) Start PostgreSQL

Use your preferred method (Docker/local service). Example with Docker:

```bash
docker run --name malasiya-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=malasiya \
  -p 5432:5432 -d postgres:16
```

## 5) Prisma generate + migration

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## 6) Run backend

```bash
npm run start:dev
```

## 7) Swagger docs

Open:

- `http://localhost:3000/docs`

API base prefix:

- `http://localhost:3000/v1`

## Implemented modules

- `auth` (`/v1/auth/register`, `/v1/auth/login`)
- `users` (`/v1/users`)
- `properties` (`/v1/properties`)
- `viewings` (`/v1/viewings`)
- `health` (`/v1/`)

## Authentication flow

1. Register or login from `auth` endpoints.
2. Copy `accessToken`.
3. In Swagger, click **Authorize** and paste `Bearer <token>`.
4. Call protected endpoints.
