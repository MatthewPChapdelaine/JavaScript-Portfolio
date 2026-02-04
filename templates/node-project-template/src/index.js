/**
 * Main application entry point
 */

function greet(name) {
    return `Hello, ${name}!`;
}

function main() {
    console.log("Node.js Project Template");
    console.log(greet("World"));
}

if (require.main === module) {
    main();
}

module.exports = { greet };
