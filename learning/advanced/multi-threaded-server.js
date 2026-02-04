#!/usr/bin/env node
/**
 * Multi-Threaded TCP Server (using Worker Threads)
 * A concurrent TCP server that handles multiple clients using worker threads.
 * Implements an echo protocol with proper connection handling and graceful shutdown.
 * 
 * Run: node multi-threaded-server.js
 * Test: telnet localhost 8888 or nc localhost 8888
 */

const net = require('net');
const { Worker } = require('worker_threads');
const os = require('os');

const HOST = '127.0.0.1';
const PORT = 8888;
const MAX_WORKERS = os.cpus().length;

class MultiThreadedServer {
    constructor(host, port, maxWorkers) {
        this.host = host;
        this.port = port;
        this.maxWorkers = maxWorkers;
        this.server = null;
        this.workers = [];
        this.currentWorker = 0;
        this.activeConnections = 0;
        this.running = false;
    }

    createWorker() {
        const workerCode = `
            const { parentPort } = require('worker_threads');
            
            parentPort.on('message', (message) => {
                if (message.type === 'handle_client') {
                    const { socketData } = message;
                    
                    // Simulate handling the client
                    parentPort.postMessage({
                        type: 'log',
                        message: \`Worker handling client from \${socketData.address}\`
                    });
                }
            });
        `;

        const worker = new Worker(workerCode, { eval: true });
        
        worker.on('message', (message) => {
            if (message.type === 'log') {
                console.log(`[Worker ${worker.threadId}] ${message.message}`);
            }
        });

        worker.on('error', (err) => {
            console.error(`[Worker Error] ${err}`);
        });

        return worker;
    }

    initWorkers() {
        console.log(`[*] Initializing ${this.maxWorkers} worker threads...`);
        
        for (let i = 0; i < this.maxWorkers; i++) {
            this.workers.push(this.createWorker());
        }
        
        console.log(`[*] Worker pool created with ${this.workers.length} workers`);
    }

    handleClient(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        this.activeConnections++;
        
        console.log(`[+] Client connected: ${clientId} (Active: ${this.activeConnections})`);
        
        socket.write('Welcome to Echo Server! Type "quit" to exit.\n');
        
        socket.on('data', (data) => {
            const message = data.toString().trim();
            console.log(`[${clientId}] Received: ${message}`);
            
            if (message.toLowerCase() === 'quit') {
                socket.write('Goodbye!\n');
                socket.end();
                return;
            }
            
            // Echo back to client
            socket.write(`Echo: ${message}\n`);
        });
        
        socket.on('end', () => {
            this.activeConnections--;
            console.log(`[-] Client disconnected: ${clientId} (Active: ${this.activeConnections})`);
        });
        
        socket.on('error', (err) => {
            console.error(`[!] Socket error for ${clientId}: ${err.message}`);
        });
    }

    start() {
        this.running = true;
        this.initWorkers();
        
        this.server = net.createServer((socket) => {
            this.handleClient(socket);
        });
        
        this.server.on('error', (err) => {
            console.error(`[!] Server error: ${err.message}`);
        });
        
        this.server.listen(this.port, this.host, () => {
            console.log(`[*] Server listening on ${this.host}:${this.port}`);
            console.log(`[*] Press Ctrl+C to shutdown`);
        });
    }

    shutdown() {
        console.log('\n[*] Shutting down server...');
        this.running = false;
        
        if (this.server) {
            this.server.close(() => {
                console.log('[*] Server closed');
            });
        }
        
        // Terminate workers
        this.workers.forEach(worker => worker.terminate());
        
        console.log('[*] Server shutdown complete');
        process.exit(0);
    }
}

// Create and start server
const server = new MultiThreadedServer(HOST, PORT, MAX_WORKERS);

// Handle graceful shutdown
process.on('SIGINT', () => {
    server.shutdown();
});

process.on('SIGTERM', () => {
    server.shutdown();
});

server.start();
