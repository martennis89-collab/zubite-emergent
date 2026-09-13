# Zubite.bg

Zubite.bg is a Next.js frontend backed by a FastAPI API.

## Production architecture

- Frontend: Vercel (`frontend/`)
- Backend: Render Docker web service (`backend/`)
- Database: MongoDB Atlas
- Private object storage: Cloudflare R2
- Browser API path: same-origin `/api/*`, proxied by Next.js to Render

The complete provider setup, secret matrix, deployment order, smoke checks,
rollback steps, and data migration notes are in [DEPLOYMENT.md](DEPLOYMENT.md).

## Local development with Docker

1. Copy `backend/.env.example` to `backend/.env` and replace placeholder secrets.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Start the stack:

   ```powershell
   docker compose up --build
   ```

4. Open `http://localhost:3000`. The API is also exposed at
   `http://localhost:8010`, and MongoDB at `mongodb://localhost:27018`.

Useful checks:

```powershell
Invoke-RestMethod http://localhost:8010/health
Invoke-RestMethod http://localhost:3000/api/cities
docker compose exec -T backend python -m pytest -q tests/test_storage_r2.py
```

For a live R2 write/read/delete check after adding real local R2 credentials:

```powershell
docker compose exec -T backend python scripts/verify_r2.py
```
