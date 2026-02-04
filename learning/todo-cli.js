#!/usr/bin/env node
/**
 * TODO CLI - Simple task manager
 * Run: node todo-cli.js
 */

const fs = require('fs');
const readline = require('readline');

const TODO_FILE = 'todos.json';

function loadTodos() {
    if (fs.existsSync(TODO_FILE)) {
        const data = fs.readFileSync(TODO_FILE, 'utf8');
        return JSON.parse(data);
    }
    return [];
}

function saveTodos(todos) {
    fs.writeFileSync(TODO_FILE, JSON.stringify(todos, null, 2));
}

function listTodos(todos) {
    if (todos.length === 0) {
        console.log("No tasks yet!");
        return;
    }
    
    console.log("\n=== Your Tasks ===");
    todos.forEach((todo, index) => {
        const status = todo.done ? "✓" : " ";
        console.log(`${index + 1}. [${status}] ${todo.task}`);
    });
}

function addTodo(todos, task) {
    todos.push({ task, done: false });
    saveTodos(todos);
    console.log(`Added: ${task}`);
}

function completeTodo(todos, index) {
    if (index > 0 && index <= todos.length) {
        todos[index - 1].done = true;
        saveTodos(todos);
        console.log(`Completed: ${todos[index - 1].task}`);
    } else {
        console.log("Invalid task number");
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let todos = loadTodos();

function showMenu() {
    console.log("\n=== TODO CLI ===");
    console.log("1. List tasks");
    console.log("2. Add task");
    console.log("3. Complete task");
    console.log("4. Exit");
    
    rl.question("\nChoice: ", (choice) => {
        switch(choice) {
            case '1':
                listTodos(todos);
                showMenu();
                break;
            case '2':
                rl.question("Enter task: ", (task) => {
                    addTodo(todos, task);
                    showMenu();
                });
                break;
            case '3':
                listTodos(todos);
                rl.question("Task number to complete: ", (num) => {
                    completeTodo(todos, parseInt(num));
                    showMenu();
                });
                break;
            case '4':
                console.log("Goodbye!");
                rl.close();
                break;
            default:
                console.log("Invalid choice");
                showMenu();
        }
    });
}

showMenu();
