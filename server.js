const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// In-memory storage (this will be replaced by SQLite in Week 3)
let tasks = [];
let nextId = 1;

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ============================================
// CRUD ENDPOINTS FOR TASKS
// ============================================

// GET /tasks - Get all tasks
app.get('/tasks', (req, res) => {
    res.json(tasks);
});

// GET /tasks/:id - Get a single task by ID
app.get('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find(t => t.id === id);
    
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
});

// POST /tasks - Create a new task
app.post('/tasks', (req, res) => {
    const { title } = req.body;
    
    // Validation: title is required and cannot be empty
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required' });
    }
    
    const newTask = {
        id: nextId++,
        title: title.trim(),
        done: false
    };
    
    tasks.push(newTask);
    res.status(201).json(newTask);
});

// PUT /tasks/:id - Update an existing task
app.put('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { title, done } = req.body;
    
    // Find the task
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    // Validation: title must be provided and cannot be empty
    if (title !== undefined && title.trim() === '') {
        return res.status(400).json({ error: 'Title cannot be empty' });
    }
    
    // Update the task
    if (title !== undefined) {
        tasks[taskIndex].title = title.trim();
    }
    if (done !== undefined) {
        tasks[taskIndex].done = done;
    }
    
    res.json(tasks[taskIndex]);
});

// DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    tasks.splice(taskIndex, 1);
    res.status(204).send(); // No content
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Tasks API available at:`);
    console.log(`  GET    /tasks        - Get all tasks`);
    console.log(`  GET    /tasks/:id    - Get one task`);
    console.log(`  POST   /tasks        - Create a task`);
    console.log(`  PUT    /tasks/:id    - Update a task`);
    console.log(`  DELETE /tasks/:id    - Delete a task`);
});