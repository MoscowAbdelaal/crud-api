// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback to .env for Docker

// If no DATABASE_URL is set, use localhost for local development
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgres://postgres:dev@localhost:5432/tasks';
}

const express = require('express');
const { initDatabase, getAllTasks, getTaskById, createTask, updateTask, deleteTask } = require('./database-pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// ============================================
// DATABASE INITIALIZATION
// ============================================

let dbInitialized = false;

async function initializeDB() {
    if (!dbInitialized) {
        try {
            await initDatabase();
            dbInitialized = true;
            console.log('✅ Database ready!');
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            process.exit(1);
        }
    }
}

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/health', async (req, res) => {
    await initializeDB();
    res.json({ status: 'ok' });
});

// ============================================
// CORE CRUD ENDPOINTS
// ============================================

// GET /tasks - Get all tasks with optional sorting
app.get('/tasks', async (req, res) => {
    try {
        await initializeDB();
        const sort = req.query.sort || 'id';
        const validSortFields = ['id', 'title', 'done', 'created_at', 'updated_at'];
        
        if (!validSortFields.includes(sort)) {
            return res.status(400).json({ error: 'Invalid sort field. Valid: id, title, done, created_at, updated_at' });
        }
        
        const tasks = await getAllTasks(sort);
        res.json(tasks);
    } catch (error) {
        console.error('Error in GET /tasks:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /tasks/:id - Get a single task by ID
app.get('/tasks/:id', async (req, res) => {
    try {
        await initializeDB();
        const id = parseInt(req.params.id);
        const task = await getTaskById(id);
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json(task);
    } catch (error) {
        console.error('Error in GET /tasks/:id:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /tasks - Create a new task
app.post('/tasks', async (req, res) => {
    try {
        await initializeDB();
        const { title } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const newTask = await createTask(title.trim());
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error in POST /tasks:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT /tasks/:id - Update an existing task
app.put('/tasks/:id', async (req, res) => {
    try {
        await initializeDB();
        const id = parseInt(req.params.id);
        const { title, done } = req.body;
        
        if (title !== undefined && title.trim() === '') {
            return res.status(400).json({ error: 'Title cannot be empty' });
        }
        
        const updatedTask = await updateTask(id, title, done);
        
        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json(updatedTask);
    } catch (error) {
        console.error('Error in PUT /tasks/:id:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', async (req, res) => {
    try {
        await initializeDB();
        const id = parseInt(req.params.id);
        const deleted = await deleteTask(id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        console.error('Error in DELETE /tasks/:id:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// ============================================
// EXTRA FEATURES
// ============================================

// GET /tasks/search?q=keyword - Search tasks by title
app.get('/tasks/search', async (req, res) => {
    try {
        await initializeDB();
        const searchTerm = req.query.q;
        
        if (!searchTerm || searchTerm.trim() === '') {
            return res.status(400).json({ error: 'Search term is required' });
        }
        
        const { pool } = require('./database-pg');
        const result = await pool.query(
            'SELECT * FROM tasks WHERE title ILIKE $1 ORDER BY title ASC',
            [`%${searchTerm.trim()}%`]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error in GET /tasks/search:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /tasks/filter?done=true - Filter by completion status
app.get('/tasks/filter', async (req, res) => {
    try {
        await initializeDB();
        const done = req.query.done;
        
        if (done === undefined) {
            return res.status(400).json({ error: 'done parameter is required (true or false)' });
        }
        
        const doneValue = done === 'true';
        const { pool } = require('./database-pg');
        const result = await pool.query(
            'SELECT * FROM tasks WHERE done = $1 ORDER BY id ASC',
            [doneValue]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error in GET /tasks/filter:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /stats - Get task statistics
app.get('/stats', async (req, res) => {
    try {
        await initializeDB();
        const { pool } = require('./database-pg');
        const totalResult = await pool.query('SELECT COUNT(*) as total FROM tasks');
        const doneResult = await pool.query('SELECT COUNT(*) as done FROM tasks WHERE done = true');
        const pendingResult = await pool.query('SELECT COUNT(*) as pending FROM tasks WHERE done = false');
        
        const oldestResult = await pool.query('SELECT * FROM tasks ORDER BY created_at ASC LIMIT 1');
        const newestResult = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 1');
        
        const total = parseInt(totalResult.rows[0].total);
        const done = parseInt(doneResult.rows[0].done);
        const pending = parseInt(pendingResult.rows[0].pending);
        
        res.json({
            total,
            done,
            pending,
            completion_rate: total > 0 ? (done / total * 100).toFixed(1) + '%' : '0%',
            oldest_task: oldestResult.rows[0] || null,
            newest_task: newestResult.rows[0] || null
        });
    } catch (error) {
        console.error('Error in GET /stats:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /tasks/recent - Get recently added tasks
app.get('/tasks/recent', async (req, res) => {
    try {
        await initializeDB();
        const limit = parseInt(req.query.limit) || 5;
        const { pool } = require('./database-pg');
        const result = await pool.query(
            'SELECT * FROM tasks ORDER BY created_at DESC LIMIT $1',
            [limit]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error in GET /tasks/recent:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE /tasks/clear - Delete all tasks (warning: destructive!)
app.delete('/tasks/clear', async (req, res) => {
    try {
        await initializeDB();
        const confirm = req.query.confirm;
        
        if (confirm !== 'yes') {
            return res.status(400).json({ 
                error: 'This will delete ALL tasks. Add ?confirm=yes to proceed.' 
            });
        }
        
        const { pool } = require('./database-pg');
        await pool.query('DELETE FROM tasks');
        await pool.query('ALTER SEQUENCE tasks_id_seq RESTART WITH 1');
        
        // Re-seed the tasks
        const insertQuery = `
            INSERT INTO tasks (title, done, created_at, updated_at) 
            VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        const exampleTasks = [
            ['Learn PostgreSQL basics', false],
            ['Build a CRUD API with Docker', false],
            ['Deploy containerized app', false]
        ];
        
        for (const [title, done] of exampleTasks) {
            await pool.query(insertQuery, [title, done]);
        }
        
        res.json({ message: 'All tasks deleted and reseeded with example tasks!' });
    } catch (error) {
        console.error('Error in DELETE /tasks/clear:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// ============================================
// START THE SERVER
// ============================================
app.listen(PORT, async () => {
    // Initialize database before server starts
    await initializeDB();
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`\n📋 TASKS API:`);
    console.log(`  GET    /tasks                    - Get all tasks (add ?sort=title to sort)`);
    console.log(`  GET    /tasks/:id                - Get one task`);
    console.log(`  POST   /tasks                    - Create a task`);
    console.log(`  PUT    /tasks/:id                - Update a task`);
    console.log(`  DELETE /tasks/:id                - Delete a task`);
    console.log(`\n🔍 EXTRA FEATURES:`);
    console.log(`  GET    /tasks/search?q=keyword   - Search tasks by title`);
    console.log(`  GET    /tasks/filter?done=true   - Filter by completion status`);
    console.log(`  GET    /tasks/recent?limit=5     - Get recent tasks`);
    console.log(`  GET    /stats                    - Get task statistics`);
    console.log(`  DELETE /tasks/clear?confirm=yes  - Delete all tasks and reseed`);
});