// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback to .env for Docker

const { Pool } = require('pg');

// Use DATABASE_URL from environment, fallback to localhost
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:dev@localhost:5432/tasks';

const pool = new Pool({
    connectionString: connectionString,
});

// Test the connection
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL!');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        return false;
    }
}

// Create the tasks table if it doesn't exist
async function createTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            done BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    try {
        await pool.query(query);
        console.log('✅ Tasks table ready!');
        return true;
    } catch (error) {
        console.error('❌ Failed to create table:', error.message);
        throw error;
    }
}

// Seed example tasks only if the table is empty
async function seedTasks() {
    // Count existing tasks
    const countResult = await pool.query('SELECT COUNT(*) as count FROM tasks');
    const count = parseInt(countResult.rows[0].count);
    
    if (count > 0) {
        console.log(`📊 Table already has ${count} tasks, skipping seed`);
        return;
    }
    
    // Insert 3 example tasks with timestamps
    const exampleTasks = [
        ['Learn PostgreSQL basics', false],
        ['Build a CRUD API with Docker', false],
        ['Deploy containerized app', false]
    ];
    
    const insertQuery = `
        INSERT INTO tasks (title, done, created_at, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    for (const [title, done] of exampleTasks) {
        await pool.query(insertQuery, [title, done]);
    }
    
    console.log('🌱 Seeded 3 example tasks with timestamps!');
}

// Initialize the database
async function initDatabase() {
    try {
        await testConnection();
        await createTable();
        await seedTasks();
        console.log('📁 Database initialized successfully!');
        return pool;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    }
}

// Query helper functions
async function getAllTasks(sortBy = 'id') {
    const validSortFields = ['id', 'title', 'done', 'created_at', 'updated_at'];
    const sort = validSortFields.includes(sortBy) ? sortBy : 'id';
    const result = await pool.query(`SELECT * FROM tasks ORDER BY ${sort} ASC`);
    return result.rows;
}

async function getTaskById(id) {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    return result.rows[0] || null;
}

async function createTask(title) {
    const query = `
        INSERT INTO tasks (title, done, created_at, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
    `;
    const result = await pool.query(query, [title, false]);
    return result.rows[0];
}

async function updateTask(id, title, done) {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
    }
    
    if (done !== undefined) {
        updates.push(`done = $${paramIndex++}`);
        values.push(done);
    }
    
    if (updates.length === 0) {
        throw new Error('No fields to update');
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `
        UPDATE tasks 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
}

async function deleteTask(id) {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
}

module.exports = {
    pool,
    initDatabase,
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    testConnection
};