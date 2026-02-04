#!/usr/bin/env node
/**
 * Design Patterns Implementation
 * Demonstrates 5 common design patterns with practical examples.
 * 
 * Run: node design-patterns.js
 */

// =============================================================================
// 1. SINGLETON PATTERN
// =============================================================================

class DatabaseConnection {
    constructor() {
        if (DatabaseConnection.instance) {
            return DatabaseConnection.instance;
        }
        
        this.connectionString = 'db://localhost:5432/mydb';
        console.log(`[Singleton] Database connection created: ${this.connectionString}`);
        
        DatabaseConnection.instance = this;
    }
    
    query(sql) {
        return `Executing: ${sql}`;
    }
}

// =============================================================================
// 2. FACTORY PATTERN
// =============================================================================

class Animal {
    speak() {
        throw new Error('speak() must be implemented');
    }
}

class Dog extends Animal {
    speak() {
        return 'Woof!';
    }
}

class Cat extends Animal {
    speak() {
        return 'Meow!';
    }
}

class Bird extends Animal {
    speak() {
        return 'Tweet!';
    }
}

class AnimalFactory {
    static createAnimal(type) {
        const animals = {
            dog: Dog,
            cat: Cat,
            bird: Bird
        };
        
        const AnimalClass = animals[type.toLowerCase()];
        if (!AnimalClass) {
            throw new Error(`Unknown animal type: ${type}`);
        }
        
        return new AnimalClass();
    }
}

// =============================================================================
// 3. OBSERVER PATTERN
// =============================================================================

class Observer {
    update(message) {
        throw new Error('update() must be implemented');
    }
}

class EmailSubscriber extends Observer {
    constructor(email) {
        super();
        this.email = email;
    }
    
    update(message) {
        console.log(`[Email to ${this.email}] ${message}`);
    }
}

class SMSSubscriber extends Observer {
    constructor(phone) {
        super();
        this.phone = phone;
    }
    
    update(message) {
        console.log(`[SMS to ${this.phone}] ${message}`);
    }
}

class NewsPublisher {
    constructor() {
        this.observers = [];
    }
    
    subscribe(observer) {
        this.observers.push(observer);
        console.log(`[Observer] Subscriber added (Total: ${this.observers.length})`);
    }
    
    unsubscribe(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
        console.log(`[Observer] Subscriber removed (Total: ${this.observers.length})`);
    }
    
    notify(message) {
        console.log(`\n[Publisher] Broadcasting: ${message}`);
        this.observers.forEach(observer => observer.update(message));
    }
}

// =============================================================================
// 4. STRATEGY PATTERN
// =============================================================================

class PaymentStrategy {
    pay(amount) {
        throw new Error('pay() must be implemented');
    }
}

class CreditCardPayment extends PaymentStrategy {
    constructor(cardNumber) {
        super();
        this.cardNumber = cardNumber;
    }
    
    pay(amount) {
        return `Paid $${amount.toFixed(2)} using Credit Card ending in ${this.cardNumber.slice(-4)}`;
    }
}

class PayPalPayment extends PaymentStrategy {
    constructor(email) {
        super();
        this.email = email;
    }
    
    pay(amount) {
        return `Paid $${amount.toFixed(2)} using PayPal account ${this.email}`;
    }
}

class CryptoPayment extends PaymentStrategy {
    constructor(walletAddress) {
        super();
        this.walletAddress = walletAddress;
    }
    
    pay(amount) {
        return `Paid $${amount.toFixed(2)} using Crypto wallet ${this.walletAddress.substring(0, 8)}...`;
    }
}

class ShoppingCart {
    constructor() {
        this.items = [];
        this.paymentStrategy = null;
    }
    
    addItem(item, price) {
        this.items.push({ item, price });
    }
    
    setPaymentMethod(strategy) {
        this.paymentStrategy = strategy;
    }
    
    checkout() {
        const total = this.items.reduce((sum, item) => sum + item.price, 0);
        
        if (!this.paymentStrategy) {
            return 'Error: No payment method set';
        }
        
        return this.paymentStrategy.pay(total);
    }
}

// =============================================================================
// 5. DECORATOR PATTERN
// =============================================================================

class Coffee {
    cost() {
        throw new Error('cost() must be implemented');
    }
    
    description() {
        throw new Error('description() must be implemented');
    }
}

