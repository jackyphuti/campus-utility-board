# Campus Utility Board Backend

Production-ready backend foundation for your sprint workflow:

- REST API for auth and utility status management
- JWT-based authentication
- Socket.IO real-time broadcasts for no-refresh updates
- Docker setup for consistent local/prod runtime
- GitHub Actions CI for PR quality gates

## Tech Stack

- Node.js 20+
- Express 5
- Socket.IO
- JWT + bcryptjs

## Quick Start

1. Install dependencies:

```bash
npm ci
```

1. Create environment file:

```bash
cp .env.example .env
```

1. Set a strong JWT secret in .env (minimum 32 chars).

1. Run in dev mode:

```bash
npm run dev
```

Server runs on <http://localhost:4000>.

## API Base

- Base URL: /api/v1

## Endpoints

- GET /api/v1/health
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me (Bearer token)
- GET /api/v1/utilities
- GET /api/v1/utilities/:utilityType
- PATCH /api/v1/utilities/:utilityType (Bearer token)

Allowed utility status values:

- operational
- degraded
- outage
- maintenance

## Socket Events

Client receives:

- utility:bootstrap
- utility:updated
- utility:room-updated
- utility:error

Client sends:

- utility:subscribe (payload: utilityType)
- utility:update (payload: utilityType, status, message)

## Docker

Build and run:

```bash
docker compose up --build
```

## Team Workflow (Locked main)

1. Create feature branch from latest main:

```bash
git checkout main
git pull origin main
git checkout -b feat/<module-name>
```

1. Commit in small modular chunks:

```bash
git add .
git commit -m "feat(auth): add login route"
```

1. Push and open PR:

```bash
git push -u origin feat/<module-name>
```

1. Require at least one review before merge.
1. Squash merge to keep main clean.

## Notes for Frontend Team

- API responses are JSON and include clear error messages.
- Utility updates through PATCH are instantly broadcast via Socket.IO.
- Keep Bearer token in request Authorization header for protected routes.
