# Advanced JavaScript Programs

This directory contains 6 production-quality Node.js programs demonstrating advanced JavaScript concepts and algorithms.

## Programs

### 1. web-framework.js
**Mini Web Framework from Scratch**
- HTTP server with routing (GET, POST, PUT, DELETE)
- Middleware chain support
- Request/response helpers with JSON support
- Route parameters and query strings
- Full RESTful API example

**Usage:**
```bash
./web-framework.js
# Visit http://localhost:3000
```

### 2. database-orm.js
**Simple ORM with SQLite**
- Model definition with schema
- CRUD operations
- Query builder with chaining
- Relationships support
- Schema migrations

**Requirements:**
```bash
npm install sqlite3
```

**Usage:**
```bash
./database-orm.js
```

### 3. graph-algorithms.js
**Graph Data Structure & Algorithms**
- Breadth-First Search (BFS)
- Depth-First Search (DFS)
- Dijkstra's shortest path
- Topological sort
- Cycle detection
- Connected components

**Usage:**
```bash
./graph-algorithms.js
```

### 4. compression-tool.js
**Huffman Coding Compression**
- File compression/decompression
- Huffman tree generation
- Binary encoding/decoding
- Compression ratio analysis
- Works with text and binary data

**Usage:**
```bash
./compression-tool.js
```

### 5. memory-pool.js
**Object Pool Implementation**
- Generic object pooling
- Automatic pool expansion
- Object lifecycle management
- Performance benchmarks vs regular allocation
- Specialized pools (Array, Object)

**Usage:**
```bash
./memory-pool.js
```

### 6. lexer-parser.js
**Expression Lexer/Parser**
- Tokenization (lexical analysis)
- Recursive descent parser
- Abstract Syntax Tree (AST) generation
- Expression evaluation
- Variable support
- Proper operator precedence

**Usage:**
```bash
./lexer-parser.js
```

## Features

All programs include:
- ✅ Production-quality code
- ✅ Comprehensive error handling
- ✅ Detailed comments
- ✅ Working demonstrations
- ✅ Executable with shebang (`#!/usr/bin/env node`)
- ✅ Module exports for reusability

## Installation

Most programs run without dependencies. For the ORM:

```bash
cd /home/matthew/repos/Programming_Repos/javascript-projects/learning/advanced/
npm install sqlite3
```

## Examples

### Web Framework
```javascript
const { Framework } = require('./web-framework.js');
const app = new Framework();

app.get('/hello/:name', (req, res) => {
  res.json({ message: `Hello, ${req.params.name}!` });
});

app.listen(3000);
```

### Graph Algorithms
```javascript
const Graph = require('./graph-algorithms.js');
const graph = new Graph(true); // directed

graph.addEdge('A', 'B', 5);
graph.addEdge('B', 'C', 3);

const path = graph.dijkstra('A', 'C');
console.log(path); // { distance: 8, path: ['A', 'B', 'C'] }
```

### Expression Parser
```javascript
const { ExpressionParser } = require('./lexer-parser.js');
const parser = new ExpressionParser();

parser.setVariables({ x: 10, y: 5 });
const result = parser.evaluate('x * y + 2^3'); // 58
```

## Testing

Run any program directly:
```bash
node web-framework.js
node graph-algorithms.js
node compression-tool.js
node memory-pool.js
node lexer-parser.js
node database-orm.js  # Requires sqlite3
```

## Learning Topics Covered

- **Networking**: HTTP servers, routing, middleware
- **Databases**: ORM design, query builders, migrations
- **Algorithms**: Graph traversal, shortest path, compression
- **Data Structures**: Trees, graphs, priority queues
- **Memory Management**: Object pooling, resource management
- **Compilers**: Lexing, parsing, AST, evaluation
- **Performance**: Benchmarking, optimization techniques
- **Design Patterns**: Factory, Builder, Strategy

## License

MIT - Educational purposes
