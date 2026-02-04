// Socket.IO connection
const socket = io();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const roomsList = document.getElementById('rooms-list');
const usersList = document.getElementById('users-list');
const currentRoomElement = document.getElementById('current-room');
const currentUserElement = document.getElementById('current-user');
const userCountElement = document.getElementById('user-count');
const logoutBtn = document.getElementById('logout-btn');
const typingIndicator = document.getElementById('typing-indicator');
const createRoomBtn = document.getElementById('create-room-btn');
const createRoomModal = document.getElementById('create-room-modal');
const createRoomForm = document.getElementById('create-room-form');
const closeModalBtn = document.querySelector('.close');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const sidebar = document.querySelector('.sidebar');

// State
let currentUsername = '';
let currentRoom = 'General';
let typingTimeout = null;

// Login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  
  if (username.length >= 3) {
    currentUsername = username;
    joinRoom(currentRoom);
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');
    currentUserElement.textContent = currentUsername;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    
    // Load rooms
    socket.emit('get-rooms');
  }
});

// Join room
function joinRoom(room) {
  currentRoom = room;
  socket.emit('join-room', { username: currentUsername, room });
  currentRoomElement.textContent = room;
  messagesContainer.innerHTML = '';
}

// Send message
function sendMessage() {
  const message = messageInput.value.trim();
  
  if (message) {
    // Check for private message format: @username message
    if (message.startsWith('@')) {
      const parts = message.substring(1).split(' ');
      if (parts.length > 1) {
        const to = parts[0];
        const privateMessage = parts.slice(1).join(' ');
        socket.emit('private-message', { to, message: privateMessage });
        messageInput.value = '';
        return;
      }
    }
    
    socket.emit('chat-message', { message });
    messageInput.value = '';
    socket.emit('typing', { isTyping: false });
  }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Typing indicator
messageInput.addEventListener('input', () => {
  socket.emit('typing', { isTyping: true });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', { isTyping: false });
  }, 1000);
});

// Socket events
socket.on('room-joined', ({ room, users, messages }) => {
  messagesContainer.innerHTML = '';
  
  // Display history
  messages.forEach(msg => {
    displayMessage(msg);
  });
  
  // Update users list
  updateUsersList(users);
  
  // Scroll to bottom
  scrollToBottom();
});

socket.on('chat-message', (message) => {
  displayMessage(message);
  scrollToBottom();
});

socket.on('private-message', (message) => {
  displayPrivateMessage(message);
  scrollToBottom();
});

socket.on('user-joined', ({ username, users }) => {
  displaySystemMessage(`${username} joined the room`);
  updateUsersList(users);
  scrollToBottom();
});

socket.on('user-left', ({ username, users }) => {
  displaySystemMessage(`${username} left the room`);
  updateUsersList(users);
  scrollToBottom();
});

socket.on('user-typing', ({ username, isTyping }) => {
  if (isTyping) {
    typingIndicator.textContent = `${username} is typing...`;
  } else {
    typingIndicator.textContent = '';
  }
});

socket.on('rooms-list', (rooms) => {
  roomsList.innerHTML = '';
  
  rooms.forEach(room => {
    const roomElement = document.createElement('div');
    roomElement.className = 'room-item';
    if (room.name === currentRoom) {
      roomElement.classList.add('active');
    }
    roomElement.textContent = room.name;
    roomElement.addEventListener('click', () => {
      document.querySelectorAll('.room-item').forEach(r => r.classList.remove('active'));
      roomElement.classList.add('active');
      joinRoom(room.name);
      
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
      }
    });
    roomsList.appendChild(roomElement);
  });
});

socket.on('room-created', ({ name }) => {
  socket.emit('get-rooms');
  createRoomModal.classList.remove('active');
  createRoomForm.reset();
});

socket.on('error-message', ({ message }) => {
  alert(message);
});

// Display functions
function displayMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  
  if (message.username === currentUsername) {
    messageDiv.classList.add('own');
  }
  
  const headerDiv = document.createElement('div');
  headerDiv.className = 'message-header';
  
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'message-username';
  usernameSpan.textContent = message.username;
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = formatTime(message.created_at);
  
  headerDiv.appendChild(usernameSpan);
  headerDiv.appendChild(timeSpan);
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = message.message;
  
  messageDiv.appendChild(headerDiv);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
}

function displayPrivateMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message private';
  
  if (message.from === currentUsername) {
    messageDiv.classList.add('own');
  }
  
  const headerDiv = document.createElement('div');
  headerDiv.className = 'message-header';
  
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'message-username';
  usernameSpan.textContent = message.from === currentUsername ? 
    `To ${message.to}` : `From ${message.from}`;
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = formatTime(message.timestamp);
  
  headerDiv.appendChild(usernameSpan);
  headerDiv.appendChild(timeSpan);
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = message.message;
  
  messageDiv.appendChild(headerDiv);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
}

function displaySystemMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message system';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = text;
  
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
}

function updateUsersList(users) {
  usersList.innerHTML = '';
  userCountElement.textContent = users.length;
  
  users.forEach(username => {
    if (username === currentUsername) return;
    
    const userElement = document.createElement('div');
    userElement.className = 'user-item';
    userElement.textContent = username;
    userElement.title = 'Click to send private message';
    userElement.addEventListener('click', () => {
      messageInput.value = `@${username} `;
      messageInput.focus();
    });
    usersList.appendChild(userElement);
  });
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Logout
logoutBtn.addEventListener('click', () => {
  socket.disconnect();
  location.reload();
});

// Create room modal
createRoomBtn.addEventListener('click', () => {
  createRoomModal.classList.add('active');
});

closeModalBtn.addEventListener('click', () => {
  createRoomModal.classList.remove('active');
});

createRoomModal.addEventListener('click', (e) => {
  if (e.target === createRoomModal) {
    createRoomModal.classList.remove('active');
  }
});

createRoomForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('room-name-input').value.trim();
  const description = document.getElementById('room-description-input').value.trim();
  
  if (name) {
    socket.emit('create-room', { name, description });
  }
});

// Toggle sidebar on mobile
toggleSidebarBtn.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// Auto-focus message input
messageInput.addEventListener('blur', () => {
  setTimeout(() => {
    if (chatScreen.classList.contains('active')) {
      messageInput.focus();
    }
  }, 100);
});
