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
            done INTEGER DEFAULT 0
        )
    `;
    db.exec(createTableSQL);
    console.log('✅ Tasks table ready!');
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
    
    // Insert 3 example tasks
    const insertStmt = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
    
    const exampleTasks = [
        ['Learn SQLite basics', 0],
        ['Build a CRUD API', 0],
        ['Deploy to production', 0]
    ];
    
    for (const [title, done] of exampleTasks) {
        insertStmt.run(title, done);
    }
    
    console.log('🌱 Seeded 3 example tasks!');
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