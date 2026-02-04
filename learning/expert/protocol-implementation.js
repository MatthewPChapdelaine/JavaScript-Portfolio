#!/usr/bin/env node

/**
 * WEBSOCKET PROTOCOL IMPLEMENTATION (RFC 6455)
 * 
 * A complete implementation of the WebSocket protocol from scratch:
 * - WebSocket server
 * - WebSocket client
 * - Frame encoding/decoding
 * - Handshake handling
 * - Ping/Pong heartbeat
 * - Message fragmentation
 * - Binary and text messages
 * - Real-time chat demo
 */

const net = require('net');
const crypto = require('crypto');
const EventEmitter = require('events');

// ============================================================================
// WEBSOCKET CONSTANTS
// ============================================================================

const MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const OpCode = {
  CONTINUATION: 0x0,
  TEXT: 0x1,
  BINARY: 0x2,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xA
};

const CloseCode = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED: 1003,
  NO_STATUS: 1005,
  ABNORMAL: 1006,
  INVALID_DATA: 1007,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  EXTENSION_REQUIRED: 1010,
  INTERNAL_ERROR: 1011
};

// ============================================================================
// WEBSOCKET FRAME
// ============================================================================

class WebSocketFrame {
  static encode(payload, opcode = OpCode.TEXT, masked = false) {
    const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    const payloadLength = payloadBuffer.length;

    let frame = [];

    // FIN bit (1) + RSV bits (000) + OpCode (4 bits)
    frame.push(0x80 | opcode);

    // Mask bit + Payload length
    if (payloadLength < 126) {
      frame.push((masked ? 0x80 : 0x00) | payloadLength);
    } else if (payloadLength < 65536) {
      frame.push((masked ? 0x80 : 0x00) | 126);
      frame.push((payloadLength >> 8) & 0xFF);
      frame.push(payloadLength & 0xFF);
    } else {
      frame.push((masked ? 0x80 : 0x00) | 127);
      // 64-bit length (we only use lower 32 bits)
      frame.push(0, 0, 0, 0); // Upper 32 bits
      frame.push((payloadLength >> 24) & 0xFF);
      frame.push((payloadLength >> 16) & 0xFF);
      frame.push((payloadLength >> 8) & 0xFF);
      frame.push(payloadLength & 0xFF);
    }

    let frameBuffer = Buffer.from(frame);

    if (masked) {
      // Generate masking key
      const maskingKey = crypto.randomBytes(4);
      frameBuffer = Buffer.concat([frameBuffer, maskingKey]);

      // Mask payload
      const maskedPayload = Buffer.alloc(payloadLength);
      for (let i = 0; i < payloadLength; i++) {
        maskedPayload[i] = payloadBuffer[i] ^ maskingKey[i % 4];
      }
      
      return Buffer.concat([frameBuffer, maskedPayload]);
    } else {
      return Buffer.concat([frameBuffer, payloadBuffer]);
    }
  }

  static decode(buffer) {
    if (buffer.length < 2) {
      return null;
    }

    let offset = 0;

    // First byte: FIN, RSV, OpCode
    const firstByte = buffer[offset++];
    const fin = (firstByte & 0x80) !== 0;
    const opcode = firstByte & 0x0F;

    // Second byte: Mask, Payload length
    const secondByte = buffer[offset++];
    const masked = (secondByte & 0x80) !== 0;
    let payloadLength = secondByte & 0x7F;

    // Extended payload length
    if (payloadLength === 126) {
      if (buffer.length < offset + 2) return null;
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      if (buffer.length < offset + 8) return null;
      // Read 64-bit length (we only support lower 32 bits)
      offset += 4; // Skip upper 32 bits
      payloadLength = buffer.readUInt32BE(offset);
      offset += 4;
    }

    // Masking key
    let maskingKey;
    if (masked) {
      if (buffer.length < offset + 4) return null;
      maskingKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    // Payload
    if (buffer.length < offset + payloadLength) {
      return null;
    }

    let payload = buffer.slice(offset, offset + payloadLength);

    if (masked && maskingKey) {
      const unmasked = Buffer.alloc(payloadLength);
      for (let i = 0; i < payloadLength; i++) {
        unmasked[i] = payload[i] ^ maskingKey[i % 4];
      }
      payload = unmasked;
    }

    return {
      fin,
      opcode,
      masked,
      payload,
      frameLength: offset + payloadLength
    };
  }
}

// ============================================================================
// WEBSOCKET CONNECTION
// ============================================================================

class WebSocketConnection extends EventEmitter {
  constructor(socket, isServer = true) {
    super();
    this.socket = socket;
    this.isServer = isServer;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.pingInterval = null;
    this.isAlive = true;

    this.setupSocket();
    this.startHeartbeat();
  }

