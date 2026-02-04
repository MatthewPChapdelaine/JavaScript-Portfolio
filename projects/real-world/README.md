# Real-World JavaScript/Node.js Projects

This directory contains three complete, production-ready JavaScript/Node.js projects demonstrating modern web development practices.

## Projects Overview

### 1. 📝 Blog Engine
**Location**: `blog-engine/`

A full-featured blogging platform with user authentication, markdown support, and admin panel.

**Key Features**:
- User authentication with Passport.js
- CRUD operations for blog posts
- Markdown support with live rendering
- Comments system
- Admin dashboard
- RESTful API
- SQLite database
- EJS templating

**Tech Stack**: Express.js, SQLite, Passport.js, EJS, Marked.js

**Quick Start**:
```bash
cd blog-engine
npm install
cp .env.example .env
npm run init-db
npm run seed
npm start
```

Visit: `http://localhost:3000`

**Default Credentials**:
- Admin: `admin@blog.com` / `admin123`
- User: `john@example.com` / `user123`

---

### 2. 💬 Chat Application
**Location**: `chat-application/`

Real-time chat application with WebSocket support, multiple rooms, and private messaging.

**Key Features**:
- Real-time messaging with Socket.IO
- Multiple chat rooms
- Private messaging
- User presence/online status
- Typing indicators
- Message persistence
- Message history
- Responsive design

**Tech Stack**: Socket.IO, Express.js, SQLite, Vanilla JavaScript

**Quick Start**:
```bash
cd chat-application
npm install
cp .env.example .env
npm run init-db
npm start
```

Visit: `http://localhost:3001`

**Usage**: Enter a nickname and start chatting in different rooms!

---

### 3. 📦 Package Manager
**Location**: `package-manager/`

NPM-like package manager with dependency resolution and visualization.

**Key Features**:
- Package installation with dependency resolution
- Lock file generation
- Simulated package registry
- Semantic versioning support
- Dependency graph visualization
- CLI with Commander.js
- Install/uninstall operations
- Package information lookup

**Tech Stack**: Node.js, Commander.js, vis.js, Semver

**Quick Start**:
```bash
cd package-manager
npm install
npm run setup-registry
node bin/mini-pkg.js install express
node bin/mini-pkg.js graph
```

**Commands**:
```bash
mini-pkg install <package>     # Install packages
mini-pkg list                  # List installed
mini-pkg info <package>        # Package info
mini-pkg graph                 # Visualize dependencies
mini-pkg clean                 # Clean up
```

---

## Project Comparison

| Feature | Blog Engine | Chat App | Package Manager |
|---------|-------------|----------|-----------------|
| Database | ✓ SQLite | ✓ SQLite | Registry (JSON) |
| Authentication | ✓ Passport.js | Nicknames | N/A |
| Real-time | ✗ | ✓ Socket.IO | ✗ |
| API | ✓ RESTful | ✓ Socket Events | ✓ CLI |
| Frontend | EJS Templates | Vanilla JS | CLI + HTML Graph |
| Complexity | Advanced | Intermediate | Advanced |

## Learning Outcomes

### Blog Engine
- User authentication and session management
- Database design and ORM patterns
- RESTful API design
- Template rendering
- CRUD operations
- Middleware architecture
- Security best practices

### Chat Application
- WebSocket communication
- Real-time event handling
- Client-server architecture
- State management
- Room/channel management
- Message persistence
- Responsive UI design

### Package Manager
- Dependency resolution algorithms
- Graph theory and traversal
- CLI tool development
- Semantic versioning
- File system operations
- Lock file generation
- Data visualization

## Prerequisites

- **Node.js**: v14 or higher
- **npm**: v6 or higher
- **Modern browser**: Chrome, Firefox, Safari, or Edge

## Installation (All Projects)

```bash
# Navigate to each project directory and run:
npm install
```

## Common Commands

Each project includes:
- `npm install` - Install dependencies
- `npm start` - Start production server
- `npm run dev` - Start development server (with nodemon)

## Project Structure Pattern

```
project-name/
├── package.json          # Dependencies and scripts
├── README.md             # Project documentation
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore patterns
├── server.js or bin/    # Entry point
├── config/              # Configuration files
├── models/              # Data models
├── routes/              # API routes (web projects)
├── views/               # Templates (blog engine)
├── public/              # Static assets
└── lib/                 # Core logic (package manager)
```

## Security Notes

### Blog Engine
- Passwords hashed with bcrypt
- Session secrets should be changed
- Input validation on all forms
- HTML sanitization on output
- SQL injection prevention

### Chat Application
- No authentication (demo purposes)
- Add rate limiting for production
- Sanitize user inputs
- Consider HTTPS in production

### Package Manager
- Local registry only
- No remote code execution
- Safe for learning/testing
- Add validation for production use

## Production Deployment

### Environment Variables
Always set proper environment variables:
- `NODE_ENV=production`
- Strong `SESSION_SECRET`
- Proper database paths
- Port configuration

### Database
- Use proper database in production (PostgreSQL, MySQL)
- Implement backups
- Set up migrations
- Use connection pooling

### Security
- Enable HTTPS
- Use helmet.js
- Implement rate limiting
- Set up CORS properly
- Add input validation
- Enable CSP headers

### Monitoring
- Add logging (Winston, Bunyan)
- Set up error tracking (Sentry)
- Monitor performance
- Track usage metrics

## Testing

Each project includes basic testing capabilities:

```bash
# Blog Engine
cd blog-engine
npm run seed  # Creates test data
npm start

# Chat Application
cd chat-application
npm start
# Open multiple browser windows to test

# Package Manager
cd package-manager/test-project
node ../bin/mini-pkg.js install express
node test.js
```

## Customization

### Blog Engine
- Modify views in `views/` directory
- Add custom routes in `routes/`
- Extend models in `models/`
- Customize styles in `public/css/`

### Chat Application
- Add new Socket.IO events in `server/index.js`
- Modify UI in `public/index.html` and `public/css/`
- Extend features in `public/js/app.js`

### Package Manager
- Add packages to `registry/`
- Create custom commands in `bin/mini-pkg.js`
- Extend resolution logic in `lib/PackageManager.js`

## Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Change PORT in .env file
PORT=3002
```

**Database errors**:
```bash
# Reinitialize database
npm run init-db
```

**Module not found**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Permission denied**:
```bash
# Fix permissions
chmod +x bin/mini-pkg.js
```

## Contributing

These projects are designed for learning. Feel free to:
- Add new features
- Improve documentation
- Fix bugs
- Optimize performance
- Add tests
- Enhance UI/UX

## Resources

### Documentation
- [Express.js](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [Passport.js](http://www.passportjs.org/)
- [Commander.js](https://github.com/tj/commander.js)
- [EJS](https://ejs.co/)

### Tutorials
- Node.js Best Practices
- RESTful API Design
- WebSocket Programming
- Package Manager Internals
- Database Design Patterns

## License

All projects are released under the MIT License. Free to use for learning, teaching, or commercial purposes.

## Feedback

These are educational projects demonstrating real-world patterns. While production-ready in structure, they should be enhanced with proper testing, monitoring, and security measures before deployment.

## Next Steps

1. **Explore Each Project**: Run and test all features
2. **Read the Code**: Understand implementation patterns
3. **Modify and Extend**: Add your own features
4. **Deploy**: Try deploying to Heroku, Railway, or Vercel
5. **Share**: Show off what you've built!

---

**Happy Coding!** 🚀
