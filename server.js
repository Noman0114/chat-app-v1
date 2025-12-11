const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { saveMessage, getRecentMessages, addAdminUser, verifyAdminUser, getAllAdminUsers, clearMessages } = require('./db');
const crypto = require('crypto');

// Simple in-memory admin sessions
const adminSessions = new Map(); // token -> { username, createdAt }

// Middleware for parsing JSON
app.use(express.json());

// Store active sessions
const activeSessions = new Map();

// Serve static files from public directory
app.use(express.static('public'));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

// Admin login with known password (not exposed to frontend)
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Password required' });
    if (password !== 'nomanahmad0114') return res.status(401).json({ error: 'Invalid password' });
    const token = crypto.randomBytes(24).toString('hex');
    adminSessions.set(token, { username: 'admin', createdAt: Date.now() });
    res.json({ token });
});

function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (!token || !adminSessions.has(token)) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

// API endpoint to list current online users
app.get('/api/admin/users', requireAdmin, (req, res) => {
    const users = Array.from(activeSessions.keys());
    res.json({ users });
});

// API endpoint to clear all chat messages
app.post('/api/admin/clear', requireAdmin, async (req, res) => {
    try {
        await clearMessages();
        io.emit('chat cleared');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear messages' });
    }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
    console.log('A user connected');

    // Send recent messages to newly connected user
    try {
        const recentMessages = await getRecentMessages();
        socket.emit('load messages', recentMessages);
    } catch (err) {
        console.error('Error loading messages:', err);
    }

    // Handle user self-join (no password)
    socket.on('join', (usernameRaw) => {
        const username = (usernameRaw || '').trim();
        if (!username) return socket.emit('auth error', 'Username is required');

        // Enforce single session per username
        if (activeSessions.has(username)) {
            const previousSocket = activeSessions.get(username);
            if (previousSocket && previousSocket.id !== socket.id) {
                previousSocket.emit('force logout', 'You were logged out due to a new login');
                previousSocket.disconnect(true);
            }
        }

        activeSessions.set(username, socket);
        socket.username = username;
        socket.isAdmin = false;
        io.emit('user joined', username);
        console.log(`User ${username} joined the chat`);
    });

    // Handle chat message
    socket.on('chat message', async (msg) => {
        if (socket.username && msg && msg.trim() !== '') {
            const messageData = {
                username: socket.username,
                message: msg.trim(),
                timestamp: new Date().toISOString()
            };

            try {
                // Save message to database
                await saveMessage(socket.username, msg.trim());
                // Broadcast message to all clients
                io.emit('chat message', messageData);
                console.log(`Message from ${socket.username}: ${msg}`);
            } catch (err) {
                console.error('Error saving message:', err);
                socket.emit('error', 'Failed to save message');
            }
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.username) {
            // Remove from active sessions
            if (activeSessions.get(socket.username)?.id === socket.id) {
                activeSessions.delete(socket.username);
            }
            // Notify everyone that a user has left
            io.emit('user left', socket.username);
            console.log(`User ${socket.username} disconnected`);
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3002;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 