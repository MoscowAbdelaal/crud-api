# CRUD API with SQLite

A RESTful CRUD API for managing tasks, built with Express.js and SQLite. Data persists after server restarts!

## Features

- ✅ Create tasks (POST /tasks)
- ✅ Read all tasks (GET /tasks)
- ✅ Read one task (GET /tasks/:id)
- ✅ Update tasks (PUT /tasks/:id)
- ✅ Delete tasks (DELETE /tasks/:id)
- ✅ **Data persistence with SQLite** - tasks survive server restarts!

## Why SQLite?

SQLite was chosen because:
- **Zero setup** - No separate database server to install
- **Single file** - The entire database is just `tasks.db`
- **Data persistence** - Data survives server restarts (unlike in-memory storage)
- **Lightweight** - Perfect for small to medium applications
- **Built-in** - Works everywhere with Node.js

## Technologies Used

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **better-sqlite3** - SQLite driver for Node.js
- **SQLite** - Embedded database

## Setup

### 1. Clone the repository
bash
git clone https://github.com/MoscowAbdelaal/crud-api.git
cd crud-api

## Running Tests

To run the automated test suite:

bash
# Make sure the server is running
node server.js

# In another terminal, run the tests
node test-api.js
