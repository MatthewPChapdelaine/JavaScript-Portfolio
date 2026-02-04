#!/usr/bin/env node

/**
 * REAL-TIME STREAM PROCESSING SYSTEM
 * 
 * A comprehensive stream processing engine with:
 * - Event streams with backpressure handling
 * - Time-based windowing (tumbling, sliding, session)
 * - Stream aggregations and transformations
 * - Stream joins
 * - Watermarks for late data handling
 * - Checkpoint and state management
 * - Complex event processing
 */

const EventEmitter = require('events');

// ============================================================================
// STREAM EVENT
// ============================================================================

class StreamEvent {
  constructor(key, value, timestamp = Date.now(), metadata = {}) {
    this.key = key;
    this.value = value;
    this.timestamp = timestamp;
    this.metadata = metadata;
  }

  clone() {
    return new StreamEvent(
      this.key,
      this.value,
      this.timestamp,
      { ...this.metadata }
    );
  }
}

// ============================================================================
// STREAM
// ============================================================================

class Stream extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.options = {
      highWaterMark: options.highWaterMark || 1000,
      lowWaterMark: options.lowWaterMark || 100,
      bufferSize: options.bufferSize || 10000,
      ...options
    };

    this.buffer = [];
    this.paused = false;
    this.subscribers = new Set();
    this.metrics = {
      eventsReceived: 0,
      eventsEmitted: 0,
      backpressureEvents: 0,
      droppedEvents: 0
    };
  }

  emit(event, ...args) {
    if (event === 'data') {
      this.metrics.eventsEmitted++;
      
      // Check backpressure
      if (this.buffer.length >= this.options.highWaterMark) {
        this.metrics.backpressureEvents++;
        this.paused = true;
        super.emit('backpressure', this.buffer.length);
      }
    }
    
    return super.emit(event, ...args);
  }

  push(event) {
    if (!(event instanceof StreamEvent)) {
      event = new StreamEvent(event.key, event.value, event.timestamp, event.metadata);
    }

    this.metrics.eventsReceived++;

    // Check buffer capacity
    if (this.buffer.length >= this.options.bufferSize) {
      this.metrics.droppedEvents++;
      this.emit('dropped', event);
      return false;
    }

    this.buffer.push(event);

    // Emit to subscribers
    this.emit('data', event);

    // Check if we can resume
    if (this.paused && this.buffer.length <= this.options.lowWaterMark) {
      this.paused = false;
      this.emit('resume');
    }

    return true;
  }

  map(fn) {
    const mapped = new Stream(`${this.name}.map`, this.options);
    
    this.on('data', (event) => {
      try {
        const result = fn(event.value, event);
        mapped.push(new StreamEvent(event.key, result, event.timestamp, event.metadata));
      } catch (error) {
        this.emit('error', error);
      }
    });

    return mapped;
  }

  filter(predicate) {
    const filtered = new Stream(`${this.name}.filter`, this.options);
    
    this.on('data', (event) => {
      try {
        if (predicate(event.value, event)) {
          filtered.push(event);
        }
      } catch (error) {
        this.emit('error', error);
      }
    });

    return filtered;
  }

  reduce(fn, initialValue) {
    let accumulator = initialValue;
    
    const reduced = new Stream(`${this.name}.reduce`, this.options);
    
    this.on('data', (event) => {
      try {
        accumulator = fn(accumulator, event.value, event);
        reduced.push(new StreamEvent(event.key, accumulator, event.timestamp, event.metadata));
      } catch (error) {
        this.emit('error', error);
      }
    });

    return reduced;
  }

  keyBy(keyFn) {
    const keyed = new Stream(`${this.name}.keyBy`, this.options);
    
    this.on('data', (event) => {
      try {
        const newKey = keyFn(event.value, event);
        keyed.push(new StreamEvent(newKey, event.value, event.timestamp, event.metadata));
      } catch (error) {
        this.emit('error', error);
      }
    });

    return keyed;
  }

  flatMap(fn) {
    const flattened = new Stream(`${this.name}.flatMap`, this.options);
    
    this.on('data', (event) => {
      try {
        const results = fn(event.value, event);
        for (const result of results) {
          flattened.push(new StreamEvent(event.key, result, event.timestamp, event.metadata));
        }
      } catch (error) {
        this.emit('error', error);
      }
    });

    return flattened;
  }

  forEach(fn) {
    this.on('data', (event) => {
      try {
        fn(event.value, event);
      } catch (error) {
        this.emit('error', error);
      }
    });
  }

  getMetrics() {
    return { ...this.metrics, bufferSize: this.buffer.length, paused: this.paused };
  }
}

