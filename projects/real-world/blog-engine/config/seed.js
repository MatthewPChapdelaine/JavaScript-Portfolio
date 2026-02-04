require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('./database');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

const seed = async () => {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminId = User.create({
    username: 'admin',
    email: 'admin@blog.com',
    password: hashedPassword,
    role: 'admin'
  });

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 10);
  const userId = User.create({
    username: 'john_doe',
    email: 'john@example.com',
    password: userPassword,
    role: 'user'
  });

  // Create sample posts
  const posts = [
    {
      title: 'Getting Started with Node.js',
      slug: 'getting-started-with-nodejs',
      content: `# Getting Started with Node.js

Node.js is a powerful JavaScript runtime built on Chrome's V8 JavaScript engine. In this post, we'll explore the basics of Node.js and how to get started.

## What is Node.js?

Node.js allows you to run JavaScript on the server side. It's perfect for building scalable network applications.

## Installation

You can download Node.js from the official website: https://nodejs.org

\`\`\`bash
node --version
npm --version
\`\`\`

## Your First Application

Create a simple HTTP server:

\`\`\`javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World!');
});

server.listen(3000);
\`\`\`

That's it! You now have a basic Node.js server running.`,
      excerpt: 'Learn the basics of Node.js and create your first server application.',
      author_id: adminId,
      status: 'published'
    },
    {
      title: 'Express.js Best Practices',
      slug: 'expressjs-best-practices',
      content: `# Express.js Best Practices

Express.js is the most popular web framework for Node.js. Here are some best practices to follow.

## Project Structure

Organize your code into logical folders:
- routes/
- models/
- middleware/
- controllers/

## Error Handling

Always implement proper error handling:

\`\`\`javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
\`\`\`

## Security

Use helmet to secure your Express apps:

\`\`\`bash
npm install helmet
\`\`\`

## Environment Variables

Never hardcode sensitive information. Use environment variables instead.`,
      excerpt: 'Best practices for building robust Express.js applications.',
      author_id: adminId,
      status: 'published'
    },
    {
      title: 'Understanding Async/Await in JavaScript',
      slug: 'understanding-async-await',
      content: `# Understanding Async/Await in JavaScript

Async/await makes asynchronous code look and behave more like synchronous code.

## The Problem with Callbacks

Callback hell is real:

\`\`\`javascript
doSomething(function(result) {
  doSomethingElse(result, function(newResult) {
    doThirdThing(newResult, function(finalResult) {
      console.log(finalResult);
    });
  });
});
\`\`\`

## The Solution: Async/Await

Much cleaner:

\`\`\`javascript
async function doWork() {
  const result = await doSomething();
  const newResult = await doSomethingElse(result);
  const finalResult = await doThirdThing(newResult);
  console.log(finalResult);
}
\`\`\`

## Error Handling

Use try/catch blocks:

\`\`\`javascript
async function doWork() {
  try {
    const result = await doSomething();
    return result;
  } catch (error) {
    console.error(error);
  }
}
\`\`\``,
      excerpt: 'Master asynchronous JavaScript with async/await syntax.',
      author_id: userId,
      status: 'published'
    },
    {
      title: 'Building RESTful APIs',
      slug: 'building-restful-apis',
      content: `# Building RESTful APIs

REST is an architectural style for designing networked applications.

## REST Principles

- **Resources**: Everything is a resource
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Stateless**: Each request contains all necessary information

## Example API Structure

\`\`\`
GET    /api/posts     - Get all posts
GET    /api/posts/:id - Get single post
POST   /api/posts     - Create post
PUT    /api/posts/:id - Update post
DELETE /api/posts/:id - Delete post
\`\`\`

## Status Codes

- 200: OK
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Server Error`,
      excerpt: 'Learn how to design and build RESTful APIs with Node.js.',
      author_id: adminId,
      status: 'draft'
    }
  ];

  const postIds = posts.map(post => Post.create(post));

  // Create comments
  const comments = [
    {
      post_id: postIds[0],
      user_id: userId,
      content: 'Great introduction to Node.js! Very helpful for beginners.',
      status: 'approved'
    },
    {
      post_id: postIds[0],
      user_id: adminId,
      content: 'Thank you! Glad you found it useful.',
      status: 'approved'
    },
    {
      post_id: postIds[1],
      user_id: userId,
      content: 'These best practices saved me hours of debugging. Thanks!',
      status: 'approved'
    },
    {
      post_id: postIds[2],
      user_id: adminId,
      content: 'Excellent explanation of async/await!',
      status: 'approved'
    }
  ];

  comments.forEach(comment => Comment.create(comment));

  console.log('Database seeded successfully!');
  console.log('\nLogin credentials:');
  console.log('Admin - Email: admin@blog.com, Password: admin123');
  console.log('User  - Email: john@example.com, Password: user123');
};

seed().catch(console.error);
