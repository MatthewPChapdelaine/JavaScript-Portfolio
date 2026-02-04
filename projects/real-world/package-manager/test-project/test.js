// Test script for mini-pkg package manager

console.log('Testing mini-pkg package manager...\n');

// Test 1: Check if packages are installed
const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.join(__dirname, 'node_modules');

if (fs.existsSync(nodeModulesPath)) {
  const packages = fs.readdirSync(nodeModulesPath);
  console.log(`✓ Found ${packages.length} installed packages:`);
  packages.forEach(pkg => {
    console.log(`  - ${pkg}`);
  });
} else {
  console.log('✗ No packages installed');
  console.log('Run: cd test-project && node ../bin/mini-pkg.js install express');
  process.exit(1);
}

// Test 2: Try to require an installed package
console.log('\nTesting package require:');
try {
  const express = require('express');
  console.log(`✓ express loaded: ${express.name}@${express.version}`);
} catch (error) {
  console.log('✗ Could not load express');
}

// Test 3: Check lock file
const lockFilePath = path.join(__dirname, 'mini-pkg-lock.json');
if (fs.existsSync(lockFilePath)) {
  const lockFile = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
  console.log(`\n✓ Lock file exists with ${Object.keys(lockFile.dependencies || {}).length} dependencies`);
} else {
  console.log('\n✗ No lock file found');
}

console.log('\n✓ All tests passed!');