// ============================================================================
// WINDOWING
// ============================================================================

class Window {
  constructor(start, end) {
    this.start = start;
    this.end = end;
    this.events = [];
  }

  add(event) {
    this.events.push(event);
  }

  contains(timestamp) {
    return timestamp >= this.start && timestamp < this.end;
  }

  isEmpty() {
    return this.events.length === 0;
  }

  getResult() {
    return {
      start: this.start,
      end: this.end,
      count: this.events.length,
      events: this.events
    };
  }
}

class WindowedStream extends Stream {
  constructor(sourceStream, windowSize, slideSize = null) {
    super(`${sourceStream.name}.windowed`);
    this.sourceStream = sourceStream;
    this.windowSize = windowSize;
    this.slideSize = slideSize || windowSize; // Default to tumbling window
    this.windows = new Map();
    this.watermark = 0;

    this.setupWindowing();
  }

  setupWindowing() {
    this.sourceStream.on('data', (event) => {
      this.addToWindows(event);
      this.updateWatermark(event.timestamp);
      this.emitCompletedWindows();
    });
  }

  addToWindows(event) {
    const windowStart = Math.floor(event.timestamp / this.slideSize) * this.slideSize;
    
    // For sliding windows, event may belong to multiple windows
    const numWindows = Math.ceil(this.windowSize / this.slideSize);
    
    for (let i = 0; i < numWindows; i++) {
      const start = windowStart - (i * this.slideSize);
      const end = start + this.windowSize;
      
      if (event.timestamp >= start && event.timestamp < end) {
        const windowKey = `${start}-${end}`;
        
        if (!this.windows.has(windowKey)) {
          this.windows.set(windowKey, new Window(start, end));
        }
        
        this.windows.get(windowKey).add(event);
      }
    }
  }

  updateWatermark(timestamp) {
    this.watermark = Math.max(this.watermark, timestamp);
  }

  emitCompletedWindows() {
    const completedWindows = [];
    
    for (const [key, window] of this.windows) {
      if (window.end <= this.watermark) {
        completedWindows.push(key);
        
        if (!window.isEmpty()) {
          const result = window.getResult();
          this.push(new StreamEvent(
            `window-${window.start}-${window.end}`,
            result,
            window.end
          ));
        }
      }
    }

    // Remove completed windows
    for (const key of completedWindows) {
      this.windows.delete(key);
    }
  }

  aggregate(keyFn, aggregateFn, initialValue) {
    const aggregated = new Stream(`${this.name}.aggregate`);
    
    this.on('data', (event) => {
      const windowResult = event.value;
      const grouped = new Map();

      // Group events by key
      for (const evt of windowResult.events) {
        const key = keyFn(evt.value, evt);
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key).push(evt);
      }

      // Aggregate each group
      for (const [key, events] of grouped) {
        let acc = typeof initialValue === 'function' ? initialValue() : initialValue;
        
        for (const evt of events) {
          acc = aggregateFn(acc, evt.value, evt);
        }

        aggregated.push(new StreamEvent(
          key,
          {
            key,
            value: acc,
            count: events.length,
            window: { start: windowResult.start, end: windowResult.end }
          },
          windowResult.end
        ));
      }
    });

    return aggregated;
  }
}

// ============================================================================
// SESSION WINDOWS
// ============================================================================

class SessionWindow extends Window {
  constructor(start, gap) {
    super(start, start + gap);
    this.gap = gap;
    this.lastEventTime = start;
  }

  add(event) {
    super.add(event);
    this.lastEventTime = event.timestamp;
    this.end = this.lastEventTime + this.gap;
  }

  isExpired(watermark) {
    return watermark >= this.end;
  }
}

class SessionWindowedStream extends Stream {
  constructor(sourceStream, sessionGap) {
    super(`${sourceStream.name}.sessionWindowed`);
    this.sourceStream = sourceStream;
    this.sessionGap = sessionGap;
    this.sessions = new Map();
    this.watermark = 0;

    this.setupWindowing();
  }

  setupWindowing() {
    this.sourceStream.on('data', (event) => {
      this.addToSession(event);
      this.updateWatermark(event.timestamp);
      this.emitExpiredSessions();
    });
  }