  setupSocket() {
    this.socket.on('data', (data) => this.handleData(data));
    this.socket.on('close', () => {
      this.stopHeartbeat();
      this.emit('close');
    });
    this.socket.on('error', (error) => this.emit('error', error));
  }

  handleData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);

    while (this.buffer.length > 0) {
      const frame = WebSocketFrame.decode(this.buffer);
      
      if (!frame) {
        break; // Need more data
      }

      this.buffer = this.buffer.slice(frame.frameLength);
      this.handleFrame(frame);
    }
  }

  handleFrame(frame) {
    switch (frame.opcode) {
      case OpCode.TEXT:
        if (frame.fin) {
          this.emit('message', frame.payload.toString('utf8'));
        } else {
          this.fragments.push(frame);
        }
        break;

      case OpCode.BINARY:
        if (frame.fin) {
          this.emit('message', frame.payload);
        } else {
          this.fragments.push(frame);
        }
        break;

      case OpCode.CONTINUATION:
        this.fragments.push(frame);
        if (frame.fin) {
          const completePayload = Buffer.concat(this.fragments.map(f => f.payload));
          const firstFrame = this.fragments[0];
          
          if (firstFrame.opcode === OpCode.TEXT) {
            this.emit('message', completePayload.toString('utf8'));
          } else {
            this.emit('message', completePayload);
          }
          
          this.fragments = [];
        }
        break;

      case OpCode.PING:
        this.sendPong(frame.payload);
        break;

      case OpCode.PONG:
        this.isAlive = true;
        this.emit('pong', frame.payload);
        break;

      case OpCode.CLOSE:
        let code = CloseCode.NO_STATUS;
        let reason = '';
        
        if (frame.payload.length >= 2) {
          code = frame.payload.readUInt16BE(0);
          reason = frame.payload.slice(2).toString('utf8');
        }
        
        this.close(code, reason);
        this.emit('close', code, reason);
        break;
    }
  }

  send(data, opcode = OpCode.TEXT) {
    const payload = typeof data === 'string' ? Buffer.from(data) : data;
    const frame = WebSocketFrame.encode(payload, opcode, !this.isServer);
    
    if (this.socket.writable) {
      this.socket.write(frame);
    }
  }

  sendPing(data = '') {
    const frame = WebSocketFrame.encode(data, OpCode.PING, !this.isServer);
    if (this.socket.writable) {
      this.socket.write(frame);
    }
  }

  sendPong(data = '') {
    const frame = WebSocketFrame.encode(data, OpCode.PONG, !this.isServer);
    if (this.socket.writable) {
      this.socket.write(frame);
    }
  }

  startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (!this.isAlive) {
        this.close(CloseCode.ABNORMAL, 'Heartbeat timeout');
        return;
      }
      
      this.isAlive = false;
      this.sendPing();
    }, 30000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  close(code = CloseCode.NORMAL, reason = '') {
    const payload = Buffer.alloc(2 + Buffer.byteLength(reason));
    payload.writeUInt16BE(code, 0);
    if (reason) {
      payload.write(reason, 2);
    }

    const frame = WebSocketFrame.encode(payload, OpCode.CLOSE, !this.isServer);
    
    if (this.socket.writable) {
      this.socket.write(frame, () => {
        this.socket.end();
      });
    }

    this.stopHeartbeat();
  }
}

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

class WebSocketServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 8080;
    this.host = options.host || '0.0.0.0';
    this.server = null;
    this.connections = new Set();
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on('error', reject);

      this.server.listen(this.port, this.host, () => {
        console.log(`WebSocket server listening on ${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  handleConnection(socket) {
    let buffer = '';
    let upgraded = false;

    socket.on('data', (data) => {
      if (!upgraded) {
        buffer += data.toString();

        if (buffer.includes('\r\n\r\n')) {
          const headers = this.parseHeaders(buffer);
          
          if (this.validateHandshake(headers)) {
            this.sendHandshakeResponse(socket, headers);
            
            const ws = new WebSocketConnection(socket, true);
            this.connections.add(ws);

            ws.on('message', (message) => this.emit('message', ws, message));
            ws.on('close', () => {
              this.connections.delete(ws);
              this.emit('close', ws);
            });
            ws.on('error', (error) => this.emit('error', ws, error));

            this.emit('connection', ws);
            upgraded = true;
          } else {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
          }
        }
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error.message);
    });
  }

  parseHeaders(data) {
    const headers = {};
    const lines = data.split('\r\n');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const colonIndex = line.indexOf(':');
      
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    return headers;
  }

  validateHandshake(headers) {
    return headers['upgrade'] === 'websocket' &&
           headers['connection']?.toLowerCase().includes('upgrade') &&
           headers['sec-websocket-key'];
  }

  sendHandshakeResponse(socket, headers) {
    const key = headers['sec-websocket-key'];
    const acceptKey = this.generateAcceptKey(key);

    const response = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      ''
    ].join('\r\n');

    socket.write(response);
  }

  generateAcceptKey(key) {
    return crypto
      .createHash('sha1')
      .update(key + MAGIC_STRING)
      .digest('base64');
  }

  broadcast(message) {
    for (const ws of this.connections) {
      ws.send(message);
    }
  }

  stop() {
    return new Promise((resolve) => {
      // Close all connections
      for (const ws of this.connections) {
        ws.close();
      }

      if (this.server) {
        this.server.close(() => {
          console.log('WebSocket server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// ============================================================================
// WEBSOCKET CLIENT
// ============================================================================

class WebSocketClient extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.socket = null;
    this.ws = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const urlParts = this.url.match(/^ws:\/\/([^:]+):(\d+)(\/.*)?$/);
      
      if (!urlParts) {
        reject(new Error('Invalid WebSocket URL'));
        return;
      }

      const host = urlParts[1];
      const port = parseInt(urlParts[2]);
      const path = urlParts[3] || '/';

      this.socket = net.connect(port, host, () => {
        this.sendHandshakeRequest(host, port, path);
      });

      let buffer = '';
      let upgraded = false;

      this.socket.on('data', (data) => {
        if (!upgraded) {
          buffer += data.toString();

          if (buffer.includes('\r\n\r\n')) {
            if (buffer.includes('101 Switching Protocols')) {
              this.ws = new WebSocketConnection(this.socket, false);

              this.ws.on('message', (message) => this.emit('message', message));
              this.ws.on('close', (code, reason) => this.emit('close', code, reason));
              this.ws.on('error', (error) => this.emit('error', error));

              upgraded = true;
              this.emit('open');
              resolve();
            } else {
              reject(new Error('Handshake failed'));
              this.socket.end();
            }
          }
        }
      });

      this.socket.on('error', reject);
    });
  }

  sendHandshakeRequest(host, port, path) {
    const key = crypto.randomBytes(16).toString('base64');

    const request = [
      `GET ${path} HTTP/1.1`,
      `Host: ${host}:${port}`,
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Key: ${key}`,
      'Sec-WebSocket-Version: 13',
      '',
      ''
    ].join('\r\n');

    this.socket.write(request);
  }

  send(message) {
    if (this.ws) {
      this.ws.send(message);
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// ============================================================================
// CHAT APPLICATION DEMO
// ============================================================================

class ChatServer {
  constructor(port = 8080) {
    this.server = new WebSocketServer({ port });
    this.clients = new Map();
  }

  async start() {
    await this.server.start();

    this.server.on('connection', (ws) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, { ws, username: null });

      console.log(`Client ${clientId} connected`);

      ws.send(JSON.stringify({
        type: 'welcome',
        clientId,
        message: 'Welcome to the chat! Please set your username with /name <username>'
      }));

      ws.on('message', (message) => {
        this.handleMessage(clientId, message.toString());
      });

      ws.on('close', () => {
        const client = this.clients.get(clientId);
        if (client && client.username) {
          this.broadcast({
            type: 'leave',
            username: client.username,
            message: `${client.username} left the chat`
          }, clientId);
        }
        this.clients.delete(clientId);
        console.log(`Client ${clientId} disconnected`);
      });
    });
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);

    if (message.startsWith('/name ')) {
      const username = message.substring(6).trim();
      const oldUsername = client.username;
      client.username = username;

      client.ws.send(JSON.stringify({
        type: 'system',
        message: `Your username is now: ${username}`
      }));

      if (oldUsername) {
        this.broadcast({
          type: 'system',
          message: `${oldUsername} is now known as ${username}`
        }, clientId);
      } else {
        this.broadcast({
          type: 'join',
          username,
          message: `${username} joined the chat`
        }, clientId);
      }
    } else if (message.startsWith('/list')) {
      const usernames = Array.from(this.clients.values())
        .filter(c => c.username)
        .map(c => c.username);

      client.ws.send(JSON.stringify({
        type: 'system',
        message: `Online users: ${usernames.join(', ')}`
      }));
    } else {
      if (!client.username) {
        client.ws.send(JSON.stringify({
          type: 'error',
          message: 'Please set your username first with /name <username>'
        }));
        return;
      }

      this.broadcast({
        type: 'message',
        username: client.username,
        message,
        timestamp: Date.now()
      });
    }
  }

  broadcast(data, excludeClientId = null) {
    const message = JSON.stringify(data);
    
    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClientId) {
        client.ws.send(message);
      }
    }
  }

  generateClientId() {
    return crypto.randomBytes(8).toString('hex');
  }

  async stop() {
    await this.server.stop();
  }
}