class SimpleCoffee extends Coffee {
    cost() {
        return 2.0;
    }
    
    description() {
        return 'Simple Coffee';
    }
}

class CoffeeDecorator extends Coffee {
    constructor(coffee) {
        super();
        this.coffee = coffee;
    }
    
    cost() {
        return this.coffee.cost();
    }
    
    description() {
        return this.coffee.description();
    }
}

class MilkDecorator extends CoffeeDecorator {
    cost() {
        return this.coffee.cost() + 0.5;
    }
    
    description() {
        return this.coffee.description() + ', Milk';
    }
}

class SugarDecorator extends CoffeeDecorator {
    cost() {
        return this.coffee.cost() + 0.2;
    }
    
    description() {
        return this.coffee.description() + ', Sugar';
    }
}

class WhipCreamDecorator extends CoffeeDecorator {
    cost() {
        return this.coffee.cost() + 0.7;
    }
    
    description() {
        return this.coffee.description() + ', Whip Cream';
    }
}

// =============================================================================
// DEMO
// =============================================================================

function demoSingleton() {
    console.log('\n' + '='.repeat(60));
    console.log('SINGLETON PATTERN DEMO');
    console.log('='.repeat(60));
    
    const db1 = new DatabaseConnection();
    const db2 = new DatabaseConnection();
    
    console.log(`db1 === db2: ${db1 === db2}`);
    console.log(db1.query('SELECT * FROM users'));
}

function demoFactory() {
    console.log('\n' + '='.repeat(60));
    console.log('FACTORY PATTERN DEMO');
    console.log('='.repeat(60));
    
    ['dog', 'cat', 'bird'].forEach(type => {
        const animal = AnimalFactory.createAnimal(type);
        console.log(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${animal.speak()}`);
    });
}

function demoObserver() {
    console.log('\n' + '='.repeat(60));
    console.log('OBSERVER PATTERN DEMO');
    console.log('='.repeat(60));
    
    const publisher = new NewsPublisher();
    
    const emailSub = new EmailSubscriber('user@example.com');
    const smsSub = new SMSSubscriber('+1234567890');
    
    publisher.subscribe(emailSub);
    publisher.subscribe(smsSub);
    
    publisher.notify('Breaking News: Design Patterns are awesome!');
}

function demoStrategy() {
    console.log('\n' + '='.repeat(60));
    console.log('STRATEGY PATTERN DEMO');
    console.log('='.repeat(60));
    
    const cart = new ShoppingCart();
    cart.addItem('Laptop', 999.99);
    cart.addItem('Mouse', 29.99);
    
    console.log('\nUsing Credit Card:');
    cart.setPaymentMethod(new CreditCardPayment('1234567890123456'));
    console.log(cart.checkout());
    
    console.log('\nUsing PayPal:');
    cart.setPaymentMethod(new PayPalPayment('user@example.com'));
    console.log(cart.checkout());
    
    console.log('\nUsing Crypto:');
    cart.setPaymentMethod(new CryptoPayment('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'));
    console.log(cart.checkout());
}

function demoDecorator() {
    console.log('\n' + '='.repeat(60));
    console.log('DECORATOR PATTERN DEMO');
    console.log('='.repeat(60));
    
    let coffee = new SimpleCoffee();
    console.log(`${coffee.description()} = $${coffee.cost().toFixed(2)}`);
    
    coffee = new MilkDecorator(new SimpleCoffee());
    console.log(`${coffee.description()} = $${coffee.cost().toFixed(2)}`);
    
    coffee = new SugarDecorator(new MilkDecorator(new SimpleCoffee()));
    console.log(`${coffee.description()} = $${coffee.cost().toFixed(2)}`);
    
    coffee = new WhipCreamDecorator(new SugarDecorator(new MilkDecorator(new SimpleCoffee())));
    console.log(`${coffee.description()} = $${coffee.cost().toFixed(2)}`);
}

// Main
console.log('DESIGN PATTERNS DEMONSTRATION');
console.log('Implementing 5 Common Design Patterns in JavaScript\n');

demoSingleton();
demoFactory();
demoObserver();
demoStrategy();
demoDecorator();

console.log('\n' + '='.repeat(60));
console.log('All patterns demonstrated successfully!');
console.log('='.repeat(60));
