#!/usr/bin/env node

/**
 * Huffman Coding Compression Tool
 * File compression and decompression using Huffman coding algorithm
 * 
 * Features:
 * - Build frequency table from input
 * - Generate Huffman tree
 * - Create optimal prefix codes
 * - Compress and decompress data
 * - Calculate compression ratio
 * - Support for text and binary data
 * 
 * Usage:
 *   node compression-tool.js
 *   Or use as module: compress(data), decompress(compressed)
 */

const fs = require('fs');
const path = require('path');

// Node for Huffman tree
class HuffmanNode {
  constructor(char, frequency, left = null, right = null) {
    this.char = char;
    this.frequency = frequency;
    this.left = left;
    this.right = right;
  }

  isLeaf() {
    return this.left === null && this.right === null;
  }
}

// Priority queue (min-heap) for building Huffman tree
class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  enqueue(node) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const root = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return root;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].frequency >= this.heap[parentIndex].frequency) break;

      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.heap.length && 
          this.heap[leftChild].frequency < this.heap[smallest].frequency) {
        smallest = leftChild;
      }

      if (rightChild < this.heap.length && 
          this.heap[rightChild].frequency < this.heap[smallest].frequency) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }

  size() {
    return this.heap.length;
  }
}

class HuffmanCoding {
  constructor() {
    this.root = null;
    this.codes = new Map();
    this.reverseMapping = new Map();
  }

  // Build frequency table
  buildFrequencyTable(data) {
    const frequencies = new Map();
    for (const char of data) {
      frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }
    return frequencies;
  }

  // Build Huffman tree
  buildHuffmanTree(frequencies) {
    const pq = new PriorityQueue();

    // Create leaf nodes
    for (const [char, freq] of frequencies) {
      pq.enqueue(new HuffmanNode(char, freq));
    }

    // Build tree
    while (pq.size() > 1) {
      const left = pq.dequeue();
      const right = pq.dequeue();
      
      const merged = new HuffmanNode(
        null,
        left.frequency + right.frequency,
        left,
        right
      );
      
      pq.enqueue(merged);
    }

    return pq.dequeue();
  }

  // Generate codes by traversing tree
  generateCodes(node = this.root, code = '', codes = new Map()) {
    if (!node) return codes;

    if (node.isLeaf()) {
      codes.set(node.char, code || '0'); // Handle single character
      this.reverseMapping.set(code || '0', node.char);
    }

    this.generateCodes(node.left, code + '0', codes);
    this.generateCodes(node.right, code + '1', codes);

    return codes;
  }

  // Encode data
  encode(data) {
    if (!data || data.length === 0) {
      throw new Error('Cannot encode empty data');
    }

    // Build frequency table and tree
    const frequencies = this.buildFrequencyTable(data);
    this.root = this.buildHuffmanTree(frequencies);
    this.codes = this.generateCodes();

    // Generate encoded string
    let encoded = '';
    for (const char of data) {
      encoded += this.codes.get(char);
    }

    return {
      encoded,
      tree: this.serializeTree(this.root),
      codes: Object.fromEntries(this.codes),
    };
  }

  // Decode data
  decode(encoded, tree) {
    if (!encoded || !tree) {
      throw new Error('Cannot decode: missing encoded data or tree');
    }

    const root = this.deserializeTree(tree);
    let decoded = '';
    let current = root;

    for (const bit of encoded) {
      current = bit === '0' ? current.left : current.right;

      if (current.isLeaf()) {
        decoded += current.char;
        current = root;
      }
    }

    return decoded;
  }

  // Serialize tree for storage
  serializeTree(node) {
    if (!node) return null;
    if (node.isLeaf()) {
      return { char: node.char, leaf: true };
    }
    return {
      left: this.serializeTree(node.left),
      right: this.serializeTree(node.right),
    };
  }

  // Deserialize tree from storage
  deserializeTree(data) {
    if (!data) return null;
    if (data.leaf) {
      return new HuffmanNode(data.char, 0);
    }
    return new HuffmanNode(
      null,
      0,
      this.deserializeTree(data.left),
      this.deserializeTree(data.right)
    );
  }

  // Convert binary string to bytes
  binaryToBytes(binary) {
    const bytes = [];
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.slice(i, i + 8).padEnd(8, '0');
      bytes.push(parseInt(byte, 2));
    }
    return Buffer.from(bytes);
  }

  // Convert bytes to binary string
  bytesToBinary(buffer, bitCount) {
    let binary = '';
    for (const byte of buffer) {
      binary += byte.toString(2).padStart(8, '0');
    }
    return binary.slice(0, bitCount);
  }

  // Compress data
  compress(data) {
    const { encoded, tree, codes } = this.encode(data);
    
    // Convert binary string to bytes
    const compressedData = this.binaryToBytes(encoded);

    return {
      data: compressedData,
      tree,
      bitCount: encoded.length,
      codes,
      originalSize: data.length,
      compressedSize: compressedData.length,
      ratio: ((1 - compressedData.length / data.length) * 100).toFixed(2),
    };
  }

  // Decompress data
  decompress(compressed) {
    const binary = this.bytesToBinary(compressed.data, compressed.bitCount);
    return this.decode(binary, compressed.tree);
  }
}

// File operations
class CompressionTool {
  constructor() {
    this.huffman = new HuffmanCoding();
  }

