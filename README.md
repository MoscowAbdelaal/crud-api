# CRUD API with SQLite

A RESTful CRUD API for managing tasks, built with **Express.js** and **SQLite**. Data persists after server restarts!

![Database Screenshot](./screenshot.png)

## 🚀 Features

### Core CRUD Operations
- ✅ **Create** tasks (POST /tasks)
- ✅ **Read** all tasks (GET /tasks)
- ✅ **Read** one task (GET /tasks/:id)
- ✅ **Update** tasks (PUT /tasks/:id)
- ✅ **Delete** tasks (DELETE /tasks/:id)

### Extra Features
- 🔍 **Search** tasks by title (GET /tasks/search?q=keyword)
- 🎯 **Filter** by completion status (GET /tasks/filter?done=true/false)
- 📊 **Statistics** dashboard (GET /stats)
- 📅 **Sort** by any field (GET /tasks?sort=title)
- 🕐 **Timestamps** (created_at, updated_at auto-tracked)
- 📋 **Recent tasks** (GET /tasks/recent?limit=5)
- 🗑️ **Clear and reseed** (DELETE /tasks/clear?confirm=yes)

## 📁 Database Schema

The database uses SQLite with a single table called `tasks`:

sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
Table Columns

Column	Type	Description
id	INTEGER	Primary key, auto-increments for each new task
title	TEXT	The task description (required, cannot be empty)
done	INTEGER	Task status: 0 = pending, 1 = completed (default: 0)
created_at	DATETIME	Timestamp when task was created (auto-set)
updated_at	DATETIME	Timestamp when task was last updated (auto-set)
🛠️ Technologies Used

Node.js - JavaScript runtime
Express.js - Web framework
better-sqlite3 - SQLite driver for Node.js
SQLite - Embedded database (single file)
📦 Installation

1. Clone the repository

bash
git clone https://github.com/MoscowAbdelaal/crud-api.git
cd crud-api
2. Install dependencies

bash
npm install
3. Start the server

bash
node server.js
4. Database auto-creation

The database (tasks.db) is created automatically on first run with:

A tasks table with all columns
3 example tasks (seeded only once)
🔧 API Endpoints

Core Endpoints

Method	Endpoint	Description
GET	/tasks	Get all tasks (add ?sort=title to sort)
GET	/tasks/:id	Get a single task by ID
POST	/tasks	Create a new task
PUT	/tasks/:id	Update a task
DELETE	/tasks/:id	Delete a task
Extra Endpoints

Method	Endpoint	Description
GET	/tasks/search?q=keyword	Search tasks by title
GET	/tasks/filter?done=true/false	Filter by completion status
GET	/tasks/recent?limit=5	Get recent tasks
GET	/stats	Get task statistics
DELETE	/tasks/clear?confirm=yes	Delete all tasks and reseed
📋 Usage Examples

Create a task

bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn SQLite"}'
Response:

json
{
    "id": 4,
    "title": "Learn SQLite",
    "done": 0,
    "created_at": "2024-01-15 10:30:45",
    "updated_at": "2024-01-15 10:30:45"
}
Get all tasks

bash
curl http://localhost:3000/tasks
Get a specific task

bash
curl http://localhost:3000/tasks/1
Update a task

bash
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"done": true}'
Delete a task

bash
curl -X DELETE http://localhost:3000/tasks/1
Search for tasks

bash
curl "http://localhost:3000/tasks/search?q=SQLite"
Filter by status

bash
# Get completed tasks
curl "http://localhost:3000/tasks/filter?done=true"

# Get pending tasks
curl "http://localhost:3000/tasks/filter?done=false"
Get statistics

bash
curl http://localhost:3000/stats
Response:

json
{
    "total": 5,
    "done": 2,
    "pending": 3,
    "completion_rate": "40.0%",
    "oldest_task": {
        "id": 1,
        "title": "Learn SQLite basics",
        "done": 0,
        "created_at": "2024-01-15 10:00:00",
        "updated_at": "2024-01-15 10:00:00"
    },
    "newest_task": {
        "id": 5,
        "title": "Deploy to production",
        "done": 0,
        "created_at": "2024-01-15 10:35:00",
        "updated_at": "2024-01-15 10:35:00"
    }
}
Sort tasks

bash
# Sort by title
curl "http://localhost:3000/tasks?sort=title"

# Sort by creation date
curl "http://localhost:3000/tasks?sort=created_at"
Get recent tasks

bash
curl "http://localhost:3000/tasks/recent?limit=3"
Delete all tasks and reseed

bash
curl -X DELETE "http://localhost:3000/tasks/clear?confirm=yes"
🧪 Running Tests

Start the server

bash
node server.js
Run the automated test suite (in another terminal)

bash
node test-api.js
Expected output:

text
🚀 Starting API Tests...
...
📊 TEST SUMMARY:
   ✅ Passed: 23
   ❌ Failed: 0
   📝 Total:  23
🎉 ALL TESTS PASSED!
📊 Database Browser

You can view and edit the database directly using:

DB Browser for SQLite (free): https://sqlitebrowser.org/

How to open your database:

Install DB Browser for SQLite
Open the app
Click "Open Database"
Select tasks.db from your project folder
Click "Browse Data" tab to see your tasks
Click "Execute SQL" tab to run custom queries
Example SQL Query

Here's a query you can run in DB Browser:

sql
-- Get all completed tasks
SELECT * FROM tasks WHERE done = 1;

-- Get tasks created today
SELECT * FROM tasks WHERE DATE(created_at) = DATE('now');

-- Get task statistics
SELECT 
    COUNT(*) as total,
    SUM(done) as completed,
    COUNT(*) - SUM(done) as pending
FROM tasks;
🗂️ Project Structure

text
crud-api/
├── .gitignore          # Files/folders ignored by Git
├── README.md           # Project documentation
├── package.json        # Node.js dependencies
├── package-lock.json   # Lock file for dependencies
├── server.js           # Main application with API endpoints
├── database.js         # Database connection and initialization
├── test-api.js         # 23 automated tests
├── screenshot.png      # DB Browser screenshot (optional)
└── tasks.db            # SQLite database (auto-created, gitignored)
🎯 Key Concepts Learned

✅ In-memory vs. persistent storage: Moving from memory to disk
✅ SQLite: Lightweight, file-based database
✅ CRUD operations: Create, Read, Update, Delete
✅ Parameterized queries: Safe SQL with ? placeholders
✅ Seeding: Initial data only on first run
✅ Data persistence: Surviving server restarts
✅ Timestamps: Auto-tracking creation and updates
✅ API design: RESTful endpoints with proper status codes
✅ Error handling: Validation and proper HTTP status codes
✅ Testing: Automated API testing
📝 Status Codes

Code	Meaning
200	OK - Request successful
201	Created - Resource created
204	No Content - Deletion successful
400	Bad Request - Invalid input
404	Not Found - Resource doesn't exist
500	Internal Server Error - Server issue
🔒 Why SQLite?

SQLite was chosen because:

Zero setup - No separate database server to install
Single file - Entire database is just tasks.db
Data persistence - Data survives server restarts
Lightweight - Perfect for small to medium applications
Built-in - Works everywhere with Node.js
No network - Database lives locally with your app