// ============================================================================
// DEMONSTRATION
// ============================================================================

async function demonstrateWebSocket() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(18) + 'WEBSOCKET PROTOCOL IMPLEMENTATION' + ' '.repeat(27) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');

  console.log('Starting WebSocket chat server...\n');

  const chatServer = new ChatServer(8080);
  await chatServer.start();

  // Simulate multiple clients
  console.log('Connecting clients...\n');

  const client1 = new WebSocketClient('ws://localhost:8080/');
  const client2 = new WebSocketClient('ws://localhost:8080/');
  const client3 = new WebSocketClient('ws://localhost:8080/');

  client1.on('message', (msg) => {
    const data = JSON.parse(msg);
    console.log(`[Client 1] ${data.type}: ${data.message || ''}`);
  });

  client2.on('message', (msg) => {
    const data = JSON.parse(msg);
    console.log(`[Client 2] ${data.type}: ${data.message || ''}`);
  });

  client3.on('message', (msg) => {
    const data = JSON.parse(msg);
    console.log(`[Client 3] ${data.type}: ${data.message || ''}`);
  });

  await client1.connect();
  await client2.connect();
  await client3.connect();

  await sleep(500);

  console.log('\nSetting usernames...\n');
  client1.send('/name Alice');
  await sleep(300);
  
  client2.send('/name Bob');
  await sleep(300);
  
  client3.send('/name Charlie');
  await sleep(500);

  console.log('\nSending messages...\n');
  client1.send('Hello everyone!');
  await sleep(300);
  
  client2.send('Hi Alice!');
  await sleep(300);
  
  client3.send('Hey there!');
  await sleep(300);

  client1.send('/list');
  await sleep(500);

  console.log('\nDisconnecting client...\n');
  client3.close();
  await sleep(500);

  client1.send('Goodbye!');
  await sleep(300);

  console.log('\nCleaning up...\n');
  client1.close();
  client2.close();
  
  await sleep(500);
  await chatServer.stop();

  console.log('Demonstration completed!\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  demonstrateWebSocket().catch(console.error);
}

module.exports = {
  WebSocketServer,
  WebSocketClient,
  WebSocketConnection,
  WebSocketFrame,
  ChatServer,
  OpCode,
  CloseCode
};