  addToSession(event) {
    const key = event.key;
    
    if (!this.sessions.has(key)) {
      this.sessions.set(key, new SessionWindow(event.timestamp, this.sessionGap));
    }
    
    const session = this.sessions.get(key);
    
    // Check if event is within session gap
    if (event.timestamp - session.lastEventTime <= this.sessionGap) {
      session.add(event);
    } else {
      // Start new session
      if (!session.isEmpty()) {
        this.emitSession(key, session);
      }
      this.sessions.set(key, new SessionWindow(event.timestamp, this.sessionGap));
      this.sessions.get(key).add(event);
    }
  }

  updateWatermark(timestamp) {
    this.watermark = Math.max(this.watermark, timestamp);
  }

  emitExpiredSessions() {
    const expiredKeys = [];
    
    for (const [key, session] of this.sessions) {
      if (session.isExpired(this.watermark)) {
        expiredKeys.push(key);
        if (!session.isEmpty()) {
          this.emitSession(key, session);
        }
      }
    }

    for (const key of expiredKeys) {
      this.sessions.delete(key);
    }
  }

  emitSession(key, session) {
    const result = session.getResult();
    this.push(new StreamEvent(
      key,
      {
        sessionStart: result.start,
        sessionEnd: result.end,
        duration: result.end - result.start,
        events: result.events,
        count: result.count
      },
      result.end
    ));
  }
}

// ============================================================================
// STREAM JOIN
// ============================================================================

class JoinedStream extends Stream {
  constructor(leftStream, rightStream, joinWindow) {
    super(`${leftStream.name}.join.${rightStream.name}`);
    this.leftStream = leftStream;
    this.rightStream = rightStream;
    this.joinWindow = joinWindow;
    this.leftBuffer = new Map();
    this.rightBuffer = new Map();

    this.setupJoin();
  }

  setupJoin() {
    this.leftStream.on('data', (event) => {
      this.processLeft(event);
    });

    this.rightStream.on('data', (event) => {
      this.processRight(event);
    });
  }

  processLeft(event) {
    const key = event.key;
    
    if (!this.leftBuffer.has(key)) {
      this.leftBuffer.set(key, []);
    }
    this.leftBuffer.get(key).push(event);

    // Try to join with right
    if (this.rightBuffer.has(key)) {
      for (const rightEvent of this.rightBuffer.get(key)) {
        if (Math.abs(event.timestamp - rightEvent.timestamp) <= this.joinWindow) {
          this.emitJoined(event, rightEvent);
        }
      }
    }

    // Clean old events
    this.cleanBuffer(this.leftBuffer, event.timestamp);
  }

  processRight(event) {
    const key = event.key;
    
    if (!this.rightBuffer.has(key)) {
      this.rightBuffer.set(key, []);
    }
    this.rightBuffer.get(key).push(event);

    // Try to join with left
    if (this.leftBuffer.has(key)) {
      for (const leftEvent of this.leftBuffer.get(key)) {
        if (Math.abs(event.timestamp - leftEvent.timestamp) <= this.joinWindow) {
          this.emitJoined(leftEvent, event);
        }
      }
    }

    // Clean old events
    this.cleanBuffer(this.rightBuffer, event.timestamp);
  }

  emitJoined(leftEvent, rightEvent) {
    this.push(new StreamEvent(
      leftEvent.key,
      {
        left: leftEvent.value,
        right: rightEvent.value,
        leftTimestamp: leftEvent.timestamp,
        rightTimestamp: rightEvent.timestamp
      },
      Math.max(leftEvent.timestamp, rightEvent.timestamp)
    ));
  }

  cleanBuffer(buffer, currentTimestamp) {
    for (const [key, events] of buffer) {
      const filtered = events.filter(e => 
        currentTimestamp - e.timestamp <= this.joinWindow * 2
      );
      
      if (filtered.length === 0) {
        buffer.delete(key);
      } else {
        buffer.set(key, filtered);
      }
    }
  }
}

// ============================================================================
// COMPLEX EVENT PROCESSING
// ============================================================================

class Pattern {
  constructor(name) {
    this.name = name;
    this.conditions = [];
    this.timeConstraint = null;
  }

  where(condition) {
    this.conditions.push(condition);
    return this;
  }

  within(timeMs) {
    this.timeConstraint = timeMs;
    return this;
  }

