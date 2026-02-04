#!/usr/bin/env node
/**
 * CLI Calculator - Perform basic arithmetic operations
 * Run: node cli-calculator.js
 */

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function calculate(num1, operator, num2) {
    switch(operator) {
        case '+':
            return num1 + num2;
        case '-':
            return num1 - num2;
        case '*':
            return num1 * num2;
        case '/':
            if (num2 === 0) {
                return null;
            }
            return num1 / num2;
        default:
            return undefined;
    }
}

console.log("=== CLI Calculator ===");
console.log("Operations: +, -, *, /");

rl.question("Enter first number: ", (num1Str) => {
    const num1 = parseFloat(num1Str);
    
    rl.question("Enter operator (+, -, *, /): ", (operator) => {
        
        rl.question("Enter second number: ", (num2Str) => {
            const num2 = parseFloat(num2Str);
            
            if (isNaN(num1) || isNaN(num2)) {
                console.log("Error: Invalid number input");
                rl.close();
                return;
            }
            
            const result = calculate(num1, operator, num2);
            
            if (result === null) {
                console.log("Error: Cannot divide by zero");
            } else if (result === undefined) {
                console.log("Error: Invalid operator");
            } else {
                console.log(`Result: ${num1} ${operator} ${num2} = ${result}`);
            }
            
            rl.close();
        });
    });
});
