#!/usr/bin/env node

/**
 * Object Pool Implementation
 * Memory-efficient object pooling with performance benchmarks
 * 
 * Features:
 * - Generic object pool with configurable size
 * - Automatic pool expansion
 * - Object lifecycle management (acquire/release)
 * - Pool statistics and monitoring
 * - Performance benchmarks vs regular allocation
 * - Support for factory functions
 * - Reset functionality for reused objects
 * 
 * Usage:
 *   node memory-pool.js
 */

class ObjectPool {
  constructor(factory, reset, initialSize = 10, maxSize = 100) {
    this.factory = factory;      // Function to create new objects
    this.reset = reset;           // Function to reset object state
    this.initialSize = initialSize;
    this.maxSize = maxSize;
    this.available = [];          // Available objects
    this.inUse = new Set();       // Objects currently in use
    this.totalCreated = 0;
    this.totalAcquired = 0;
    this.totalReleased = 0;
    this.peakUsage = 0;

    this._initialize();
  }

  _initialize() {
    for (let i = 0; i < this.initialSize; i++) {
      this.available.push(this._createObject());
    }
  }

  _createObject() {
    this.totalCreated++;
    return this.factory();
  }

  acquire() {
    this.totalAcquired++;
    let obj;

    if (this.available.length > 0) {
      obj = this.available.pop();
    } else if (this.totalCreated < this.maxSize) {
      obj = this._createObject();
    } else {
      throw new Error('Pool exhausted: max size reached');
    }

    this.inUse.add(obj);
    this.peakUsage = Math.max(this.peakUsage, this.inUse.size);
    return obj;
  }

  release(obj) {
    if (!this.inUse.has(obj)) {
      throw new Error('Object not from this pool or already released');
    }

    this.totalReleased++;
    this.inUse.delete(obj);

    if (this.reset) {
      this.reset(obj);
    }

    this.available.push(obj);
  }

  releaseAll() {
    for (const obj of this.inUse) {
      if (this.reset) {
        this.reset(obj);
      }
      this.available.push(obj);
    }
    this.inUse.clear();
  }

  drain() {
    this.available = [];
    this.inUse.clear();
    this.totalCreated = 0;
    this.totalAcquired = 0;
    this.totalReleased = 0;
    this.peakUsage = 0;
    this._initialize();
  }

  getStats() {
    return {
      totalCreated: this.totalCreated,
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased,
      available: this.available.length,
      inUse: this.inUse.size,
      peakUsage: this.peakUsage,
      poolSize: this.totalCreated,
      utilization: ((this.inUse.size / this.totalCreated) * 100).toFixed(2) + '%',
    };
  }

  printStats() {
    const stats = this.getStats();
    console.log('Pool Statistics:');
    console.log(`  Total created: ${stats.totalCreated}`);
    console.log(`  Total acquired: ${stats.totalAcquired}`);
    console.log(`  Total released: ${stats.totalReleased}`);
    console.log(`  Available: ${stats.available}`);
    console.log(`  In use: ${stats.inUse}`);
    console.log(`  Peak usage: ${stats.peakUsage}`);
    console.log(`  Utilization: ${stats.utilization}`);
  }
}

// Specialized pool for arrays
class ArrayPool extends ObjectPool {
  constructor(initialSize = 10, maxSize = 100, arraySize = 1000) {
    super(
      () => new Array(arraySize).fill(0),
      (arr) => arr.fill(0),
      initialSize,
      maxSize
    );
  }
}

// Specialized pool for objects
class GenericObjectPool extends ObjectPool {
  constructor(template = {}, initialSize = 10, maxSize = 100) {
    super(
      () => ({ ...template }),
      (obj) => {
        for (const key in obj) {
          obj[key] = template[key];
        }
      },
      initialSize,
      maxSize
    );
  }
}