  matches(events) {
    if (events.length !== this.conditions.length) {
      return false;
    }

    // Check time constraint
    if (this.timeConstraint) {
      const timeSpan = events[events.length - 1].timestamp - events[0].timestamp;
      if (timeSpan > this.timeConstraint) {
        return false;
      }
    }

    // Check conditions
    for (let i = 0; i < this.conditions.length; i++) {
      if (!this.conditions[i](events[i].value, events[i])) {
        return false;
      }
    }

    return true;
  }
}

class CEPStream extends Stream {
  constructor(sourceStream, pattern) {
    super(`${sourceStream.name}.cep`);
    this.sourceStream = sourceStream;
    this.pattern = pattern;
    this.partialMatches = new Map();

    this.setupCEP();
  }

  setupCEP() {
    this.sourceStream.on('data', (event) => {
      this.processEvent(event);
    });
  }

  processEvent(event) {
    const key = event.key;
    
    if (!this.partialMatches.has(key)) {
      this.partialMatches.set(key, []);
    }

    const matches = this.partialMatches.get(key);
    
    // Try to extend existing partial matches
    const newMatches = [];
    for (const match of matches) {
      const extended = [...match, event];
      
      if (this.pattern.matches(extended)) {
        this.push(new StreamEvent(
          key,
          { pattern: this.pattern.name, events: extended },
          event.timestamp
        ));
      } else if (extended.length < this.pattern.conditions.length) {
        newMatches.push(extended);
      }
    }

    // Start new match
    if (this.pattern.conditions.length > 0 && 
        this.pattern.conditions[0](event.value, event)) {
      if (this.pattern.conditions.length === 1) {
        this.push(new StreamEvent(
          key,
          { pattern: this.pattern.name, events: [event] },
          event.timestamp
        ));
      } else {
        newMatches.push([event]);
      }
    }

    this.partialMatches.set(key, newMatches);

    // Clean old partial matches
    this.cleanPartialMatches(event.timestamp);
  }

  cleanPartialMatches(currentTimestamp) {
    if (!this.pattern.timeConstraint) return;

    for (const [key, matches] of this.partialMatches) {
      const filtered = matches.filter(match =>
        currentTimestamp - match[0].timestamp <= this.pattern.timeConstraint
      );
      
      if (filtered.length === 0) {
        this.partialMatches.delete(key);
      } else {
        this.partialMatches.set(key, filtered);
      }
    }
  }
}

// ============================================================================
// STATEFUL PROCESSOR
// ============================================================================

class StatefulProcessor {
  constructor(stream, processFn, initialState = {}) {
    this.stream = stream;
    this.processFn = processFn;
    this.state = new Map();
    this.initialState = initialState;
    this.checkpoints = [];

    this.setupProcessor();
  }

  setupProcessor() {
    this.stream.on('data', (event) => {
      const key = event.key;
      
      if (!this.state.has(key)) {
        this.state.set(key, typeof this.initialState === 'function' 
          ? this.initialState() 
          : { ...this.initialState });
      }

      const currentState = this.state.get(key);
      const newState = this.processFn(currentState, event.value, event);
      this.state.set(key, newState);
    });
  }

  getState(key) {
    return this.state.get(key);
  }

  checkpoint() {
    const snapshot = new Map();
    for (const [key, value] of this.state) {
      snapshot.set(key, JSON.parse(JSON.stringify(value)));
    }
    
    this.checkpoints.push({
      timestamp: Date.now(),
      state: snapshot
    });

    // Keep only last 10 checkpoints
    if (this.checkpoints.length > 10) {
      this.checkpoints.shift();
    }

    return this.checkpoints.length - 1;
  }

  restore(checkpointIndex) {
    if (checkpointIndex < 0 || checkpointIndex >= this.checkpoints.length) {
      throw new Error('Invalid checkpoint index');
    }

    const checkpoint = this.checkpoints[checkpointIndex];
    this.state = new Map(checkpoint.state);
  }
}

// ============================================================================
// DEMONSTRATIONS
// ============================================================================

