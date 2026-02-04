#!/usr/bin/env node

/**
 * PRODUCTION-GRADE ASYNC TASK QUEUE
 * 
 * A comprehensive job queue system with:
 * - Priority-based task scheduling
 * - Persistent storage (simulated with JSON)
 * - Worker pool management
 * - Retry logic with exponential backoff
 * - Dead-letter queue for failed tasks
 * - Task lifecycle hooks
 * - Concurrency control
 * - Rate limiting
 * - Progress tracking
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// TASK PRIORITY LEVELS
// ============================================================================

const Priority = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  BACKGROUND: 4
};

// ============================================================================
// TASK STATUS
// ============================================================================

const TaskStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRY: 'RETRY',
  DEAD: 'DEAD'
};

// ============================================================================
// TASK CLASS
// ============================================================================

class Task {
  constructor(id, type, payload, options = {}) {
    this.id = id || crypto.randomBytes(16).toString('hex');
    this.type = type;
    this.payload = payload;
    this.priority = options.priority || Priority.NORMAL;
    this.maxRetries = options.maxRetries || 3;
    this.retryCount = 0;
    this.timeout = options.timeout || 30000;
    this.delay = options.delay || 0;
    
    this.status = TaskStatus.PENDING;
    this.createdAt = Date.now();
    this.scheduledAt = this.createdAt + this.delay;
    this.startedAt = null;
    this.completedAt = null;
    this.error = null;
    this.result = null;
    this.metadata = options.metadata || {};
  }

  retry() {
    this.retryCount++;
    this.status = TaskStatus.RETRY;
    this.error = null;
    
    // Exponential backoff
    const backoff = Math.pow(2, this.retryCount) * 1000;
    this.scheduledAt = Date.now() + backoff;
  }

  fail(error) {
    this.status = TaskStatus.FAILED;
    this.error = error.message || String(error);
    this.completedAt = Date.now();
  }

  complete(result) {
    this.status = TaskStatus.COMPLETED;
    this.result = result;
    this.completedAt = Date.now();
  }

  markDead(reason) {
    this.status = TaskStatus.DEAD;
    this.error = reason;
    this.completedAt = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      payload: this.payload,
      priority: this.priority,
      maxRetries: this.maxRetries,
      retryCount: this.retryCount,
      timeout: this.timeout,
      status: this.status,
      createdAt: this.createdAt,
      scheduledAt: this.scheduledAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      error: this.error,
      result: this.result,
      metadata: this.metadata
    };
  }

  static fromJSON(json) {
    const task = new Task(json.id, json.type, json.payload, {
      priority: json.priority,
      maxRetries: json.maxRetries,
      timeout: json.timeout,
      metadata: json.metadata
    });
    
    Object.assign(task, json);
    return task;
  }
}

// ============================================================================
// WORKER CLASS
// ============================================================================

class Worker extends EventEmitter {
  constructor(id, queue) {
    super();
    this.id = id;
    this.queue = queue;
    this.currentTask = null;
    this.isRunning = false;
    this.stats = {
      tasksProcessed: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      totalProcessingTime: 0
    };
  }

  async start() {
    this.isRunning = true;
    this.emit('started', this.id);
    
    while (this.isRunning) {
      try {
        const task = await this.queue.dequeue();
        
        if (!task) {
          await this.sleep(100);
          continue;
        }

        await this.processTask(task);
      } catch (error) {
        console.error(`[Worker ${this.id}] Error:`, error.message);
        await this.sleep(1000);
      }
    }

    this.emit('stopped', this.id);
  }

  async processTask(task) {
    this.currentTask = task;
    task.status = TaskStatus.PROCESSING;
    task.startedAt = Date.now();
    
    this.emit('taskStarted', { workerId: this.id, task });
    
    const startTime = Date.now();

    try {
      // Get handler for task type
      const handler = this.queue.handlers.get(task.type);
      
      if (!handler) {
        throw new Error(`No handler registered for task type: ${task.type}`);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        handler(task.payload, task),
        task.timeout
      );

      task.complete(result);
      this.stats.tasksSucceeded++;
      
      this.emit('taskCompleted', { workerId: this.id, task, result });
      await this.queue.onTaskCompleted(task);

    } catch (error) {
      task.fail(error);
      this.stats.tasksFailed++;
      
      this.emit('taskFailed', { workerId: this.id, task, error });

      // Retry logic
      if (task.retryCount < task.maxRetries) {
        task.retry();
        await this.queue.enqueue(task);
        this.emit('taskRetry', { workerId: this.id, task, retryCount: task.retryCount });
      } else {
        task.markDead('Max retries exceeded');
        await this.queue.moveToDeadLetterQueue(task);
        this.emit('taskDead', { workerId: this.id, task });
      }

      await this.queue.onTaskFailed(task, error);
    } finally {
      const processingTime = Date.now() - startTime;
      this.stats.totalProcessingTime += processingTime;
      this.stats.tasksProcessed++;
      this.currentTask = null;
    }
  }

  async executeWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeout)
      )
    ]);
  }

  stop() {
    this.isRunning = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.stats,
      avgProcessingTime: this.stats.tasksProcessed > 0
        ? this.stats.totalProcessingTime / this.stats.tasksProcessed
        : 0,
      currentTask: this.currentTask ? this.currentTask.id : null
    };
  }
}

// ============================================================================
// TASK QUEUE CLASS
// ============================================================================

class TaskQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      concurrency: options.concurrency || 4,
      persistPath: options.persistPath || './queue-data',
      persistInterval: options.persistInterval || 5000,
      rateLimit: options.rateLimit || null,
      ...options
    };

    this.queues = new Map();
    Object.values(Priority).forEach(p => {
      this.queues.set(p, []);
    });

    this.deadLetterQueue = [];
    this.handlers = new Map();
    this.workers = [];
    this.isRunning = false;
    
    this.stats = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalRetries: 0,
      totalDead: 0
    };

    this.rateLimiter = this.options.rateLimit 
      ? new RateLimiter(this.options.rateLimit.requests, this.options.rateLimit.window)
      : null;

    this.persistTimer = null;
  }

  // ==========================================================================
  // HANDLER REGISTRATION
  // ==========================================================================

  registerHandler(type, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    this.handlers.set(type, handler);
  }

  // ==========================================================================
  // QUEUE OPERATIONS
  // ==========================================================================

  async enqueue(task) {
    if (!(task instanceof Task)) {
      task = new Task(null, task.type, task.payload, task.options);
    }

    const priorityQueue = this.queues.get(task.priority);
    if (!priorityQueue) {
      throw new Error(`Invalid priority: ${task.priority}`);
    }

    priorityQueue.push(task);
    priorityQueue.sort((a, b) => a.scheduledAt - b.scheduledAt);

    this.stats.totalEnqueued++;
    this.emit('taskEnqueued', task);

    return task.id;
  }

  async dequeue() {
    // Check rate limit
    if (this.rateLimiter && !this.rateLimiter.tryAcquire()) {
      return null;
    }

    const now = Date.now();

    // Check queues by priority
    for (const priority of Object.values(Priority)) {
      const queue = this.queues.get(priority);
      
      if (queue.length > 0) {
        // Find first task that's ready to execute
        const index = queue.findIndex(task => 
          task.scheduledAt <= now && task.status !== TaskStatus.PROCESSING
        );

        if (index !== -1) {
          const task = queue.splice(index, 1)[0];
          this.stats.totalProcessed++;
          return task;
        }
      }
    }

    return null;
  }

  async moveToDeadLetterQueue(task) {
    this.deadLetterQueue.push(task);
    this.stats.totalDead++;
    this.emit('taskMovedToDLQ', task);
  }

  // ==========================================================================
  // WORKER POOL MANAGEMENT
  // ==========================================================================

  async start() {
    if (this.isRunning) {
      throw new Error('Queue is already running');
    }

    this.isRunning = true;
    
    // Load persisted state
    await this.load();

    // Create workers
    for (let i = 0; i < this.options.concurrency; i++) {
      const worker = new Worker(i, this);
      
      worker.on('taskStarted', (data) => this.emit('taskStarted', data));
      worker.on('taskCompleted', (data) => {
        this.stats.totalCompleted++;
        this.emit('taskCompleted', data);
      });
      worker.on('taskFailed', (data) => {
        this.stats.totalFailed++;
        this.emit('taskFailed', data);
      });
      worker.on('taskRetry', (data) => {
        this.stats.totalRetries++;
        this.emit('taskRetry', data);
      });
      worker.on('taskDead', (data) => this.emit('taskDead', data));

      this.workers.push(worker);
      worker.start();
    }

    // Start persistence
    this.startPersistence();

    this.emit('started');
    console.log(`Task queue started with ${this.options.concurrency} workers`);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop workers
    for (const worker of this.workers) {
      worker.stop();
    }

    // Wait for current tasks to complete
    await this.waitForWorkers();

    // Stop persistence
    this.stopPersistence();

    // Final save
    await this.save();

    this.emit('stopped');
    console.log('Task queue stopped');
  }

  async waitForWorkers(timeout = 30000) {
    const startTime = Date.now();
    
    while (this.workers.some(w => w.currentTask !== null)) {
      if (Date.now() - startTime > timeout) {
        console.warn('Timeout waiting for workers to complete');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  startPersistence() {
    if (this.options.persistInterval > 0) {
      this.persistTimer = setInterval(() => {
        this.save().catch(console.error);
      }, this.options.persistInterval);
    }
  }

  stopPersistence() {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
  }

  async save() {
    try {
      await fs.mkdir(this.options.persistPath, { recursive: true });

      const data = {
        queues: Object.fromEntries(
          Array.from(this.queues.entries()).map(([priority, tasks]) => [
            priority,
            tasks.map(t => t.toJSON())
          ])
        ),
        deadLetterQueue: this.deadLetterQueue.map(t => t.toJSON()),
        stats: this.stats,
        timestamp: Date.now()
      };

      const filePath = path.join(this.options.persistPath, 'queue-state.json');
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving queue state:', error.message);
    }
  }

  async load() {
    try {
      const filePath = path.join(this.options.persistPath, 'queue-state.json');
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

      // Restore queues
      for (const [priority, tasks] of Object.entries(data.queues)) {
        this.queues.set(Number(priority), tasks.map(t => Task.fromJSON(t)));
      }

      // Restore dead letter queue
      this.deadLetterQueue = data.deadLetterQueue.map(t => Task.fromJSON(t));

      // Restore stats
      Object.assign(this.stats, data.stats);

      console.log('Queue state loaded from disk');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading queue state:', error.message);
      }
    }
  }

  // ==========================================================================
  // LIFECYCLE HOOKS
  // ==========================================================================

  async onTaskCompleted(task) {
    // Override this method for custom logic
  }

  async onTaskFailed(task, error) {
    // Override this method for custom logic
  }

  // ==========================================================================
  // QUEUE INSPECTION
  // ==========================================================================

  getStats() {
    return {
      ...this.stats,
      queueLengths: Object.fromEntries(
        Array.from(this.queues.entries()).map(([priority, tasks]) => [
          this.getPriorityName(priority),
          tasks.length
        ])
      ),
      deadLetterQueueLength: this.deadLetterQueue.length,
      workers: this.workers.map(w => w.getStats())
    };
  }

  getPriorityName(priority) {
    return Object.keys(Priority).find(key => Priority[key] === priority);
  }

  async getTask(taskId) {
    for (const queue of this.queues.values()) {
      const task = queue.find(t => t.id === taskId);
      if (task) return task;
    }

    const deadTask = this.deadLetterQueue.find(t => t.id === taskId);
    if (deadTask) return deadTask;

    return null;
  }

  async clearQueue() {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
    this.stats.totalEnqueued = 0;
  }

  async clearDeadLetterQueue() {
    this.deadLetterQueue.length = 0;
    this.stats.totalDead = 0;
  }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  tryAcquire() {
    const now = Date.now();
    
    // Remove old requests outside window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }
}

// ============================================================================
// DEMONSTRATION
// ============================================================================

async function demonstrateTaskQueue() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + 'ASYNC TASK QUEUE DEMONSTRATION' + ' '.repeat(28) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');

  const queue = new TaskQueue({
    concurrency: 3,
    persistPath: './demo-queue-data',
    persistInterval: 2000,
    rateLimit: {
      requests: 10,
      window: 1000
    }
  });

  // Register task handlers
  queue.registerHandler('email', async (payload, task) => {
    console.log(`  📧 Sending email to ${payload.to}: ${payload.subject}`);
    await sleep(Math.random() * 1000 + 500);
    return { sent: true, messageId: crypto.randomBytes(8).toString('hex') };
  });

  queue.registerHandler('report', async (payload, task) => {
    console.log(`  📊 Generating report: ${payload.reportType}`);
    await sleep(Math.random() * 2000 + 1000);
    return { reportId: crypto.randomBytes(8).toString('hex'), rows: Math.floor(Math.random() * 1000) };
  });

  queue.registerHandler('backup', async (payload, task) => {
    console.log(`  💾 Backing up database: ${payload.database}`);
    await sleep(Math.random() * 1500 + 500);
    
    // Simulate occasional failure
    if (Math.random() < 0.2) {
      throw new Error('Backup failed: Connection timeout');
    }
    
    return { backupId: crypto.randomBytes(8).toString('hex'), size: Math.floor(Math.random() * 1000000) };
  });

  queue.registerHandler('process-image', async (payload, task) => {
    console.log(`  🖼️  Processing image: ${payload.filename}`);
    await sleep(Math.random() * 1000 + 300);
    return { processedUrl: `/images/processed/${payload.filename}` };
  });

  // Event listeners
  queue.on('taskCompleted', ({ task, result }) => {
    console.log(`  ✅ Task ${task.id.slice(0, 8)} completed`);
  });

  queue.on('taskFailed', ({ task, error }) => {
    console.log(`  ❌ Task ${task.id.slice(0, 8)} failed: ${error.message}`);
  });

  queue.on('taskRetry', ({ task, retryCount }) => {
    console.log(`  🔄 Task ${task.id.slice(0, 8)} retry ${retryCount}/${task.maxRetries}`);
  });

  queue.on('taskDead', ({ task }) => {
    console.log(`  ☠️  Task ${task.id.slice(0, 8)} moved to dead-letter queue`);
  });

  // Start the queue
  await queue.start();

  console.log('Enqueueing tasks...\n');

  // Enqueue various tasks with different priorities
  await queue.enqueue(new Task(null, 'email', {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Welcome to our service'
  }, { priority: Priority.HIGH }));

  await queue.enqueue(new Task(null, 'report', {
    reportType: 'monthly-sales',
    month: 'January'
  }, { priority: Priority.NORMAL }));

  await queue.enqueue(new Task(null, 'backup', {
    database: 'production',
    type: 'full'
  }, { priority: Priority.CRITICAL, maxRetries: 5 }));

  await queue.enqueue(new Task(null, 'process-image', {
    filename: 'photo1.jpg',
    operations: ['resize', 'compress']
  }, { priority: Priority.LOW }));

  await queue.enqueue(new Task(null, 'email', {
    to: 'admin@example.com',
    subject: 'Alert',
    body: 'System notification'
  }, { priority: Priority.HIGH }));

  // Enqueue multiple tasks
  for (let i = 0; i < 10; i++) {
    await queue.enqueue(new Task(null, 'email', {
      to: `user${i}@example.com`,
      subject: 'Batch Email',
      body: 'This is a batch email'
    }, { priority: Priority.BACKGROUND }));
  }

  // Add delayed task
  await queue.enqueue(new Task(null, 'report', {
    reportType: 'delayed-report'
  }, { priority: Priority.NORMAL, delay: 3000 }));

  // Wait for processing
  console.log('Processing tasks...\n');
  await sleep(8000);

  // Print statistics
  console.log('\n' + '='.repeat(80));
  console.log('QUEUE STATISTICS');
  console.log('='.repeat(80));
  const stats = queue.getStats();
  console.log(`Total Enqueued: ${stats.totalEnqueued}`);
  console.log(`Total Processed: ${stats.totalProcessed}`);
  console.log(`Total Completed: ${stats.totalCompleted}`);
  console.log(`Total Failed: ${stats.totalFailed}`);
  console.log(`Total Retries: ${stats.totalRetries}`);
  console.log(`Total Dead: ${stats.totalDead}`);
  console.log('\nQueue Lengths:');
  Object.entries(stats.queueLengths).forEach(([priority, length]) => {
    console.log(`  ${priority}: ${length}`);
  });
  console.log(`\nDead Letter Queue: ${stats.deadLetterQueueLength}`);
  
  console.log('\nWorker Statistics:');
  stats.workers.forEach((workerStats, index) => {
    console.log(`  Worker ${index}:`);
    console.log(`    Tasks Processed: ${workerStats.tasksProcessed}`);
    console.log(`    Success: ${workerStats.tasksSucceeded}`);
    console.log(`    Failed: ${workerStats.tasksFailed}`);
    console.log(`    Avg Processing Time: ${workerStats.avgProcessingTime.toFixed(2)}ms`);
  });
  console.log('='.repeat(80) + '\n');

  // Stop the queue
  await queue.stop();

  console.log('Demonstration completed!\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  demonstrateTaskQueue().catch(console.error);
}

module.exports = {
  TaskQueue,
  Task,
  Worker,
  Priority,
  TaskStatus,
  RateLimiter
};
