const express = require('express');
const { db, initDatabase } = require('./database');

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Initialize the database
initDatabase();

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// GET all tasks - NOW FROM DATABASE
app.get('/tasks', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM tasks');
        const tasks = stmt.all();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET one task - NOW FROM DATABASE
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

// POST create task - NOW SAVED TO DATABASE
app.post('/tasks', (req, res) => {
    try {
        const { title } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const stmt = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
        const info = stmt.run(title.trim(), 0);
        
        // Get the newly created task
        const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const newTask = getStmt.get(info.lastInsertRowid);
        
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT update task - NOW UPDATES DATABASE
app.put('/tasks/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, done } = req.body;
        
        // Check if task exists
        const checkStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const existingTask = checkStmt.get(id);
        
        if (!existingTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        if (title !== undefined && title.trim() === '') {
            return res.status(400).json({ error: 'Title cannot be empty' });
        }
        
        // Build update query
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
        
        updateValues.push(id);
        const updateSQL = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
        const updateStmt = db.prepare(updateSQL);
        updateStmt.run(...updateValues);
        
        // Get updated task
        const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
        const updatedTask = getStmt.get(id);
        
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE task - NOW DELETES FROM DATABASE
app.delete('/tasks/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        // Check if task exists
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

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📋 Tasks API with SQLite!`);
});