  compressFile(inputPath, outputPath) {
    try {
      const data = fs.readFileSync(inputPath, 'utf8');
      const compressed = this.huffman.compress(data);
      
      // Save compressed data and metadata
      const output = {
        tree: compressed.tree,
        bitCount: compressed.bitCount,
        data: compressed.data.toString('base64'),
      };

      fs.writeFileSync(outputPath, JSON.stringify(output));

      return {
        originalSize: compressed.originalSize,
        compressedSize: fs.statSync(outputPath).size,
        ratio: ((1 - fs.statSync(outputPath).size / compressed.originalSize) * 100).toFixed(2),
        codes: compressed.codes,
      };
    } catch (err) {
      throw new Error(`Compression failed: ${err.message}`);
    }
  }

  decompressFile(inputPath, outputPath) {
    try {
      const compressed = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
      compressed.data = Buffer.from(compressed.data, 'base64');
      
      const decompressed = this.huffman.decompress(compressed);
      fs.writeFileSync(outputPath, decompressed);

      return {
        originalSize: fs.statSync(inputPath).size,
        decompressedSize: decompressed.length,
      };
    } catch (err) {
      throw new Error(`Decompression failed: ${err.message}`);
    }
  }

  compressString(text) {
    return this.huffman.compress(text);
  }

  decompressString(compressed) {
    return this.huffman.decompress(compressed);
  }
}

// Demo
if (require.main === module) {
  console.log('🗜️  Huffman Coding Compression Tool\n');

  const tool = new CompressionTool();

  // Example 1: Compress simple text
  console.log('Example 1: Text Compression');
  console.log('===========================');
  const text1 = 'hello world';
  console.log('Original:', text1);
  
  const compressed1 = tool.compressString(text1);
  console.log('\nFrequency table:');
  const freq = new Map();
  for (const char of text1) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  for (const [char, count] of freq) {
    console.log(`  '${char}': ${count}`);
  }

  console.log('\nHuffman codes:');
  for (const [char, code] of Object.entries(compressed1.codes)) {
    console.log(`  '${char}': ${code}`);
  }

  console.log('\nCompression stats:');
  console.log(`  Original size: ${compressed1.originalSize} bytes`);
  console.log(`  Compressed size: ${compressed1.compressedSize} bytes`);
  console.log(`  Compression ratio: ${compressed1.ratio}%`);

  const decompressed1 = tool.decompressString(compressed1);
  console.log(`  Decompressed: "${decompressed1}"`);
  console.log(`  Match: ${text1 === decompressed1 ? '✓' : '✗'}`);
  console.log();

  // Example 2: Compress longer text
  console.log('Example 2: Longer Text');
  console.log('======================');
  const text2 = 'The quick brown fox jumps over the lazy dog. ' +
                'This sentence contains every letter of the alphabet!';
  console.log(`Original: "${text2}"`);
  console.log(`Length: ${text2.length} characters`);

  const compressed2 = tool.compressString(text2);
  console.log('\nCompression stats:');
  console.log(`  Original size: ${compressed2.originalSize} bytes`);
  console.log(`  Compressed size: ${compressed2.compressedSize} bytes`);
  console.log(`  Compression ratio: ${compressed2.ratio}%`);
  console.log(`  Bits used: ${compressed2.bitCount}`);

  const decompressed2 = tool.decompressString(compressed2);
  console.log(`  Match: ${text2 === decompressed2 ? '✓' : '✗'}`);
  console.log();

  // Example 3: Highly repetitive text
  console.log('Example 3: Repetitive Text (Best Case)');
  console.log('======================================');
  const text3 = 'aaaaaaaaaa bbbbb ccc dd e';
  console.log(`Original: "${text3}"`);

  const compressed3 = tool.compressString(text3);
  console.log('\nHuffman codes (sorted by frequency):');
  const sortedCodes = Object.entries(compressed3.codes)
    .sort((a, b) => a[1].length - b[1].length);
  for (const [char, code] of sortedCodes) {
    console.log(`  '${char}': ${code}`);
  }

  console.log('\nCompression stats:');
  console.log(`  Original size: ${compressed3.originalSize} bytes`);
  console.log(`  Compressed size: ${compressed3.compressedSize} bytes`);
  console.log(`  Compression ratio: ${compressed3.ratio}%`);
  console.log();

  // Example 4: File compression/decompression
  console.log('Example 4: File Operations');
  console.log('==========================');
  
  const testFile = './test_compression.txt';
  const compressedFile = './test_compression.huff';
  const decompressedFile = './test_decompressed.txt';

  // Create test file
  const testContent = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
This is a test of Huffman coding compression algorithm.`.repeat(3);

  fs.writeFileSync(testFile, testContent);
  console.log(`Created test file: ${testFile}`);
  console.log(`  Size: ${fs.statSync(testFile).size} bytes`);

  // Compress file
  const fileStats = tool.compressFile(testFile, compressedFile);
  console.log(`\nCompressed to: ${compressedFile}`);
  console.log(`  Original: ${fileStats.originalSize} bytes`);
  console.log(`  Compressed: ${fileStats.compressedSize} bytes`);
  console.log(`  Ratio: ${fileStats.ratio}%`);

  // Decompress file
  tool.decompressFile(compressedFile, decompressedFile);
  console.log(`\nDecompressed to: ${decompressedFile}`);
  
  const original = fs.readFileSync(testFile, 'utf8');
  const decompressed = fs.readFileSync(decompressedFile, 'utf8');
  console.log(`  Content match: ${original === decompressed ? '✓' : '✗'}`);

  // Cleanup
  fs.unlinkSync(testFile);
  fs.unlinkSync(compressedFile);
  fs.unlinkSync(decompressedFile);
  console.log('\n✓ Cleaned up test files');

  console.log('\n✅ All examples completed!');
}

module.exports = { HuffmanCoding, CompressionTool };