async function demonstrateStreamProcessing() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + 'STREAM PROCESSING DEMONSTRATION' + ' '.repeat(27) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');

  // Demo 1: Basic Stream Operations
  console.log('DEMO 1: Basic Stream Operations');
  console.log('='.repeat(80));
  
  const numberStream = new Stream('numbers');
  
  const doubled = numberStream
    .map(x => x * 2)
    .filter(x => x > 10);

  doubled.forEach(value => {
    console.log(`  Doubled and filtered: ${value}`);
  });

  for (let i = 1; i <= 10; i++) {
    numberStream.push(new StreamEvent(`key-${i}`, i));
  }

  await sleep(100);
  console.log();

  // Demo 2: Windowing
  console.log('DEMO 2: Tumbling Window (5 second windows)');
  console.log('='.repeat(80));

  const eventStream = new Stream('events');
  const windowed = new WindowedStream(eventStream, 5000);

  windowed.forEach(value => {
    const window = value;
    console.log(`  Window [${new Date(window.start).toISOString()} - ${new Date(window.end).toISOString()}]`);
    console.log(`    Count: ${window.count}`);
    console.log(`    Values: [${window.events.map(e => e.value).join(', ')}]`);
  });

  const baseTime = Date.now();
  for (let i = 0; i < 15; i++) {
    eventStream.push(new StreamEvent(
      `event-${i}`,
      i * 10,
      baseTime + i * 1000
    ));
  }

  await sleep(200);
  console.log();

  // Demo 3: Aggregation
  console.log('DEMO 3: Windowed Aggregation');
  console.log('='.repeat(80));

  const sensorStream = new Stream('sensors');
  const sensorWindowed = new WindowedStream(sensorStream, 3000, 1500);

  const aggregated = sensorWindowed.aggregate(
    (event) => event.sensor,
    (acc, value) => ({
      sum: acc.sum + value.temperature,
      count: acc.count + 1,
      avg: (acc.sum + value.temperature) / (acc.count + 1),
      min: Math.min(acc.min, value.temperature),
      max: Math.max(acc.max, value.temperature)
    }),
    () => ({ sum: 0, count: 0, avg: 0, min: Infinity, max: -Infinity })
  );

  aggregated.forEach(value => {
    console.log(`  Sensor ${value.key}:`);
    console.log(`    Avg: ${value.value.avg.toFixed(2)}°C`);
    console.log(`    Min: ${value.value.min}°C, Max: ${value.value.max}°C`);
    console.log(`    Samples: ${value.value.count}`);
  });

  const sensors = ['sensor-1', 'sensor-2', 'sensor-3'];
  for (let i = 0; i < 20; i++) {
    const sensor = sensors[Math.floor(Math.random() * sensors.length)];
    const temp = 20 + Math.random() * 10;
    
    sensorStream.push(new StreamEvent(
      sensor,
      { sensor, temperature: Math.round(temp * 10) / 10 },
      baseTime + i * 500
    ));
  }

  await sleep(200);
  console.log();

  // Demo 4: Session Windows
  console.log('DEMO 4: Session Windows (2 second gap)');
  console.log('='.repeat(80));

  const clickStream = new Stream('clicks');
  const sessions = new SessionWindowedStream(clickStream, 2000);

  sessions.forEach(value => {
    console.log(`  User ${value.key} session:`);
    console.log(`    Duration: ${value.duration}ms`);
    console.log(`    Clicks: ${value.count}`);
    console.log(`    Pages: [${value.events.map(e => e.value.page).join(', ')}]`);
  });

  const users = ['user-1', 'user-2'];
  const pages = ['home', 'products', 'cart', 'checkout'];

  // User 1 session 1
  clickStream.push(new StreamEvent('user-1', { page: pages[0] }, baseTime));
  clickStream.push(new StreamEvent('user-1', { page: pages[1] }, baseTime + 500));
  clickStream.push(new StreamEvent('user-1', { page: pages[2] }, baseTime + 1000));
  
  // User 2 session 1
  clickStream.push(new StreamEvent('user-2', { page: pages[0] }, baseTime + 500));
  clickStream.push(new StreamEvent('user-2', { page: pages[1] }, baseTime + 1500));

  // User 1 session 2 (after gap)
  clickStream.push(new StreamEvent('user-1', { page: pages[0] }, baseTime + 4000));
  clickStream.push(new StreamEvent('user-1', { page: pages[3] }, baseTime + 4500));

  // Trigger emission
  clickStream.push(new StreamEvent('user-1', { page: pages[0] }, baseTime + 10000));
  clickStream.push(new StreamEvent('user-2', { page: pages[0] }, baseTime + 10000));

  await sleep(200);
  console.log();

  // Demo 5: Stream Join
  console.log('DEMO 5: Stream Join');
  console.log('='.repeat(80));

  const ordersStream = new Stream('orders');
  const paymentsStream = new Stream('payments');
  const joined = new JoinedStream(ordersStream, paymentsStream, 5000);

  joined.forEach(value => {
    console.log(`  Order ${value.key} matched with payment:`);
    console.log(`    Order: $${value.left.amount}`);
    console.log(`    Payment: $${value.right.amount} via ${value.right.method}`);
  });

  ordersStream.push(new StreamEvent('order-1', { amount: 100 }, baseTime));
  paymentsStream.push(new StreamEvent('order-1', { amount: 100, method: 'credit-card' }, baseTime + 1000));
  
  ordersStream.push(new StreamEvent('order-2', { amount: 250 }, baseTime + 2000));
  paymentsStream.push(new StreamEvent('order-2', { amount: 250, method: 'paypal' }, baseTime + 2500));

  await sleep(200);
  console.log();

  // Demo 6: Complex Event Processing
  console.log('DEMO 6: Complex Event Processing (Fraud Detection)');
  console.log('='.repeat(80));

  const transactionStream = new Stream('transactions');
  
  const fraudPattern = new Pattern('high-value-rapid-transactions')
    .where(tx => tx.amount > 1000)
    .where(tx => tx.amount > 1000)
    .where(tx => tx.amount > 1000)
    .within(10000);

  const fraudDetection = new CEPStream(transactionStream, fraudPattern);

  fraudDetection.forEach(value => {
    console.log(`  🚨 FRAUD ALERT for ${value.key}:`);
    console.log(`    Pattern: ${value.pattern}`);
    console.log(`    Transactions: ${value.events.length}`);
    const total = value.events.reduce((sum, e) => sum + e.value.amount, 0);
    console.log(`    Total amount: $${total}`);
  });

  const cardId = 'card-12345';
  transactionStream.push(new StreamEvent(cardId, { amount: 1500 }, baseTime));
  transactionStream.push(new StreamEvent(cardId, { amount: 2000 }, baseTime + 3000));
  transactionStream.push(new StreamEvent(cardId, { amount: 1800 }, baseTime + 5000));

  await sleep(200);
  console.log();

  // Demo 7: Stateful Processing
  console.log('DEMO 7: Stateful Processing (Running Balance)');
  console.log('='.repeat(80));

  const accountStream = new Stream('accounts');
  
  const balanceProcessor = new StatefulProcessor(
    accountStream,
    (state, transaction) => {
      const newBalance = state.balance + transaction.amount;
      return {
        balance: newBalance,
        transactionCount: state.transactionCount + 1,
        lastTransaction: transaction
      };
    },
    { balance: 0, transactionCount: 0, lastTransaction: null }
  );

  accountStream.on('data', (event) => {
    const state = balanceProcessor.getState(event.key);
    console.log(`  Account ${event.key}: Balance = $${state.balance}, Transactions = ${state.transactionCount}`);
  });

  accountStream.push(new StreamEvent('acc-1', { amount: 100, type: 'deposit' }));
  accountStream.push(new StreamEvent('acc-1', { amount: -30, type: 'withdrawal' }));
  accountStream.push(new StreamEvent('acc-1', { amount: 50, type: 'deposit' }));
  accountStream.push(new StreamEvent('acc-2', { amount: 200, type: 'deposit' }));

  await sleep(200);
  console.log();

  // Print metrics
  console.log('STREAM METRICS');
  console.log('='.repeat(80));
  
  const streams = [
    numberStream, eventStream, sensorStream, 
    clickStream, ordersStream, paymentsStream, transactionStream, accountStream
  ];

  for (const stream of streams) {
    const metrics = stream.getMetrics();
    console.log(`${stream.name}:`);
    console.log(`  Events Received: ${metrics.eventsReceived}`);
    console.log(`  Events Emitted: ${metrics.eventsEmitted}`);
    console.log(`  Buffer Size: ${metrics.bufferSize}`);
    console.log(`  Backpressure Events: ${metrics.backpressureEvents}`);
    console.log(`  Dropped Events: ${metrics.droppedEvents}`);
  }

  console.log('='.repeat(80) + '\n');
  console.log('All demonstrations completed!\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  demonstrateStreamProcessing().catch(console.error);
}

module.exports = {
  Stream,
  StreamEvent,
  WindowedStream,
  SessionWindowedStream,
  JoinedStream,
  CEPStream,
  Pattern,
  StatefulProcessor,
  Window,
  SessionWindow
};
