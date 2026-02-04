# Blog Engine

A full-featured blogging platform built with Express.js, featuring user authentication, markdown support, comments, and an admin panel.

## Features

- **User Authentication**: Secure registration and login with Passport.js
- **Blog Posts**: Create, read, update, and delete blog posts
- **Markdown Support**: Write posts in Markdown with live rendering
- **Comments System**: Users can comment on posts
- **Admin Panel**: Comprehensive dashboard for managing content
- **RESTful API**: Complete API for programmatic access
- **Search**: Search through posts by title and content
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite with better-sqlite3
- **Authentication**: Passport.js with bcryptjs
- **Template Engine**: EJS
- **Markdown**: Marked.js
- **Validation**: express-validator
- **Security**: sanitize-html

## Installation

1. **Clone or navigate to the project directory**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file and set your configuration**:
   ```
   PORT=3000
   SESSION_SECRET=your-secret-key-here
   NODE_ENV=development
   DATABASE_PATH=./blog.db
   ```

5. **Initialize the database**:
   ```bash
   npm run init-db
   ```

6. **Seed with sample data** (optional):
   ```bash
   npm run seed
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

The application will be available at `http://localhost:3000`

### Default Login Credentials

After seeding the database:

**Admin Account**:
- Email: `admin@blog.com`
- Password: `admin123`

**User Account**:
- Email: `john@example.com`
- Password: `user123`

## Project Structure

```
blog-engine/
├── config/
│   ├── database.js       # Database configuration
│   ├── passport.js       # Passport authentication setup
│   ├── init-db.js        # Database initialization script
│   └── seed.js           # Database seeding script
├── middleware/
│   └── auth.js           # Authentication middleware
├── models/
│   ├── User.js           # User model
│   ├── Post.js           # Post model
│   └── Comment.js        # Comment model
├── routes/
│   ├── index.js          # Home and general routes
│   ├── posts.js          # Post management routes
│   ├── auth.js           # Authentication routes
│   ├── admin.js          # Admin panel routes
│   └── api.js            # RESTful API routes
├── views/
│   ├── partials/         # Reusable view components
│   ├── posts/            # Post-related views
│   ├── auth/             # Authentication views
│   └── admin/            # Admin panel views
├── public/
│   ├── css/              # Stylesheets
│   └── js/               # Client-side JavaScript
├── server.js             # Application entry point
└── package.json          # Project dependencies
```

## API Endpoints

### Posts

- `GET /api/posts` - Get all published posts
- `GET /api/posts/:id` - Get single post with comments
- `POST /api/posts` - Create new post (authenticated)
- `PUT /api/posts/:id` - Update post (authenticated)
- `DELETE /api/posts/:id` - Delete post (authenticated)

### Comments

- `GET /api/posts/:id/comments` - Get comments for a post
- `POST /api/posts/:id/comments` - Add comment (authenticated)

### Example API Usage

```bash
# Get all posts
curl http://localhost:3000/api/posts

# Get single post
curl http://localhost:3000/api/posts/1

# Create post (requires authentication)
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"My Post","content":"Post content"}'
```

## Features Overview

### For Users

- Register and login to the platform
- Create and publish blog posts
- Edit and delete your own posts
- Comment on published posts
- Search for posts
- View post statistics (views, comments)

### For Administrators

- Access admin dashboard
- View statistics (posts, users, comments)
- Manage all posts (edit, delete)
- Manage users
- Manage comments
- Monitor recent activity

## Development

### Database Schema

**Users Table**:
- id, username, email, password, role, created_at

**Posts Table**:
- id, title, slug, content, excerpt, author_id, status, views, created_at, updated_at

**Comments Table**:
- id, post_id, user_id, content, status, created_at

### Adding New Features

1. Create model in `models/` directory
2. Add routes in `routes/` directory
3. Create views in `views/` directory
4. Update server.js to include new routes

## Security Considerations

- Passwords are hashed using bcrypt
- Session secrets should be strong and unique
- Input validation on all forms
- HTML sanitization on rendered content
- CSRF protection via express-session
- SQL injection prevention via parameterized queries

## Troubleshooting

**Database errors**: Make sure you've run `npm run init-db` first

**Login issues**: Verify your credentials and check that the database is seeded

**Port conflicts**: Change the PORT in `.env` file

**Module not found**: Run `npm install` to install dependencies

## License

MIT License - feel free to use this project for learning or production.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
