const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'chat.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

// Initialize database tables
function initDatabase() {
    db.serialize(() => {
        // Create messages table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create admin users table
        db.run(`CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}

// Save message to database
function saveMessage(username, message) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT INTO messages (username, message) VALUES (?, ?)');
        stmt.run([username, message], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
        stmt.finalize();
    });
}

// Get last 50 messages
function getRecentMessages() {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT username, message, timestamp FROM messages ORDER BY timestamp DESC LIMIT 50',
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.reverse()); // Return in chronological order
                }
            }
        );
    });
}

// Add new admin user
function addAdminUser(username, password) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT INTO admin_users (username, password) VALUES (?, ?)');
        stmt.run([username, password], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
        stmt.finalize();
    });
}

// Verify admin user
function verifyAdminUser(username, password) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM admin_users WHERE username = ? AND password = ?',
            [username, password],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        );
    });
}

// Get all admin users
function getAllAdminUsers() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, username, created_at FROM admin_users', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Clear all messages
function clearMessages() {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM messages', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

module.exports = {
    saveMessage,
    getRecentMessages,
    addAdminUser,
    verifyAdminUser,
    getAllAdminUsers,
    clearMessages
}; 