require('dotenv').config();
const { initDB } = require('./database');

console.log('Initializing database...');
initDB();
console.log('Database initialized!');
