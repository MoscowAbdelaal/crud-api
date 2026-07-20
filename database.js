const Database = require('better-sqlite3');
const path = require('path');

// Create or open the database file
const db = new Database(path.join(__dirname, 'tasks.db'));

// Create the tasks table if it doesn't exist
function createTable() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            done INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.exec(createTableSQL);
    console.log('✅ Tasks table ready!');
    
    // Try to add columns if they don't exist (for existing databases)
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        console.log('✅ Added created_at column');
    } catch (e) {
        // Column already exists, that's fine
    }
    
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        console.log('✅ Added updated_at column');
    } catch (e) {
        // Column already exists, that's fine
    }
}

// Seed example tasks only if the table is empty
function seedTasks() {
    // Count existing tasks
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM tasks');
    const result = countStmt.get();
    
    // If there are already tasks, skip seeding
    if (result.count > 0) {
        console.log(`📊 Table already has ${result.count} tasks, skipping seed`);
        return;
    }
    
    // Insert 3 example tasks with timestamps
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
    
    console.log('🌱 Seeded 3 example tasks with timestamps!');
}

// Initialize the database
function initDatabase() {
    try {
        createTable();
        seedTasks();
        console.log('📁 Database initialized successfully!');
        return db;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    }
}

// Export the database connection and initialization function
module.exports = {
    db,
    initDatabase
};