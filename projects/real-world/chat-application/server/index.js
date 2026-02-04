require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Message = require('./models/Message');
const User = require('./models/User');
const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3001;

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory store for active users
const activeUsers = new Map(); // socketId -> { username, room, userId }
const roomUsers = new Map(); // roomName -> Set of usernames

// Initialize default rooms
const defaultRooms = ['General', 'Technology', 'Random', 'Gaming'];
defaultRooms.forEach(roomName => {
  if (!Room.findByName(roomName)) {
    Room.create({ name: roomName, description: `${roomName} chat room` });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', ({ username, room }) => {
    // Create or get user
    let user = User.findByUsername(username);
    if (!user) {
      const userId = User.create({ username });
      user = User.findById(userId);
    }

    // Leave previous room if any
    const previousData = activeUsers.get(socket.id);
    if (previousData) {
      socket.leave(previousData.room);
      removeUserFromRoom(previousData.room, previousData.username);
      io.to(previousData.room).emit('user-left', {
        username: previousData.username,
        users: getRoomUsers(previousData.room)
      });
    }

    // Join new room
    socket.join(room);
    activeUsers.set(socket.id, { username, room, userId: user.id });
    addUserToRoom(room, username);

    // Get room history
    const messages = Message.getByRoom(room, 50);

    // Send room info to user
    socket.emit('room-joined', {
      room,
      users: getRoomUsers(room),
      messages
    });

    // Notify others
    socket.to(room).emit('user-joined', {
      username,
      users: getRoomUsers(room)
    });

    // Update user's last seen
    User.updateLastSeen(user.id);
  });

  // Handle chat message
  socket.on('chat-message', ({ message }) => {
    const userData = activeUsers.get(socket.id);
    if (!userData) return;

    const { username, room, userId } = userData;

    // Save message to database
    const messageId = Message.create({
      room,
      user_id: userId,
      username,
      message,
      type: 'message'
    });

    const savedMessage = Message.findById(messageId);

    // Broadcast to room
    io.to(room).emit('chat-message', savedMessage);
  });

  // Handle private message
  socket.on('private-message', ({ to, message }) => {
    const userData = activeUsers.get(socket.id);
    if (!userData) return;

    const { username, userId } = userData;

    // Find recipient socket
    let recipientSocketId = null;
    for (const [socketId, data] of activeUsers.entries()) {
      if (data.username === to) {
        recipientSocketId = socketId;
        break;
      }
    }

    if (recipientSocketId) {
      const messageData = {
        from: username,
        to,
        message,
        timestamp: new Date().toISOString(),
        type: 'private'
      };

      // Send to recipient
      io.to(recipientSocketId).emit('private-message', messageData);
      // Send back to sender
      socket.emit('private-message', messageData);

      // Save to database (optional - using room as 'private')
      Message.create({
        room: 'private',
        user_id: userId,
        username,
        message: `[To ${to}] ${message}`,
        type: 'private'
      });
    } else {
      socket.emit('error-message', { message: 'User not found or offline' });
    }
  });

  // Handle typing indicator
  socket.on('typing', ({ isTyping }) => {
    const userData = activeUsers.get(socket.id);
    if (!userData) return;

    const { username, room } = userData;
    socket.to(room).emit('user-typing', { username, isTyping });
  });

  // Get room list
  socket.on('get-rooms', () => {
    const rooms = Room.getAll();
    socket.emit('rooms-list', rooms);
  });

  // Create new room
  socket.on('create-room', ({ name, description }) => {
    const existing = Room.findByName(name);
    if (existing) {
      socket.emit('error-message', { message: 'Room already exists' });
      return;
    }

    Room.create({ name, description: description || '' });
    io.emit('room-created', { name, description });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userData = activeUsers.get(socket.id);
    if (userData) {
      const { username, room } = userData;
      removeUserFromRoom(room, username);
      
      io.to(room).emit('user-left', {
        username,
        users: getRoomUsers(room)
      });

      activeUsers.delete(socket.id);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Helper functions
function addUserToRoom(room, username) {
  if (!roomUsers.has(room)) {
    roomUsers.set(room, new Set());
  }
  roomUsers.get(room).add(username);
}

function removeUserFromRoom(room, username) {
  if (roomUsers.has(room)) {
    roomUsers.get(room).delete(username);
    if (roomUsers.get(room).size === 0) {
      roomUsers.delete(room);
    }
  }
}

function getRoomUsers(room) {
  return Array.from(roomUsers.get(room) || []);
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeUsers: activeUsers.size,
    activeRooms: roomUsers.size
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Chat application running on http://localhost:${PORT}`);
});
