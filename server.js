const express = require('express');
const { db, initDatabase } = require('./database');

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Initialize the database
initDatabase();

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ============================================
// CORE CRUD ENDPOINTS
// ============================================

// GET /tasks - Get all tasks with optional sorting
app.get('/tasks', (req, res) => {
    try {
        const sort = req.query.sort || 'id';
        const validSortFields = ['id', 'title', 'done', 'created_at', 'updated_at'];
        
        if (!validSortFields.includes(sort)) {
            return res.status(400).json({ error: 'Invalid sort field. Valid: id, title, done, created_at, updated_at' });
        }
        
        const stmt = db.prepare(`SELECT * FROM tasks ORDER BY ${sort} ASC`);
        const tasks = stmt.all();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /tasks/:id - Get a single task by ID
app.get('/tasks/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const task = stmt.get(id);
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /tasks - Create a new task
app.post('/tasks', (req, res) => {
    try {
        const { title } = req.body;
        
        // Validation: title is required and cannot be empty
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const stmt = db.prepare(`
            INSERT INTO tasks (title, done, created_at, updated_at) 
            VALUES (?, ?, datetime('now'), datetime('now'))
        `);
        const info = stmt.run(title.trim(), 0);
        
        // Get the newly created task
        const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const newTask = getStmt.get(info.lastInsertRowid);
        
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT /tasks/:id - Update an existing task
app.put('/tasks/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, done } = req.body;
        
        // First check if task exists
        const checkStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const existingTask = checkStmt.get(id);
        
        if (!existingTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Validation: title cannot be empty
        if (title !== undefined && title.trim() === '') {
            return res.status(400).json({ error: 'Title cannot be empty' });
        }
        
        // Build update query dynamically
        let updateFields = [];
        let updateValues = [];
        
        if (title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(title.trim());
        }
        
        if (done !== undefined) {
            updateFields.push('done = ?');
            updateValues.push(done ? 1 : 0);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        // Always update the updated_at timestamp
        updateFields.push('updated_at = datetime("now")');
        updateValues.push(id);
        
        const updateSQL = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
        const updateStmt = db.prepare(updateSQL);
        updateStmt.run(...updateValues);
        
        // Get the updated task
        const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const updatedTask = getStmt.get(id);
        
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        // First check if task exists
        const checkStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const existingTask = checkStmt.get(id);
        
        if (!existingTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
        stmt.run(id);
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// ============================================
// EXTRA FEATURES
// ============================================

// GET /tasks/search?q=keyword - Search tasks by title
app.get('/tasks/search', (req, res) => {
    try {
        const searchTerm = req.query.q;
        
        if (!searchTerm || searchTerm.trim() === '') {
            return res.status(400).json({ error: 'Search term is required' });
        }
        
        const stmt = db.prepare('SELECT * FROM tasks WHERE title LIKE ? ORDER BY title ASC');
        const tasks = stmt.all(`%${searchTerm.trim()}%`);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /tasks/filter?done=true - Filter by completion status
app.get('/tasks/filter', (req, res) => {
    try {
        const done = req.query.done;
        
        if (done === undefined) {
            return res.status(400).json({ error: 'done parameter is required (true or false)' });
        }
        
        const doneValue = done === 'true' ? 1 : 0;
        const stmt = db.prepare('SELECT * FROM tasks WHERE done = ? ORDER BY id ASC');
        const tasks = stmt.all(doneValue);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /stats - Get task statistics
app.get('/stats', (req, res) => {
    try {
        const totalStmt = db.prepare('SELECT COUNT(*) as total FROM tasks');
        const total = totalStmt.get();
        
        const doneStmt = db.prepare('SELECT COUNT(*) as done FROM tasks WHERE done = 1');
        const done = doneStmt.get();
        
        const pendingStmt = db.prepare('SELECT COUNT(*) as pending FROM tasks WHERE done = 0');
        const pending = pendingStmt.get();
        
        // Get oldest and newest tasks
        const oldestStmt = db.prepare('SELECT * FROM tasks ORDER BY created_at ASC LIMIT 1');
        const oldest = oldestStmt.get();
        
        const newestStmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 1');
        const newest = newestStmt.get();
        
        res.json({
            total: total.total,
            done: done.done,
            pending: pending.pending,
            completion_rate: total.total > 0 ? (done.done / total.total * 100).toFixed(1) + '%' : '0%',
            oldest_task: oldest || null,
            newest_task: newest || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /tasks/recent - Get recently added tasks
app.get('/tasks/recent', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?');
        const tasks = stmt.all(limit);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE /tasks/clear - Delete all tasks (warning: destructive!)
app.delete('/tasks/clear', (req, res) => {
    try {
        const confirm = req.query.confirm;
        
        if (confirm !== 'yes') {
            return res.status(400).json({ 
                error: 'This will delete ALL tasks. Add ?confirm=yes to proceed.' 
            });
        }
        
        const stmt = db.prepare('DELETE FROM tasks');
        stmt.run();
        
        // Reset auto-increment
        db.exec('DELETE FROM sqlite_sequence WHERE name="tasks"');
        
        // Re-seed the tasks
        const insertStmt = db.prepare('INSERT INTO tasks (title, done, created_at, updated_at) VALUES (?, ?, datetime("now"), datetime("now"))');
        const exampleTasks = [
            ['Learn SQLite basics', 0],
            ['Build a CRUD API', 0],
            ['Deploy to production', 0]
        ];
        
        for (const [title, done] of exampleTasks) {
            insertStmt.run(title, done);
        }
        
        res.json({ message: 'All tasks deleted and reseeded with example tasks!' });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// ============================================
// START THE SERVER
// ============================================
app.listen(PORT, () => {
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