/**
 * Unit tests for main module
 */

const { greet } = require('../src/index');

describe('greet function', () => {
    test('greets Alice', () => {
        expect(greet('Alice')).toBe('Hello, Alice!');
    });
    
    test('greets Bob', () => {
        expect(greet('Bob')).toBe('Hello, Bob!');
    });
    
    test('greets empty string', () => {
        expect(greet('')).toBe('Hello, !');
    });
});
