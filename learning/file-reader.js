#!/usr/bin/env node
/**
 * File Reader - Read and display file contents
 * Run: node file-reader.js <filename>
 */

const fs = require('fs');

function readFile(filename) {
    try {
        if (!fs.existsSync(filename)) {
            console.log(`Error: File '${filename}' not found`);
            return;
        }
        
        const contents = fs.readFileSync(filename, 'utf8');
        console.log(`=== Contents of ${filename} ===`);
        console.log(contents);
        console.log(`\n=== End of file (${contents.length} characters) ===`);
        
    } catch (error) {
        if (error.code === 'EACCES') {
            console.log(`Error: Permission denied to read '${filename}'`);
        } else {
            console.log(`Error reading file: ${error.message}`);
        }
    }
}

if (process.argv.length !== 3) {
    console.log("Usage: node file-reader.js <filename>");
    process.exit(1);
}

readFile(process.argv[2]);
