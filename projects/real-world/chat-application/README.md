# Real-Time Chat Application

A feature-rich real-time chat application built with Socket.IO, featuring multiple chat rooms, private messaging, user presence, and message persistence.

## Features

- **Real-time Communication**: Instant messaging using WebSocket (Socket.IO)
- **Multiple Chat Rooms**: Create and join different chat rooms
- **Private Messaging**: Send direct messages to specific users
- **User Presence**: See who's online in your current room
- **Message Persistence**: Messages are saved to SQLite database
- **Typing Indicators**: See when other users are typing
- **Message History**: Load previous messages when joining a room
- **Responsive Design**: Works perfectly on desktop and mobile
- **Room Management**: Create custom chat rooms

## Technology Stack

- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Database**: SQLite with better-sqlite3
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## Installation

1. **Navigate to the project directory**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file** (optional):
   ```
   PORT=3001
   DATABASE_PATH=./chat.db
   ```

5. **Initialize the database**:
   ```bash
   npm run init-db
   ```

## Usage

### Start the server

**Development mode** (with auto-restart):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The application will be available at `http://localhost:3001`

## How to Use

### Getting Started

1. **Enter Your Nickname**: Choose a unique nickname (3-20 characters)
2. **Join a Room**: You'll automatically join the "General" room
3. **Start Chatting**: Type messages and press Enter or click Send

### Chat Rooms

**Default Rooms**:
- General
- Technology
- Random
- Gaming

**Create New Room**:
1. Click the "+" button in the sidebar
2. Enter room name and optional description
3. Click "Create Room"

**Switch Rooms**:
- Click on any room name in the sidebar

### Private Messaging

To send a private message to a user:
1. Click on their name in the "Online Users" list, or
2. Type `@username your message` in the message input

Example: `@john Hello, how are you?`

### Features Overview

- **Typing Indicators**: See when someone is typing in your room
- **User Count**: View how many users are in the current room
- **Message History**: Previous messages load when you join a room
- **Auto-scroll**: Messages automatically scroll to the latest
- **Responsive**: Toggle sidebar on mobile devices

## Project Structure

```
chat-application/
├── server/
│   ├── index.js          # Main server and Socket.IO logic
│   ├── database.js       # Database configuration
│   └── init-db.js        # Database initialization script
├── models/
│   ├── Message.js        # Message model
│   ├── User.js           # User model
│   └── Room.js           # Room model
├── public/
│   ├── index.html        # Main HTML file
│   ├── css/
│   │   └── style.css     # Styles
│   └── js/
│       └── app.js        # Client-side JavaScript
├── package.json
└── README.md
```

## Socket.IO Events

### Client to Server

- `join-room`: Join a chat room
- `chat-message`: Send a message to current room
- `private-message`: Send a private message to a user
- `typing`: Send typing indicator
- `get-rooms`: Request list of available rooms
- `create-room`: Create a new chat room
- `disconnect`: User disconnects

### Server to Client

- `room-joined`: Confirmation of room join with history
- `chat-message`: New message in current room
- `private-message`: New private message
- `user-joined`: User joined the room
- `user-left`: User left the room
- `user-typing`: User typing indicator
- `rooms-list`: List of available rooms
- `room-created`: New room created
- `error-message`: Error notification

## Database Schema

### Users Table
- id, username, created_at, last_seen

### Rooms Table
- id, name, description, created_at

### Messages Table
- id, room, user_id, username, message, type, created_at

## API Endpoints

### Health Check
```bash
GET /health
```
Returns server status and statistics.

## Customization

### Adding New Features

1. **Server-side**: Add new Socket.IO event handlers in `server/index.js`
2. **Client-side**: Add event listeners and emitters in `public/js/app.js`
3. **Database**: Modify models in `models/` directory

### Styling

Edit `public/css/style.css` to customize the appearance.

## Performance Considerations

- Messages are limited to 50 per room in history
- Old messages can be pruned using `Message.deleteOlderThan(days)`
- Active users are stored in memory for fast access
- Database uses SQLite for simplicity and portability

## Security Notes

- Usernames are not authenticated (perfect for demos, add auth for production)
- No rate limiting (add in production)
- Input sanitization should be added for production use
- Consider adding HTTPS in production

## Troubleshooting

**Connection Issues**:
- Make sure the server is running
- Check that the port is not in use
- Verify firewall settings

**Database Errors**:
- Run `npm run init-db` to initialize the database
- Check file permissions for the database file

**Socket.IO Connection Failed**:
- Ensure client and server are on the same network
- Check for CORS issues if deployed

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Testing

### Multiple Users

1. Open the application in multiple browser tabs/windows
2. Use different nicknames in each
3. Test chatting between users

### Private Messages

1. Have at least 2 users in any room
2. Click a username or use `@username message` format
3. Verify only the recipient sees the message

## Future Enhancements

Potential features to add:
- User authentication
- File/image sharing
- Emoji picker
- Message reactions
- User profiles
- Admin moderation tools
- Voice/video chat
- Message editing and deletion

## License

MIT License - feel free to use this project for learning or production.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
