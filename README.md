# CRUD API · Auth · Containerized Stack

A progressive backend API demonstrating storage evolution and authentication.

**Assignments:**  
- **A1** – In-memory CRUD  
- **A2** – SQLite persistence  
- **A3** – Containerized PostgreSQL (Docker Compose)  
- **A4** – Supabase Auth + JWT + Swagger UI

All endpoints behave identically across storage swaps — storage is an implementation detail.

---

## Quick Start

```bash
# Clone & install
git clone https://github.com/MoscowAbdelaal/crud-api.git
cd crud-api
npm install

# Configure secrets
cp .env.example .env
# Add SUPABASE_URL and SUPABASE_KEY to .env

# Start server
npm start
```

**Server:** `http://localhost:3000`  
**Swagger UI:** `http://localhost:3000/docs`

---

## Architecture

```
Client → Express Routes → Supabase Auth (JWT verification)
                        → SQLite / PostgreSQL (data persistence)
```

**Auth flow:**  
`/auth/signup` → `/auth/login` → `access_token` → `Authorization: Bearer <token>` → protected routes.

---

## API Reference

| Method | Endpoint | Auth | Status Codes |
|--------|----------|:----:|--------------|
| `POST` | `/auth/signup` | ❌ | 201, 400 |
| `POST` | `/auth/login` | ❌ | 200, 400, 401 |
| `POST` | `/auth/logout` | ✅ | 204, 401 |
| `GET` | `/public/info` | ❌ | 200 |
| `GET` | `/protected/profile` | ✅ | 200, 401 |
| `GET` | `/protected/dashboard` | ✅ | 200, 401 |
| `GET` | `/tasks` | ❌ | 200 |
| `GET` | `/tasks/:id` | ❌ | 200, 404 |
| `POST` | `/tasks` | ❌ | 201, 400 |
| `PUT` | `/tasks/:id` | ❌ | 200, 400, 404 |
| `DELETE` | `/tasks/:id` | ❌ | 204, 404 |
| `GET` | `/tasks/search?q=` | ❌ | 200, 400 |
| `GET` | `/tasks/filter?done=` | ❌ | 200, 400 |
| `GET` | `/tasks/recent?limit=` | ❌ | 200 |
| `GET` | `/stats` | ❌ | 200 |
| `DELETE` | `/tasks/clear?confirm=yes` | ❌ | 200, 400 |

**✅ = Auth required** · **❌ = Public**

---

## Database Schema

```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Seeded with 3 example tasks on first run only.

---

## Auth Implementation

| Component | File |
|-----------|------|
| Supabase client | `src/config/supabaseClient.js` |
| Auth routes | `src/routes/auth.js` |
| Middleware | `src/middleware/authMiddleware.js` |
| Swagger security | `src/swagger/swagger.js` |

**Verification:** `supabase.auth.getUser(token)` — network call, not local decode.

**401 vs 403:**  
- `401 Unauthorized` – missing or invalid token  
- `403 Forbidden` – authenticated but not permitted (not implemented, but distinction is clear)

---

## Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
PORT=3000
```

`.env` is gitignored — `.env.example` committed with placeholders.

---

## Docker

```bash
docker compose up
```

Starts PostgreSQL + API containers. Data persists via named volume.

---

## Project Structure

```
src/
├── config/
│   └── supabaseClient.js
├── middleware/
│   └── authMiddleware.js
├── routes/
│   └── auth.js
├── database/
│   ├── database.js      # SQLite (A2)
│   └── database-pg.js   # PostgreSQL (A3)
├── swagger/
│   └── swagger.js
└── server.js
tests/
└── test-api.js
```

---

## Test Commands

```bash
# Signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Login → copy access_token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Protected route
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/protected/profile

# CRUD
curl http://localhost:3000/tasks
```

---

## Status Codes

| Code | Meaning |
|:----:|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |

---

## Tech Stack

- **Runtime:** Node.js  
- **Framework:** Express  
- **Auth:** Supabase (JWT)  
- **Databases:** SQLite · PostgreSQL (Docker)  
- **Docs:** Swagger UI  
- **Drivers:** better-sqlite3 · pg

---

## Author

**Moscow Abdelaal**  
Backend AI Engineering Intern · FlyRank.ai