// Performance benchmark utilities
class Benchmark {
  static measure(name, fn, iterations = 1000) {
    // Warm up
    for (let i = 0; i < 100; i++) fn();

    // Force garbage collection if available
    if (global.gc) global.gc();

    const start = process.hrtime.bigint();
    const startMem = process.memoryUsage().heapUsed;

    for (let i = 0; i < iterations; i++) {
      fn();
    }

    const end = process.hrtime.bigint();
    const endMem = process.memoryUsage().heapUsed;

    const duration = Number(end - start) / 1000000; // Convert to ms
    const avgTime = duration / iterations;
    const memDelta = endMem - startMem;

    return {
      name,
      iterations,
      totalTime: duration.toFixed(2),
      avgTime: avgTime.toFixed(4),
      memoryDelta: memDelta,
    };
  }

  static compare(benchmarks) {
    console.log('\nBenchmark Comparison:');
    console.log('='.repeat(80));
    console.log(
      'Name'.padEnd(30) +
      'Iterations'.padEnd(15) +
      'Avg Time (ms)'.padEnd(20) +
      'Total (ms)'
    );
    console.log('-'.repeat(80));

    const sorted = benchmarks.sort((a, b) => parseFloat(a.avgTime) - parseFloat(b.avgTime));

    for (const bench of sorted) {
      console.log(
        bench.name.padEnd(30) +
        bench.iterations.toString().padEnd(15) +
        bench.avgTime.padEnd(20) +
        bench.totalTime
      );
    }

    if (benchmarks.length > 1) {
      const fastest = sorted[0];
      const slowest = sorted[sorted.length - 1];
      const speedup = (parseFloat(slowest.avgTime) / parseFloat(fastest.avgTime)).toFixed(2);
      console.log('-'.repeat(80));
      console.log(`Fastest: ${fastest.name}`);
      console.log(`Speedup: ${speedup}x faster than ${slowest.name}`);
    }
  }
}

