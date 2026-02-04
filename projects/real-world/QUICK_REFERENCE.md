# Quick Reference Guide

## 🚀 Getting Started

### One-Line Setup (All Projects)
```bash
cd /home/matthew/repos/Programming_Repos/javascript-projects/projects/real-world
./setup.sh
```

## 📝 Blog Engine

### Start Server
```bash
cd blog-engine
npm start
```

### Access
- URL: http://localhost:3000
- Admin: admin@blog.com / admin123
- User: john@example.com / user123

### Key Routes
- `/` - Home page
- `/posts` - All posts
- `/posts/new` - Create post (auth required)
- `/auth/login` - Login
- `/auth/register` - Register
- `/admin` - Admin panel (admin only)
- `/api/posts` - REST API

### Common Tasks
```bash
npm run init-db    # Reset database
npm run seed       # Add sample data
npm run dev        # Development mode
```

---

## 💬 Chat Application

### Start Server
```bash
cd chat-application
npm start
```

### Access
- URL: http://localhost:3001

### Features
- Enter nickname to join
- Switch between rooms
- Send private messages with `@username message`
- Click usernames to start private chat
- Create custom rooms with + button

### Common Tasks
```bash
npm run init-db    # Reset database
npm run dev        # Development mode
```

### Testing
Open multiple browser tabs with different nicknames to test chat functionality.

---

## 📦 Package Manager

### Setup Registry
```bash
cd package-manager
npm run setup-registry
```

### Commands

#### Install Package
```bash
node bin/mini-pkg.js install express
node bin/mini-pkg.js install lodash axios
```

#### Install from package.json
```bash
node bin/mini-pkg.js install
```

#### View Installed
```bash
node bin/mini-pkg.js list
```

#### Package Info
```bash
node bin/mini-pkg.js info express
```

#### Visualize Dependencies
```bash
node bin/mini-pkg.js graph
```

#### Clean
```bash
node bin/mini-pkg.js clean
```

### Test Installation
```bash
cd test-project
node ../bin/mini-pkg.js install express
node test.js
```

---

## 🛠️ Development Tips

### Blog Engine
- Edit views: `views/*.ejs`
- Add routes: `routes/*.js`
- Modify styles: `public/css/style.css`
- Database models: `models/*.js`

### Chat Application
- Socket events: `server/index.js`
- Client code: `public/js/app.js`
- Styles: `public/css/style.css`
- Database models: `models/*.js`

### Package Manager
- Add packages: `registry/*.json`
- CLI commands: `bin/mini-pkg.js`
- Core logic: `lib/PackageManager.js`
- Graph visualization: `lib/DependencyGraph.js`

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Blog Engine
PORT=3002 npm start

# Chat Application
PORT=3003 npm start
```

### Database Errors
```bash
# Reinitialize
npm run init-db

# Reseed (blog engine only)
npm run seed
```

### Module Not Found
```bash
# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### Permission Denied
```bash
chmod +x bin/mini-pkg.js
chmod +x setup.sh
```

---

## 📊 Project Statistics

### Blog Engine
- **Files**: 35+
- **Routes**: 5 (index, posts, auth, admin, api)
- **Models**: 3 (User, Post, Comment)
- **Views**: 15+ EJS templates
- **Lines of Code**: ~3500+

### Chat Application
- **Files**: 15+
- **Socket Events**: 10+
- **Models**: 3 (User, Message, Room)
- **Real-time Features**: 5+
- **Lines of Code**: ~1800+

### Package Manager
- **Files**: 12+
- **CLI Commands**: 7
- **Registry Packages**: 21
- **Algorithms**: Dependency resolution, graph traversal
- **Lines of Code**: ~2000+

---

## 🎯 Learning Path

### Beginner → Chat Application
- Simple real-time concepts
- WebSocket basics
- Client-server communication

### Intermediate → Blog Engine
- Full-stack web application
- Authentication & authorization
- Database design & CRUD operations
- RESTful API design

### Advanced → Package Manager
- Algorithm design
- Graph theory
- CLI development
- Dependency management

---

## 📚 Additional Resources

### Blog Engine
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Passport.js Documentation](http://www.passportjs.org/docs/)
- [EJS Templates](https://ejs.co/#docs)

### Chat Application
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

### Package Manager
- [npm CLI Documentation](https://docs.npmjs.com/cli/v9)
- [Semantic Versioning](https://semver.org/)
- [Graph Visualization with vis.js](https://visjs.github.io/vis-network/docs/network/)

---

## 🔥 Pro Tips

### Blog Engine
1. Use markdown for rich post content
2. Check admin panel for management features
3. Try the search functionality
4. Explore the RESTful API endpoints

### Chat Application
1. Open in multiple tabs to simulate users
2. Create custom rooms for organization
3. Use private messaging for 1-on-1 chats
4. Watch typing indicators in real-time

### Package Manager
1. Start with simple packages (lodash, moment)
2. Use `info` command to explore dependencies
3. Visualize complex dependency trees with `graph`
4. Check the lock file after installation

---

## 🚀 Next Steps

1. **Run All Projects**: Get hands-on experience
2. **Read the Code**: Understand implementation patterns
3. **Modify Features**: Add your own enhancements
4. **Build Something New**: Use these as templates
5. **Deploy to Production**: Try Heroku, Railway, or Vercel

---

## 📝 Notes

- All projects use SQLite for simplicity (production should use PostgreSQL/MySQL)
- Security measures are basic (enhance for production)
- No tests included (add Jest/Mocha for production)
- Environment variables should be properly secured
- Consider containerizing with Docker for deployment

---

**Need Help?** Check the README.md in each project directory for detailed documentation.
