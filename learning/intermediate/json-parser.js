#!/usr/bin/env node
/**
 * JSON Parser - Parse, manipulate, and validate JSON data
 * 
 * Run: node json-parser.js
 * 
 * Features:
 * - Read JSON from file
 * - Query and filter data
 * - Add/modify/delete entries
 * - Write updated JSON back
 * - Schema validation
 */

const fs = require('fs');
const path = require('path');

class JSONParser {
    constructor(filepath) {
        this.filepath = filepath;
        this.data = null;
    }

    /**
     * Load JSON data from file
     */
    load() {
        try {
            const content = fs.readFileSync(this.filepath, 'utf8');
            this.data = JSON.parse(content);
            console.log(`✓ Loaded JSON from ${this.filepath}`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`✗ File not found: ${this.filepath}`);
            } else if (error instanceof SyntaxError) {
                console.log(`✗ Invalid JSON: ${error.message}`);
            } else {
                console.log(`✗ Error loading file: ${error.message}`);
            }
            return false;
        }
    }

    /**
     * Save JSON data to file
     */
    save(filepath = null) {
        if (this.data === null) {
            console.log('✗ No data to save');
            return false;
        }

        const savePath = filepath || this.filepath;
        try {
            const content = JSON.stringify(this.data, null, 2);
            fs.writeFileSync(savePath, content, 'utf8');
            console.log(`✓ Saved JSON to ${savePath}`);
            return true;
        } catch (error) {
            console.log(`✗ Error saving: ${error.message}`);
            return false;
        }
    }

    /**
     * Query data using dot notation (e.g., 'users.0.name')
     */
    query(path) {
        if (this.data === null) {
            return null;
        }

        const keys = path.split('.');
        let result = this.data;

        for (const key of keys) {
            if (result === null || result === undefined) {
                return null;
            }

            if (Array.isArray(result)) {
                const index = parseInt(key);
                if (isNaN(index) || index < 0 || index >= result.length) {
                    return null;
                }
                result = result[index];
            } else if (typeof result === 'object') {
                result = result[key];
            } else {
                return null;
            }
        }

        return result;
    }

    /**
     * Set value at path using dot notation
     */
    setValue(path, value) {
        if (this.data === null) {
            return false;
        }

        const keys = path.split('.');
        let target = this.data;

        // Navigate to parent
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            
            if (Array.isArray(target)) {
                const index = parseInt(key);
                if (isNaN(index) || index < 0 || index >= target.length) {
                    return false;
                }
                target = target[index];
            } else if (typeof target === 'object') {
                if (!(key in target)) {
                    target[key] = {};
                }
                target = target[key];
            } else {
                return false;
            }
        }

        // Set the final value
        const finalKey = keys[keys.length - 1];
        if (Array.isArray(target)) {
            const index = parseInt(finalKey);
            if (isNaN(index) || index < 0 || index >= target.length) {
                return false;
            }
            target[index] = value;
        } else if (typeof target === 'object') {
            target[finalKey] = value;
        } else {
            return false;
        }

        return true;
    }

    /**
     * Delete key at path
     */
    deleteKey(path) {
        if (this.data === null) {
            return false;
        }

        const keys = path.split('.');
        let target = this.data;

        // Navigate to parent
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            
            if (Array.isArray(target)) {
                const index = parseInt(key);
                target = target[index];
            } else if (typeof target === 'object') {
                target = target[key];
            } else {
                return false;
            }

            if (target === null || target === undefined) {
                return false;
            }
        }

        // Delete the final key
        const finalKey = keys[keys.length - 1];
        if (Array.isArray(target)) {
            const index = parseInt(finalKey);
            if (isNaN(index) || index < 0 || index >= target.length) {
                return false;
            }
            target.splice(index, 1);
        } else if (typeof target === 'object' && finalKey in target) {
            delete target[finalKey];
        } else {
            return false;
        }

        return true;
    }

    /**
     * Filter array elements based on condition
     */
    filterArray(arrayPath, condition) {
        const array = this.query(arrayPath);
        if (!Array.isArray(array)) {
            return [];
        }

        return array.filter(condition);
    }

    /**
     * Basic schema validation
     */
    validateSchema(schema) {
        if (this.data === null) {
            return false;
        }

        for (const [key, expectedType] of Object.entries(schema)) {
            const value = this.query(key);
            if (value === null || value === undefined) {
                console.log(`✗ Missing required key: ${key}`);
                return false;
            }

            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== expectedType) {
                console.log(`✗ Type mismatch for ${key}: expected ${expectedType}, got ${actualType}`);
                return false;
            }
        }

        console.log('✓ Schema validation passed');
        return true;
    }

    /**
     * Pretty print the JSON data
     */
    prettyPrint(indent = 2) {
        if (this.data === null) {
            console.log('No data loaded');
            return;
        }

        console.log(JSON.stringify(this.data, null, indent));
    }
}

/**
 * Demonstration of JSON parser functionality
 */
function demo() {
    // Create sample JSON file
    const sampleData = {
        users: [
            { id: 1, name: 'Alice', age: 30, email: 'alice@example.com' },
            { id: 2, name: 'Bob', age: 25, email: 'bob@example.com' },
            { id: 3, name: 'Charlie', age: 35, email: 'charlie@example.com' }
        ],
        metadata: {
            version: '1.0',
            created: '2024-01-01'
        }
    };

    const demoFile = '/tmp/sample_data.json';
    fs.writeFileSync(demoFile, JSON.stringify(sampleData, null, 2));

    console.log('=== JSON Parser Demo ===\n');

    // Load JSON
    const parser = new JSONParser(demoFile);
    parser.load();

    // Query data
    console.log('\n--- Querying Data ---');
    console.log('First user:', parser.query('users.0'));
    console.log("Bob's email:", parser.query('users.1.email'));
    console.log('Version:', parser.query('metadata.version'));

    // Filter users
    console.log('\n--- Filtering Users ---');
    const adults = parser.filterArray('users', user => user.age >= 30);
    console.log('Users aged 30+:', adults.map(u => u.name));

    // Modify data
    console.log('\n--- Modifying Data ---');
    parser.setValue('users.1.age', 26);
    console.log("Updated Bob's age to:", parser.query('users.1.age'));

    // Add new user
    console.log('\n--- Adding New Entry ---');
    const currentUsers = parser.query('users');
    currentUsers.push({ id: 4, name: 'Diana', age: 28, email: 'diana@example.com' });
    console.log('Total users now:', parser.query('users').length);

    // Delete entry
    console.log('\n--- Deleting Entry ---');
    parser.deleteKey('metadata.created');
    console.log('Metadata after deletion:', parser.query('metadata'));

    // Validate schema
    console.log('\n--- Schema Validation ---');
    const schema = {
        'users': 'array',
        'metadata.version': 'string'
    };
    parser.validateSchema(schema);

    // Save modified data
    console.log('\n--- Saving Data ---');
    const outputFile = '/tmp/modified_data.json';
    parser.save(outputFile);

    // Pretty print
    console.log('\n--- Final JSON ---');
    parser.prettyPrint();

    // Cleanup
    fs.unlinkSync(demoFile);
    fs.unlinkSync(outputFile);
    console.log('\n✓ Demo completed successfully!');
}

// Run demo if executed directly
if (require.main === module) {
    demo();
}

module.exports = JSONParser;
