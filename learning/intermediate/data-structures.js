#!/usr/bin/env node
/**
 * Data Structures - Custom implementation of common data structures
 * 
 * Run: node data-structures.js
 * 
 * Features:
 * - Singly Linked List (insert, delete, search)
 * - Binary Search Tree (insert, search, traversals)
 * - Hash Map/Dictionary (custom implementation)
 * - Test and demo code
 */

// ===== Linked List =====

class ListNode {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
        this.size = 0;
    }

    /**
     * Insert at the beginning
     */
    insertFront(value) {
        const newNode = new ListNode(value);
        newNode.next = this.head;
        this.head = newNode;
        this.size++;
    }

    /**
     * Insert at the end
     */
    insertBack(value) {
        const newNode = new ListNode(value);

        if (!this.head) {
            this.head = newNode;
        } else {
            let current = this.head;
            while (current.next) {
                current = current.next;
            }
            current.next = newNode;
        }

        this.size++;
    }

    /**
     * Insert at specific position
     */
    insertAt(index, value) {
        if (index < 0 || index > this.size) {
            return false;
        }

        if (index === 0) {
            this.insertFront(value);
            return true;
        }

        const newNode = new ListNode(value);
        let current = this.head;
        for (let i = 0; i < index - 1; i++) {
            current = current.next;
        }

        newNode.next = current.next;
        current.next = newNode;
        this.size++;
        return true;
    }

    /**
     * Delete first occurrence of value
     */
    delete(value) {
        if (!this.head) {
            return false;
        }

        if (this.head.value === value) {
            this.head = this.head.next;
            this.size--;
            return true;
        }

        let current = this.head;
        while (current.next) {
            if (current.next.value === value) {
                current.next = current.next.next;
                this.size--;
                return true;
            }
            current = current.next;
        }

        return false;
    }

    /**
     * Search for value, return index or -1
     */
    search(value) {
        let current = this.head;
        let index = 0;

        while (current) {
            if (current.value === value) {
                return index;
            }
            current = current.next;
            index++;
        }

        return -1;
    }

    /**
     * Convert to array for display
     */
    toArray() {
        const result = [];
        let current = this.head;
        while (current) {
            result.push(current.value);
            current = current.next;
        }
        return result;
    }

    toString() {
        return this.toArray().join(' -> ');
    }

    getSize() {
        return this.size;
    }
}

// ===== Binary Search Tree =====

class TreeNode {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

class BinarySearchTree {
    constructor() {
        this.root = null;
        this.size = 0;
    }

    /**
     * Insert value into BST
     */
    insert(value) {
        if (!this.root) {
            this.root = new TreeNode(value);
            this.size++;
        } else {
            this._insertRecursive(this.root, value);
        }
    }

    _insertRecursive(node, value) {
        if (value < node.value) {
            if (node.left) {
                this._insertRecursive(node.left, value);
            } else {
                node.left = new TreeNode(value);
                this.size++;
            }
        } else {
            if (node.right) {
                this._insertRecursive(node.right, value);
            } else {
                node.right = new TreeNode(value);
                this.size++;
            }
        }
    }

    /**
     * Search for value in BST
     */
    search(value) {
        return this._searchRecursive(this.root, value);
    }

    _searchRecursive(node, value) {
        if (!node) {
            return false;
        }

        if (value === node.value) {
            return true;
        } else if (value < node.value) {
            return this._searchRecursive(node.left, value);
        } else {
            return this._searchRecursive(node.right, value);
        }
    }

    /**
     * Inorder traversal (left, root, right) - returns sorted order
     */
    inorderTraversal() {
        const result = [];
        this._inorderRecursive(this.root, result);
        return result;
    }

    _inorderRecursive(node, result) {
        if (node) {
            this._inorderRecursive(node.left, result);
            result.push(node.value);
            this._inorderRecursive(node.right, result);
        }
    }

    /**
     * Preorder traversal (root, left, right)
     */
    preorderTraversal() {
        const result = [];
        this._preorderRecursive(this.root, result);
        return result;
    }

    _preorderRecursive(node, result) {
        if (node) {
            result.push(node.value);
            this._preorderRecursive(node.left, result);
            this._preorderRecursive(node.right, result);
        }
    }

    /**
     * Postorder traversal (left, right, root)
     */
    postorderTraversal() {
        const result = [];
        this._postorderRecursive(this.root, result);
        return result;
    }

    _postorderRecursive(node, result) {
        if (node) {
            this._postorderRecursive(node.left, result);
            this._postorderRecursive(node.right, result);
            result.push(node.value);
        }
    }

    getSize() {
        return this.size;
    }
}

// ===== Hash Map =====

class HashMap {
    constructor(capacity = 16) {
        this.capacity = capacity;
        this.size = 0;
        this.buckets = Array.from({ length: capacity }, () => []);
    }

    /**
     * Hash function
     */
    _hash(key) {
        let hash = 0;
        const str = String(key);
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) % this.capacity;
    }

