
# 📋 CRUD API with PostgreSQL and Docker

A production-ready RESTful CRUD API for managing tasks, built with **Node.js**, **Express**, and **PostgreSQL** running in Docker containers.

![API Status](https://img.shields.io/badge/status-up-brightgreen)
![Docker](https://img.shields.io/badge/docker-✓-2496ED)
![PostgreSQL](https://img.shields.io/badge/postgresql-✓-4169E1)
![Node.js](https://img.shields.io/badge/node.js-✓-339933)

---

## 📑 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [📋 API Endpoints](#-api-endpoints)
- [🗄️ Database Schema](#-database-schema)
- [🔧 Development](#-development)
- [🧪 Testing](#-testing)
- [📁 Project Structure](#-project-structure)
- [🛠️ Technologies Used](#-technologies-used)
- [📝 Environment Variables](#-environment-variables)
- [📸 Screenshot](#-screenshot)
- [📄 License](#-license)

---

## 🚀 Quick Start

bash
# Clone the repository
git clone https://github.com/MoscowAbdelaal/crud-api.git
cd crud-api

# Switch to the week3-postgres branch
git checkout week3-postgres

# Copy environment template
cp .env.example .env

# Start everything with one command
docker compose up

# Your API is now running at http://localhost:3000


**That's it!** No manual database setup required. The database auto-creates and seeds with 3 example tasks on first run.

---

## 📋 API Endpoints

### Core CRUD Operations

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| GET | `/tasks` | Get all tasks (supports sorting) | 200 |
| GET | `/tasks/:id` | Get a single task by ID | 200, 404 |
| POST | `/tasks` | Create a new task | 201, 400 |
| PUT | `/tasks/:id` | Update an existing task | 200, 400, 404 |
| DELETE | `/tasks/:id` | Delete a task | 204, 404 |

### Extra Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks/search?q=keyword` | Search tasks by title |
| GET | `/tasks/filter?done=true/false` | Filter by completion status |
| GET | `/tasks/recent?limit=5` | Get recently added tasks |
| GET | `/stats` | Get task statistics dashboard |
| DELETE | `/tasks/clear?confirm=yes` | Delete all tasks and reseed |

### Example Responses

**GET /tasks**
json
[
    {
        "id": 1,
        "title": "Learn PostgreSQL basics",
        "done": false,
        "created_at": "2026-08-02T10:12:06.676Z",
        "updated_at": "2026-08-02T10:12:06.676Z"
    },
    {
        "id": 2,
        "title": "Build a CRUD API with Docker",
        "done": false,
        "created_at": "2026-08-02T10:12:06.677Z",
        "updated_at": "2026-08-02T10:12:06.677Z"
    }
]


**POST /tasks**
bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Docker"}'


**Response:**
json
{
    "id": 5,
    "title": "Learn Docker",
    "done": false,
    "created_at": "2026-08-02T10:30:45.123Z",
    "updated_at": "2026-08-02T10:30:45.123Z"
}


**GET /stats**
json
{
    "total": 5,
    "done": 2,
    "pending": 3,
    "completion_rate": "40.0%",
    "oldest_task": { ... },
    "newest_task": { ... }
}


---

## 🗄️ Database Schema

sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key, auto-increments |
| `title` | TEXT | Task description (required) |
| `done` | BOOLEAN | false = pending, true = completed |
| `created_at` | TIMESTAMP | Auto-set on creation |
| `updated_at` | TIMESTAMP | Auto-updated on change |

---

## 🔧 Development

### Local Development (without Docker)

bash
# Install dependencies
npm install

# Create .env.local
echo "DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks" > .env.local

# Start PostgreSQL in Docker
docker run --name taskdb \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=tasks \
  -p 5432:5432 \
  -v taskdata:/var/lib/postgresql \
  -d postgres:17-alpine

# Run the server
node server-pg.js


### With Docker Compose (Recommended)

bash
# Start everything (with logs visible)
docker compose up

# Start in background
docker compose up -d

# Stop everything
docker compose down

# Rebuild and start (after code changes)
docker compose up --build

# Stop and remove volumes (deletes all data)
docker compose down -v


### Common Docker Commands

bash
# Check running containers
docker compose ps

# View logs
docker compose logs

# View specific service logs
docker compose logs api
docker compose logs db

# Enter the database container
docker exec -it taskdb psql -U postgres -d tasks


---

## 🧪 Testing

### Test the API with curl

bash
# Health check
curl http://localhost:3000/health

# Get all tasks
curl http://localhost:3000/tasks

# Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Docker Compose"}'

# Update a task
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"done": true}'

# Delete a task
curl -X DELETE http://localhost:3000/tasks/1

# Search for tasks
curl "http://localhost:3000/tasks/search?q=Docker"

# Filter by status
curl "http://localhost:3000/tasks/filter?done=false"

# Get statistics
curl http://localhost:3000/stats

# Get recent tasks
curl "http://localhost:3000/tasks/recent?limit=3"

# Clear all tasks (destructive!)
curl -X DELETE "http://localhost:3000/tasks/clear?confirm=yes"


### Test Data Persistence

bash
# Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Persistent task"}'

# Stop everything
docker compose down

# Start again
docker compose up -d

# Verify data is still there
curl http://localhost:3000/tasks
# The task should still exist! 🎉


---

## 📁 Project Structure


crud-api/
├── .dockerignore              # Files ignored by Docker build
├── .env                       # Real secrets (gitignored)
├── .env.example               # Environment variable template
├── .env.local                 # Local development (gitignored)
├── .gitignore                 # Git ignore rules
├── compose.yaml               # Docker Compose configuration
├── database-pg.js             # PostgreSQL connection and queries
├── Dockerfile                 # Docker build instructions
├── package.json               # npm dependencies
├── package-lock.json          # Locked dependencies
├── README.md                  # This file
├── server-pg.js               # Main API with PostgreSQL
└── server.js                  # Original SQLite version


---

## 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web framework for REST APIs |
| **PostgreSQL** | Production-ready relational database |
| **pg** | PostgreSQL driver for Node.js |
| **Docker** | Containerization platform |
| **Docker Compose** | Multi-container orchestration |
| **dotenv** | Environment variable management |

---

## 📝 Environment Variables

### .env.example (Commit this to GitHub)
bash
# Database connection string for PostgreSQL
# Local development (running node server-pg.js directly)
DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks

# For Docker Compose (uncomment the line below)
# DATABASE_URL=postgres://postgres:dev@db:5432/tasks


### .env (DO NOT commit this - add to .gitignore)
bash
# Copy from .env.example and fill in your values
DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks


### .env.local (For local development, gitignored)
bash
# Local development overrides
DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks


---

## 🔒 Security Best Practices

1. **Never commit .env files** - Contains database passwords and secrets
2. **Use parameterized queries** - Prevents SQL injection (`$1, $2` placeholders)
3. **Environment variables** - Keep configuration out of code
4. **Health checks** - Docker Compose waits for database to be ready
5. **Minimal images** - Alpine-based containers for smaller size

---

## 🐳 Docker Explained

### Services in compose.yaml

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| **db** | postgres:17-alpine | 5432 | PostgreSQL database |
| **api** | Custom build | 3000 | Your Node.js API |

### Volumes

| Volume | Mount Point | Purpose |
|--------|-------------|---------|
| `taskdata` | `/var/lib/postgresql/data` | Persist database data |

### How It Works

1. `docker compose up` reads compose.yaml
2. Creates/updates the `taskdata` volume
3. Starts PostgreSQL with environment variables
4. Waits for health check to pass
5. Builds your app image (if needed)
6. Starts your app with DATABASE_URL pointing to `db:5432`
7. Your app connects and auto-creates tables/seeds data

---

## 📸 Screenshot

![Database in Docker](./screenshot.png)

---

## 🎯 Learning Outcomes

This project demonstrates:

- ✅ **Docker Containerization** - Running services in isolated containers
- ✅ **PostgreSQL** - Professional relational database in production
- ✅ **Docker Compose** - Multi-service orchestration
- ✅ **Data Persistence** - Volumes keep data across restarts
- ✅ **Security** - Environment variables and parameterized queries
- ✅ **API Design** - RESTful endpoints with proper status codes
- ✅ **Error Handling** - 400, 404, 500 responses
- ✅ **Separation of Concerns** - Database logic isolated in modules

---

## 🔄 Comparison: Storage Evolution

| Assignment | Storage | Runs On | Persistence |
|------------|---------|---------|-------------|
| **A1** | Memory (array) | Your program | ❌ Data lost on restart |
| **A2** | SQLite (tasks.db) | Your disk | ✅ Single file |
| **A3** | PostgreSQL | Docker container | ✅ Real database server |

---

## 📄 License

ISC

---

## 👤 Author

**Moscow Abdelaal**

- GitHub: [@MoscowAbdelaal](https://github.com/MoscowAbdelaal)
- LinkedIn: [Connect on LinkedIn](https://linkedin.com/in/moscowabdelaal)

---

## 🙏 Acknowledgments

- [FlyRank Internship Program](https://flyrank.ai)
- [Docker Documentation](https://docs.docker.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## ⭐ Support

If you found this project helpful, please give it a ⭐ on GitHub!

---

**Built with ❤️ by Moscow Abdelaal**


---

## 📝 Quick Summary

### Note Section for Submission
Copy the note above into your submission note section.

### README.md
Replace your entire README.md with the complete version above.

### Commands to Update Your README

bash
# Save the new README content
# (Copy the complete README above into README.md)

# Add and commit
git add README.md
git commit -m "Update README with complete documentation for Week 3"
git push origin week3-postgres


---

**Your assignment is now ready to submit!** 🚀
