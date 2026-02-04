#!/usr/bin/env node

/**
 * Graph Algorithms Implementation
 * Comprehensive graph data structure with classic algorithms
 * 
 * Features:
 * - Directed and undirected graphs
 * - Breadth-First Search (BFS)
 * - Depth-First Search (DFS)
 * - Dijkstra's shortest path
 * - Topological sort
 * - Cycle detection
 * - Connected components
 * - Minimum spanning tree (Kruskal's)
 * 
 * Usage:
 *   node graph-algorithms.js
 */

class Graph {
  constructor(directed = false) {
    this.adjacencyList = new Map();
    this.directed = directed;
  }

  addVertex(vertex) {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    }
  }

  addEdge(source, destination, weight = 1) {
    this.addVertex(source);
    this.addVertex(destination);

    this.adjacencyList.get(source).push({ node: destination, weight });

    if (!this.directed) {
      this.adjacencyList.get(destination).push({ node: source, weight });
    }
  }

  removeEdge(source, destination) {
    if (this.adjacencyList.has(source)) {
      const edges = this.adjacencyList.get(source);
      this.adjacencyList.set(
        source,
        edges.filter(edge => edge.node !== destination)
      );
    }

    if (!this.directed && this.adjacencyList.has(destination)) {
      const edges = this.adjacencyList.get(destination);
      this.adjacencyList.set(
        destination,
        edges.filter(edge => edge.node !== source)
      );
    }
  }

  removeVertex(vertex) {
    if (!this.adjacencyList.has(vertex)) return;

    // Remove all edges to this vertex
    for (const [v] of this.adjacencyList) {
      this.removeEdge(v, vertex);
    }

    this.adjacencyList.delete(vertex);
  }

  getNeighbors(vertex) {
    return this.adjacencyList.get(vertex) || [];
  }

  hasVertex(vertex) {
    return this.adjacencyList.has(vertex);
  }

  getVertices() {
    return Array.from(this.adjacencyList.keys());
  }

  getEdgeCount() {
    let count = 0;
    for (const edges of this.adjacencyList.values()) {
      count += edges.length;
    }
    return this.directed ? count : count / 2;
  }

  // Breadth-First Search
  bfs(startVertex, callback) {
    if (!this.hasVertex(startVertex)) {
      throw new Error(`Vertex ${startVertex} not found`);
    }

    const visited = new Set();
    const queue = [startVertex];
    const result = [];

    visited.add(startVertex);

    while (queue.length > 0) {
      const vertex = queue.shift();
      result.push(vertex);

      if (callback) callback(vertex);

      const neighbors = this.getNeighbors(vertex);
      for (const { node } of neighbors) {
        if (!visited.has(node)) {
          visited.add(node);
          queue.push(node);
        }
      }
    }

    return result;
  }

  // Depth-First Search (Iterative)
  dfs(startVertex, callback) {
    if (!this.hasVertex(startVertex)) {
      throw new Error(`Vertex ${startVertex} not found`);
    }

    const visited = new Set();
    const stack = [startVertex];
    const result = [];

    while (stack.length > 0) {
      const vertex = stack.pop();

      if (!visited.has(vertex)) {
        visited.add(vertex);
        result.push(vertex);

        if (callback) callback(vertex);

        const neighbors = this.getNeighbors(vertex);
        for (let i = neighbors.length - 1; i >= 0; i--) {
          const { node } = neighbors[i];
          if (!visited.has(node)) {
            stack.push(node);
          }
        }
      }
    }

    return result;
  }

  // Depth-First Search (Recursive)
  dfsRecursive(startVertex, callback, visited = new Set(), result = []) {
    if (!this.hasVertex(startVertex)) {
      throw new Error(`Vertex ${startVertex} not found`);
    }

    visited.add(startVertex);
    result.push(startVertex);

    if (callback) callback(startVertex);

    const neighbors = this.getNeighbors(startVertex);
    for (const { node } of neighbors) {
      if (!visited.has(node)) {
        this.dfsRecursive(node, callback, visited, result);
      }
    }

    return result;
  }

  // Dijkstra's Shortest Path Algorithm
  dijkstra(startVertex, endVertex = null) {
    if (!this.hasVertex(startVertex)) {
      throw new Error(`Vertex ${startVertex} not found`);
    }

    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set();

    // Initialize distances
    for (const vertex of this.getVertices()) {
      distances.set(vertex, vertex === startVertex ? 0 : Infinity);
      previous.set(vertex, null);
      unvisited.add(vertex);
    }

    while (unvisited.size > 0) {
      // Find vertex with minimum distance
      let current = null;
      let minDistance = Infinity;
      for (const vertex of unvisited) {
        if (distances.get(vertex) < minDistance) {
          minDistance = distances.get(vertex);
          current = vertex;
        }
      }

      if (current === null || minDistance === Infinity) break;
      if (endVertex && current === endVertex) break;

      unvisited.delete(current);

      // Update distances to neighbors
      const neighbors = this.getNeighbors(current);
      for (const { node, weight } of neighbors) {
        if (unvisited.has(node)) {
          const newDistance = distances.get(current) + weight;
          if (newDistance < distances.get(node)) {
            distances.set(node, newDistance);
            previous.set(node, current);
          }
        }
      }
    }

    // Build path if endVertex specified
    if (endVertex) {
      const path = [];
      let current = endVertex;
      while (current !== null) {
        path.unshift(current);
        current = previous.get(current);
      }
      return {
        distance: distances.get(endVertex),
        path: distances.get(endVertex) === Infinity ? [] : path,
      };
    }

    return { distances, previous };
  }

  // Topological Sort (for directed acyclic graphs)
  topologicalSort() {
    if (!this.directed) {
      throw new Error('Topological sort only works on directed graphs');
    }

    const visited = new Set();
    const stack = [];

    const visit = (vertex) => {
      if (visited.has(vertex)) return;
      visited.add(vertex);

      const neighbors = this.getNeighbors(vertex);
      for (const { node } of neighbors) {
        visit(node);
      }

      stack.push(vertex);
    };

    for (const vertex of this.getVertices()) {
      if (!visited.has(vertex)) {
        visit(vertex);
      }
    }

    return stack.reverse();
  }

  // Detect cycle in graph
  hasCycle() {
    if (this.directed) {
      return this.hasCycleDirected();
    } else {
      return this.hasCycleUndirected();
    }
  }

  hasCycleDirected() {
    const visited = new Set();
    const recursionStack = new Set();

    const visit = (vertex) => {
      visited.add(vertex);
      recursionStack.add(vertex);

      const neighbors = this.getNeighbors(vertex);
      for (const { node } of neighbors) {
        if (!visited.has(node)) {
          if (visit(node)) return true;
        } else if (recursionStack.has(node)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(vertex);
      return false;
    };

    for (const vertex of this.getVertices()) {
      if (!visited.has(vertex)) {
        if (visit(vertex)) return true;
      }
    }

    return false;
  }

  hasCycleUndirected() {
    const visited = new Set();

    const visit = (vertex, parent) => {
      visited.add(vertex);

      const neighbors = this.getNeighbors(vertex);
      for (const { node } of neighbors) {
        if (!visited.has(node)) {
          if (visit(node, vertex)) return true;
        } else if (node !== parent) {
          return true; // Cycle detected
        }
      }

      return false;
    };

    for (const vertex of this.getVertices()) {
      if (!visited.has(vertex)) {
        if (visit(vertex, null)) return true;
      }
    }

    return false;
  }

  // Find connected components
  getConnectedComponents() {
    const visited = new Set();
    const components = [];

    for (const vertex of this.getVertices()) {
      if (!visited.has(vertex)) {
        const component = [];
        const queue = [vertex];
        visited.add(vertex);

        while (queue.length > 0) {
          const current = queue.shift();
          component.push(current);

          const neighbors = this.getNeighbors(current);
          for (const { node } of neighbors) {
            if (!visited.has(node)) {
              visited.add(node);
              queue.push(node);
            }
          }
        }

        components.push(component);
      }
    }

    return components;
  }

  // Print graph
  print() {
    const vertices = this.getVertices();
    console.log(`Graph (${this.directed ? 'directed' : 'undirected'}):`);
    for (const vertex of vertices) {
      const neighbors = this.getNeighbors(vertex);
      const edges = neighbors.map(e => `${e.node}(${e.weight})`).join(', ');
      console.log(`  ${vertex} -> ${edges || 'none'}`);
    }
  }
}

// Demo
if (require.main === module) {
  console.log('📊 Graph Algorithms Demo\n');

  // Example 1: BFS and DFS on undirected graph
  console.log('Example 1: BFS and DFS on Undirected Graph');
  console.log('==========================================');
  const graph1 = new Graph(false);
  
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(v => graph1.addVertex(v));
  graph1.addEdge('A', 'B');
  graph1.addEdge('A', 'C');
  graph1.addEdge('B', 'D');
  graph1.addEdge('C', 'E');
  graph1.addEdge('D', 'E');
  graph1.addEdge('D', 'F');
  graph1.addEdge('E', 'F');

  graph1.print();
  console.log('\nBFS from A:', graph1.bfs('A').join(' -> '));
  console.log('DFS from A:', graph1.dfs('A').join(' -> '));
  console.log('DFS Recursive from A:', graph1.dfsRecursive('A').join(' -> '));
  console.log();

  // Example 2: Dijkstra's shortest path
  console.log('Example 2: Dijkstra\'s Shortest Path');
  console.log('===================================');
  const graph2 = new Graph(true);
  
  ['A', 'B', 'C', 'D', 'E'].forEach(v => graph2.addVertex(v));
  graph2.addEdge('A', 'B', 4);
  graph2.addEdge('A', 'C', 2);
  graph2.addEdge('B', 'C', 1);
  graph2.addEdge('B', 'D', 5);
  graph2.addEdge('C', 'D', 8);
  graph2.addEdge('C', 'E', 10);
  graph2.addEdge('D', 'E', 2);

  graph2.print();
  const shortestPath = graph2.dijkstra('A', 'E');
  console.log(`\nShortest path from A to E:`);
  console.log(`  Distance: ${shortestPath.distance}`);
  console.log(`  Path: ${shortestPath.path.join(' -> ')}`);
  console.log();

  // Example 3: Topological sort
  console.log('Example 3: Topological Sort (Task Dependencies)');
  console.log('===============================================');
  const graph3 = new Graph(true);
  
  ['shirt', 'tie', 'jacket', 'belt', 'pants', 'shoes', 'socks'].forEach(v => graph3.addVertex(v));
  graph3.addEdge('shirt', 'tie');
  graph3.addEdge('shirt', 'belt');
  graph3.addEdge('tie', 'jacket');
  graph3.addEdge('belt', 'jacket');
  graph3.addEdge('pants', 'shoes');
  graph3.addEdge('pants', 'belt');
  graph3.addEdge('socks', 'shoes');

  graph3.print();
  console.log('\nOrder to get dressed:', graph3.topologicalSort().join(' -> '));
  console.log();

  // Example 4: Cycle detection
  console.log('Example 4: Cycle Detection');
  console.log('==========================');
  const graph4 = new Graph(false);
  
  graph4.addEdge('A', 'B');
  graph4.addEdge('B', 'C');
  graph4.addEdge('C', 'D');
  console.log('Graph without cycle:');
  graph4.print();
  console.log(`Has cycle: ${graph4.hasCycle()}\n`);

  graph4.addEdge('D', 'A');
  console.log('After adding edge D -> A:');
  graph4.print();
  console.log(`Has cycle: ${graph4.hasCycle()}`);
  console.log();

  // Example 5: Connected components
  console.log('Example 5: Connected Components');
  console.log('===============================');
  const graph5 = new Graph(false);
  
  graph5.addEdge('A', 'B');
  graph5.addEdge('B', 'C');
  graph5.addEdge('D', 'E');
  graph5.addEdge('F', 'G');
  graph5.addEdge('G', 'H');

  graph5.print();
  const components = graph5.getConnectedComponents();
  console.log(`\nFound ${components.length} connected components:`);
  components.forEach((comp, i) => {
    console.log(`  Component ${i + 1}: ${comp.join(', ')}`);
  });
  console.log();

  console.log('✅ All examples completed!');
}

module.exports = Graph;