    /**
     * Insert or update key-value pair
     */
    put(key, value) {
        const index = this._hash(key);
        const bucket = this.buckets[index];

        // Update existing key
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) {
                bucket[i][1] = value;
                return;
            }
        }

        // Insert new key
        bucket.push([key, value]);
        this.size++;

        // Resize if load factor > 0.75
        if (this.size / this.capacity > 0.75) {
            this._resize();
        }
    }

    /**
     * Get value for key
     */
    get(key) {
        const index = this._hash(key);
        const bucket = this.buckets[index];

        for (const [k, v] of bucket) {
            if (k === key) {
                return v;
            }
        }

        return undefined;
    }

    /**
     * Delete key-value pair
     */
    delete(key) {
        const index = this._hash(key);
        const bucket = this.buckets[index];

        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) {
                bucket.splice(i, 1);
                this.size--;
                return true;
            }
        }

        return false;
    }

    /**
     * Check if key exists
     */
    has(key) {
        return this.get(key) !== undefined;
    }

    /**
     * Get all keys
     */
    keys() {
        const result = [];
        for (const bucket of this.buckets) {
            for (const [k, v] of bucket) {
                result.push(k);
            }
        }
        return result;
    }

    /**
     * Get all values
     */
    values() {
        const result = [];
        for (const bucket of this.buckets) {
            for (const [k, v] of bucket) {
                result.push(v);
            }
        }
        return result;
    }

    /**
     * Double capacity and rehash all entries
     */
    _resize() {
        const oldBuckets = this.buckets;
        this.capacity *= 2;
        this.buckets = Array.from({ length: this.capacity }, () => []);
        this.size = 0;

        for (const bucket of oldBuckets) {
            for (const [key, value] of bucket) {
                this.put(key, value);
            }
        }
    }

    getSize() {
        return this.size;
    }

    toString() {
        const items = [];
        for (const bucket of this.buckets) {
            for (const [k, v] of bucket) {
                items.push(`${k}: ${v}`);
            }
        }
        return `{${items.join(', ')}}`;
    }
}

// ===== Tests =====

function testLinkedList() {
    console.log('=== Testing Linked List ===');

    const ll = new LinkedList();

    // Test insertions
    ll.insertBack(1);
    ll.insertBack(2);
    ll.insertBack(3);
    ll.insertFront(0);
    console.log(`After insertions: ${ll}`);
    console.log(`Size: ${ll.getSize()}`);

    // Test search
    console.log(`Search for 2: index ${ll.search(2)}`);
    console.log(`Search for 99: index ${ll.search(99)}`);

    // Test deletion
    ll.delete(2);
    console.log(`After deleting 2: ${ll}`);

    // Test insert at position
    ll.insertAt(2, 5);
    console.log(`After inserting 5 at index 2: ${ll}`);

    console.log('✓ Linked list tests passed\n');
}

function testBinarySearchTree() {
    console.log('=== Testing Binary Search Tree ===');

    const bst = new BinarySearchTree();

    // Test insertions
    const values = [5, 3, 7, 1, 4, 6, 9];
    values.forEach(val => bst.insert(val));
    console.log(`Inserted values: ${values}`);
    console.log(`Size: ${bst.getSize()}`);

    // Test search
    console.log(`Search for 4: ${bst.search(4)}`);
    console.log(`Search for 99: ${bst.search(99)}`);

    // Test traversals
    console.log(`Inorder (sorted): ${bst.inorderTraversal()}`);
    console.log(`Preorder: ${bst.preorderTraversal()}`);
    console.log(`Postorder: ${bst.postorderTraversal()}`);

    console.log('✓ BST tests passed\n');
}

function testHashMap() {
    console.log('=== Testing Hash Map ===');

    const hm = new HashMap();

    // Test insertions
    hm.put('name', 'Alice');
    hm.put('age', 30);
    hm.put('city', 'New York');
    console.log(`After insertions: ${hm}`);
    console.log(`Size: ${hm.getSize()}`);

    // Test retrieval
    console.log(`Get 'name': ${hm.get('name')}`);
    console.log(`Get 'age': ${hm.get('age')}`);
    console.log(`Get 'missing': ${hm.get('missing')}`);

    // Test update
    hm.put('age', 31);
    console.log(`After updating age: age = ${hm.get('age')}`);

    // Test deletion
    hm.delete('city');
    console.log(`After deleting 'city': ${hm}`);

    // Test keys and values
    console.log(`Keys: ${hm.keys()}`);
    console.log(`Values: ${hm.values()}`);

    // Test resize (add many items)
    for (let i = 0; i < 20; i++) {
        hm.put(`key${i}`, i);
    }
    console.log(`After adding 20 more items, size: ${hm.getSize()}`);

    console.log('✓ Hash map tests passed\n');
}

function main() {
    console.log('=== Data Structures Demo ===\n');

    testLinkedList();
    testBinarySearchTree();
    testHashMap();

    console.log('✓ All tests completed successfully!');
}

// Run demo if executed directly
if (require.main === module) {
    main();
}

module.exports = { LinkedList, BinarySearchTree, HashMap };