// Demo
if (require.main === module) {
  console.log('🔄 Object Pool Implementation\n');

  // Example 1: Basic pool usage
  console.log('Example 1: Basic Pool Usage');
  console.log('===========================');

  const particleFactory = () => ({
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    life: 100,
  });

  const particleReset = (particle) => {
    particle.x = 0;
    particle.y = 0;
    particle.velocityX = 0;
    particle.velocityY = 0;
    particle.life = 100;
  };

  const particlePool = new ObjectPool(particleFactory, particleReset, 5, 20);

  console.log('Initial state:');
  particlePool.printStats();

  // Acquire some objects
  console.log('\nAcquiring 3 particles...');
  const p1 = particlePool.acquire();
  p1.x = 10;
  p1.y = 20;
  
  const p2 = particlePool.acquire();
  p2.x = 30;
  p2.y = 40;
  
  const p3 = particlePool.acquire();
  p3.x = 50;
  p3.y = 60;

  console.log('After acquiring:');
  particlePool.printStats();

  // Release objects
  console.log('\nReleasing 2 particles...');
  particlePool.release(p1);
  particlePool.release(p2);

  console.log('After releasing:');
  particlePool.printStats();
  console.log();

  // Example 2: Array pool
  console.log('Example 2: Array Pool');
  console.log('====================');

  const arrayPool = new ArrayPool(3, 10, 100);
  console.log('Created array pool (arrays of size 100)');
  
  const arr1 = arrayPool.acquire();
  const arr2 = arrayPool.acquire();
  arr1[0] = 42;
  arr2[0] = 99;
  
  console.log('Arrays in use:', arrayPool.getStats().inUse);
  arrayPool.release(arr1);
  arrayPool.release(arr2);
  console.log('Arrays in use after release:', arrayPool.getStats().inUse);
  console.log();

  // Example 3: Performance benchmark
  console.log('Example 3: Performance Benchmark');
  console.log('================================');

  const iterations = 10000;
  console.log(`Running ${iterations} iterations...\n`);

  // Benchmark without pooling
  const benchNoPool = Benchmark.measure(
    'No pooling (new Object)',
    () => {
      const obj = {
        id: 0,
        name: '',
        value: 0,
        data: [],
      };
      obj.id = Math.random();
      obj.name = 'test';
      obj.value = 42;
      obj.data.push(1, 2, 3);
    },
    iterations
  );

  // Benchmark with pooling
  const objPool = new GenericObjectPool(
    { id: 0, name: '', value: 0, data: [] },
    100,
    200
  );

  const benchWithPool = Benchmark.measure(
    'With pooling (acquire/release)',
    () => {
      const obj = objPool.acquire();
      obj.id = Math.random();
      obj.name = 'test';
      obj.value = 42;
      obj.data = [];
      obj.data.push(1, 2, 3);
      objPool.release(obj);
    },
    iterations
  );

  Benchmark.compare([benchNoPool, benchWithPool]);
  console.log();

  // Example 4: Stress test
  console.log('Example 4: Stress Test');
  console.log('======================');

  const stressPool = new ObjectPool(
    () => ({ id: 0, data: new Array(100) }),
    (obj) => {
      obj.id = 0;
      obj.data.fill(0);
    },
    10,
    50
  );

  console.log('Simulating rapid acquire/release cycles...');
  const objects = [];

  // Acquire many objects
  for (let i = 0; i < 30; i++) {
    const obj = stressPool.acquire();
    obj.id = i;
    objects.push(obj);
  }

  console.log('After acquiring 30 objects:');
  stressPool.printStats();

  // Release half
  for (let i = 0; i < 15; i++) {
    stressPool.release(objects[i]);
  }

  console.log('\nAfter releasing 15 objects:');
  stressPool.printStats();

  // Acquire more (reusing released objects)
  for (let i = 0; i < 10; i++) {
    const obj = stressPool.acquire();
    obj.id = 100 + i;
  }

  console.log('\nAfter acquiring 10 more:');
  stressPool.printStats();
  console.log();

  // Example 5: Real-world use case - particle system
  console.log('Example 5: Particle System Simulation');
  console.log('=====================================');

  class Particle {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.life = 1.0;
      this.color = 'white';
    }

    reset() {
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.life = 1.0;
      this.color = 'white';
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
    }

    isDead() {
      return this.life <= 0;
    }
  }

  const particleSystemPool = new ObjectPool(
    () => new Particle(),
    (p) => p.reset(),
    50,
    200
  );

  const activeParticles = [];

  // Simulate particle emission
  console.log('Simulating 100 frame particle system...');
  
  for (let frame = 0; frame < 100; frame++) {
    // Emit new particles every 10 frames
    if (frame % 10 === 0) {
      for (let i = 0; i < 5; i++) {
        const particle = particleSystemPool.acquire();
        particle.x = 100;
        particle.y = 100;
        particle.vx = (Math.random() - 0.5) * 10;
        particle.vy = (Math.random() - 0.5) * 10;
        particle.life = Math.random() * 2 + 1;
        activeParticles.push(particle);
      }
    }

    // Update particles
    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const particle = activeParticles[i];
      particle.update(0.1);

      if (particle.isDead()) {
        particleSystemPool.release(particle);
        activeParticles.splice(i, 1);
      }
    }
  }

  console.log('\nParticle System Pool Statistics:');
  particleSystemPool.printStats();

  console.log(`\nActive particles: ${activeParticles.length}`);
  console.log('Pool efficiency: Objects were reused instead of creating new ones');
  console.log();

  console.log('✅ All examples completed!');
  console.log('\n💡 Key Benefits of Object Pooling:');
  console.log('   - Reduced garbage collection pressure');
  console.log('   - Better memory locality');
  console.log('   - Predictable performance');
  console.log('   - Lower memory footprint for frequently allocated objects');
}

module.exports = { ObjectPool, ArrayPool, GenericObjectPool, Benchmark };
