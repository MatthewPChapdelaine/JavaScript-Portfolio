#!/usr/bin/env node

/**
 * Mini Web Framework
 * A lightweight web framework built from scratch with routing, middleware, and request/response handling
 * 
 * Features:
 * - HTTP server with routing (GET, POST, PUT, DELETE)
 * - Middleware chain support
 * - Request/response helpers
 * - Route parameters and query strings
 * - JSON body parsing
 * - Static file serving
 * 
 * Usage:
 *   node web-framework.js
 *   Then visit: http://localhost:3000
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

class Request {
  constructor(req) {
    const parsedUrl = url.parse(req.url, true);
    this.method = req.method;
    this.url = req.url;
    this.path = parsedUrl.pathname;
    this.query = parsedUrl.query;
    this.headers = req.headers;
    this.params = {};
    this.body = null;
    this._raw = req;
  }

  async parseBody() {
    return new Promise((resolve, reject) => {
      let body = '';
      this._raw.on('data', chunk => body += chunk);
      this._raw.on('end', () => {
        try {
          this.body = this.headers['content-type']?.includes('application/json')
            ? JSON.parse(body)
            : body;
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      this._raw.on('error', reject);
    });
  }
}

class Response {
  constructor(res) {
    this._raw = res;
    this.statusCode = 200;
    this.headers = {};
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  setHeader(key, value) {
    this.headers[key] = value;
    return this;
  }

  json(data) {
    this.setHeader('Content-Type', 'application/json');
    this._raw.writeHead(this.statusCode, this.headers);
    this._raw.end(JSON.stringify(data));
  }

  send(data) {
    this.setHeader('Content-Type', 'text/html');
    this._raw.writeHead(this.statusCode, this.headers);
    this._raw.end(data);
  }

  sendFile(filePath) {
    const extname = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    const contentType = contentTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          this.status(404).send('File not found');
        } else {
          this.status(500).send('Server error');
        }
      } else {
        this.setHeader('Content-Type', contentType);
        this._raw.writeHead(this.statusCode, this.headers);
        this._raw.end(content);
      }
    });
  }

  redirect(location, code = 302) {
    this.statusCode = code;
    this.setHeader('Location', location);
    this._raw.writeHead(this.statusCode, this.headers);
    this._raw.end();
  }
}

class Router {
  constructor() {
    this.routes = {
      GET: [],
      POST: [],
      PUT: [],
      DELETE: [],
    };
    this.middleware = [];
  }

  use(middleware) {
    this.middleware.push(middleware);
  }

  addRoute(method, path, handler) {
    const paramNames = [];
    const regexPath = path
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return '([^\\/]+)';
      });

    this.routes[method].push({
      path,
      regex: new RegExp(`^${regexPath}$`),
      paramNames,
      handler,
    });
  }

  get(path, handler) {
    this.addRoute('GET', path, handler);
  }

  post(path, handler) {
    this.addRoute('POST', path, handler);
  }

  put(path, handler) {
    this.addRoute('PUT', path, handler);
  }

  delete(path, handler) {
    this.addRoute('DELETE', path, handler);
  }

  async findRoute(method, path) {
    const routes = this.routes[method] || [];
    for (const route of routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  async handle(req, res) {
    const request = new Request(req);
    const response = new Response(res);

    try {
      // Parse body if present
      if (['POST', 'PUT'].includes(request.method)) {
        await request.parseBody();
      }

      // Execute middleware chain
      let middlewareIndex = 0;
      const next = async () => {
        if (middlewareIndex < this.middleware.length) {
          const middleware = this.middleware[middlewareIndex++];
          await middleware(request, response, next);
        }
      };
      await next();

      // Find and execute route handler
      const route = await this.findRoute(request.method, request.path);
      if (route) {
        request.params = route.params;
        await route.handler(request, response);
      } else {
        response.status(404).json({ error: 'Route not found' });
      }
    } catch (err) {
      console.error('Error handling request:', err);
      if (!res.headersSent) {
        response.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}

class Framework {
  constructor() {
    this.router = new Router();
  }

  use(middleware) {
    this.router.use(middleware);
  }

  get(path, handler) {
    this.router.get(path, handler);
  }

  post(path, handler) {
    this.router.post(path, handler);
  }

  put(path, handler) {
    this.router.put(path, handler);
  }

  delete(path, handler) {
    this.router.delete(path, handler);
  }

  listen(port, callback) {
    const server = http.createServer((req, res) => {
      this.router.handle(req, res);
    });

    server.listen(port, callback);
    return server;
  }
}

// Demo application
if (require.main === module) {
  const app = new Framework();

  // In-memory data store
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];
  let nextId = 3;

  // Logging middleware
  app.use(async (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    await next();
  });

  // CORS middleware
  app.use(async (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    await next();
  });

  // Routes
  app.get('/', (req, res) => {
    res.send(`
      <h1>Mini Web Framework Demo</h1>
      <h2>Available Routes:</h2>
      <ul>
        <li>GET / - This page</li>
        <li>GET /api/users - Get all users</li>
        <li>GET /api/users/:id - Get user by ID</li>
        <li>POST /api/users - Create user (JSON body: {name, email})</li>
        <li>PUT /api/users/:id - Update user (JSON body: {name, email})</li>
        <li>DELETE /api/users/:id - Delete user</li>
        <li>GET /hello/:name - Personalized greeting</li>
      </ul>
      <h3>Test with curl:</h3>
      <pre>
curl http://localhost:3000/api/users
curl http://localhost:3000/api/users/1
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"name":"Charlie","email":"charlie@example.com"}'
      </pre>
    `);
  });

  app.get('/api/users', (req, res) => {
    res.json(users);
  });

  app.get('/api/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.post('/api/users', (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required' });
    }

    const user = { id: nextId++, name, email };
    users.push(user);
    res.status(201).json(user);
  });

  app.put('/api/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, email } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    res.json(user);
  });

  app.delete('/api/users/:id', (req, res) => {
    const index = users.findIndex(u => u.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    users.splice(index, 1);
    res.status(204).send('');
  });

  app.get('/hello/:name', (req, res) => {
    res.json({ message: `Hello, ${req.params.name}!` });
  });

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Visit http://localhost:${PORT} for API documentation`);
  });
}

module.exports = { Framework, Router, Request, Response };
