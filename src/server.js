const express = require('express');
const dotenv = require('dotenv');
const Database = require('better-sqlite3');
const authRoutes = require('./routes/auth');
const { verifyToken } = require('./middleware/authMiddleware');
const { setupSwagger } = require('./swagger/swagger');

// Load environment variables
dotenv.config();

// ============================================
// DATABASE INITIALIZATION (A2)
// ============================================

const db = new Database('tasks.db');

// Create tasks table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Seed example tasks only if the table is empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM tasks');
const result = countStmt.get();

if (result.count === 0) {
    const insertStmt = db.prepare(`
        INSERT INTO tasks (title, done, created_at, updated_at) 
        VALUES (?, ?, datetime('now'), datetime('now'))
    `);
    const exampleTasks = [
        ['Learn SQLite basics', 0],
        ['Build a CRUD API', 0],
        ['Deploy to production', 0]
    ];
    for (const [title, done] of exampleTasks) {
        insertStmt.run(title, done);
    }
    console.log('🌱 Seeded 3 example tasks');
}

console.log('✅ SQLite database ready');

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// ============================================
// SWAGGER UI (A4)
// ============================================

setupSwagger(app);

// ============================================
// AUTH ROUTES (A4)
// ============================================

app.use('/auth', authRoutes);

// ============================================
// PUBLIC ROUTES (A4)
// ============================================

app.get('/public/info', (req, res) => {
    res.status(200).json({
        message: 'Welcome stranger! This info is public.',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// PROTECTED ROUTES (A4)
// ============================================

app.get('/protected/profile', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        res.status(200).json({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            message: 'This is your protected profile data'
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/protected/dashboard', verifyToken, async (req, res) => {
    try {
        res.status(200).json({
            message: 'Welcome to your dashboard!',
            user: req.user.email,
            stats: {
                tasks: db.prepare('SELECT COUNT(*) as total FROM tasks').get().total,
                projects: 0
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// CRUD ENDPOINTS (A1 & A2)
// ============================================

// GET /tasks - Get all tasks
app.get('/tasks', (req, res) => {
    try {
        const sort = req.query.sort || 'id';
        const validSortFields = ['id', 'title', 'done', 'created_at', 'updated_at'];
        
        if (!validSortFields.includes(sort)) {
            return res.status(400).json({ error: 'Invalid sort field' });
        }
        
        const stmt = db.prepare(`SELECT * FROM tasks ORDER BY ${sort} ASC`);
        const tasks = stmt.all();
        res.json(tasks);
    } catch (error) {
        console.error('Error in GET /tasks:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /tasks/:id - Get a single task
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
        console.error('Error in GET /tasks/:id:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /tasks - Create a new task
app.post('/tasks', (req, res) => {
    try {
        const { title } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const stmt = db.prepare(`
            INSERT INTO tasks (title, done, created_at, updated_at) 
            VALUES (?, ?, datetime('now'), datetime('now'))
        `);
        const info = stmt.run(title.trim(), 0);
        
        const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const newTask = getStmt.get(info.lastInsertRowid);
        
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error in POST /tasks:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT /tasks/:id - Update a task
app.put('/tasks/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, done } = req.body;
        
        const checkStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const existingTask = checkStmt.get(id);
        
        if (!existingTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        if (title !== undefined && title.trim() === '') {
            return res.status(400).json({ error: 'Title cannot be empty' });
        }
        
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
        
        updateFields.push('updated_at = datetime("now")');
        updateValues.push(id);
        
        const updateSQL = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
        const updateStmt = db.prepare(updateSQL);
        updateStmt.run(...updateValues);
        
        const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const updatedTask = getStmt.get(id);
        
        res.json(updatedTask);
    } catch (error) {
        console.error('Error in PUT /tasks/:id:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const checkStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const existingTask = checkStmt.get(id);
        
        if (!existingTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
        stmt.run(id);
        
        res.status(204).send();
    } catch (error) {
        console.error('Error in DELETE /tasks/:id:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// ============================================
// EXTRA FEATURES (from A2)
// ============================================

// GET /tasks/search - Search tasks by title
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
        console.error('Error in GET /tasks/search:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /tasks/filter - Filter by completion status
app.get('/tasks/filter', (req, res) => {
    try {
        const done = req.query.done;
        
        if (done === undefined) {
            return res.status(400).json({ error: 'done parameter is required' });
        }
        
        const doneValue = done === 'true' ? 1 : 0;
        const stmt = db.prepare('SELECT * FROM tasks WHERE done = ? ORDER BY id ASC');
        const tasks = stmt.all(doneValue);
        res.json(tasks);
    } catch (error) {
        console.error('Error in GET /tasks/filter:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /stats - Task statistics
app.get('/stats', (req, res) => {
    try {
        const totalStmt = db.prepare('SELECT COUNT(*) as total FROM tasks');
        const total = totalStmt.get();
        
        const doneStmt = db.prepare('SELECT COUNT(*) as done FROM tasks WHERE done = 1');
        const done = doneStmt.get();
        
        const pendingStmt = db.prepare('SELECT COUNT(*) as pending FROM tasks WHERE done = 0');
        const pending = pendingStmt.get();
        
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
        console.error('Error in GET /stats:', error.message);
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
        console.error('Error in GET /tasks/recent:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE /tasks/clear - Delete all tasks and reseed
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
        
        db.exec('DELETE FROM sqlite_sequence WHERE name="tasks"');
        
        const insertStmt = db.prepare(`
            INSERT INTO tasks (title, done, created_at, updated_at) 
            VALUES (?, ?, datetime("now"), datetime("now"))
        `);
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
        console.error('Error in DELETE /tasks/clear:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', supabase: 'connected' });
});

// ============================================
// START THE SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📚 Swagger UI at http://localhost:${PORT}/docs`);
    console.log(`\n📋 AUTH ENDPOINTS (A4):`);
    console.log(`  POST  /auth/signup            - Create a new user account`);
    console.log(`  POST  /auth/login             - Login and get JWT token`);
    console.log(`  POST  /auth/logout            - Logout (protected)`);
    console.log(`\n🔓 PUBLIC ROUTES (A4):`);
    console.log(`  GET   /public/info            - Public information (no auth)`);
    console.log(`\n🔒 PROTECTED ROUTES (A4):`);
    console.log(`  GET   /protected/profile      - Get user profile (requires auth)`);
    console.log(`  GET   /protected/dashboard    - User dashboard (requires auth)`);
    console.log(`\n📋 CRUD ENDPOINTS (A1-A3):`);
    console.log(`  GET    /tasks                 - Get all tasks`);
    console.log(`  GET    /tasks/:id             - Get one task`);
    console.log(`  POST   /tasks                 - Create a task`);
    console.log(`  PUT    /tasks/:id             - Update a task`);
    console.log(`  DELETE /tasks/:id             - Delete a task`);
    console.log(`  GET    /tasks/search?q=       - Search tasks`);
    console.log(`  GET    /tasks/filter?done=    - Filter by status`);
    console.log(`  GET    /tasks/recent?limit=   - Get recent tasks`);
    console.log(`  GET    /stats                 - Get task statistics`);
    console.log(`  DELETE /tasks/clear?confirm=yes - Clear all tasks`);
});