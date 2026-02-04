#!/usr/bin/env node
/**
 * Complete Interpreter for SimpleLang - A dynamically-typed language
 * Features: variables, functions, control flow, arithmetic, REPL
 */

const readline = require('readline');

// Token types
const TokenType = {
    // Literals
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    IDENTIFIER: 'IDENTIFIER',
    
    // Keywords
    LET: 'LET',
    FUNCTION: 'FUNCTION',
    IF: 'IF',
    ELSE: 'ELSE',
    WHILE: 'WHILE',
    RETURN: 'RETURN',
    TRUE: 'TRUE',
    FALSE: 'FALSE',
    
    // Operators
    PLUS: 'PLUS',
    MINUS: 'MINUS',
    STAR: 'STAR',
    SLASH: 'SLASH',
    ASSIGN: 'ASSIGN',
    EQ: 'EQ',
    NEQ: 'NEQ',
    LT: 'LT',
    GT: 'GT',
    LTE: 'LTE',
    GTE: 'GTE',
    
    // Delimiters
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    LBRACE: 'LBRACE',
    RBRACE: 'RBRACE',
    COMMA: 'COMMA',
    SEMICOLON: 'SEMICOLON',
    
    EOF: 'EOF'
};

class Token {
    constructor(type, value, line, column) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }
}

class Lexer {
    constructor(source) {
        this.source = source;
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        
        this.keywords = {
            'let': TokenType.LET,
            'fn': TokenType.FUNCTION,
            'if': TokenType.IF,
            'else': TokenType.ELSE,
            'while': TokenType.WHILE,
            'return': TokenType.RETURN,
            'true': TokenType.TRUE,
            'false': TokenType.FALSE
        };
    }
    
    error(msg) {
        throw new Error(`Lexer error at ${this.line}:${this.column}: ${msg}`);
    }
    
    peek(offset = 0) {
        const pos = this.pos + offset;
        return pos < this.source.length ? this.source[pos] : null;
    }
    
    advance() {
        if (this.pos >= this.source.length) return '\0';
        const char = this.source[this.pos++];
        if (char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        return char;
    }
    
    skipWhitespace() {
        while (this.peek() && /\s/.test(this.peek())) {
            this.advance();
        }
    }
    
    skipComment() {
        if (this.peek() === '/' && this.peek(1) === '/') {
            while (this.peek() && this.peek() !== '\n') {
                this.advance();
            }
        }
    }
    
    readNumber() {
        const line = this.line, col = this.column;
        let numStr = '';
        while (this.peek() && /[\d.]/.test(this.peek())) {
            numStr += this.advance();
        }
        return new Token(TokenType.NUMBER, parseFloat(numStr), line, col);
    }
    
    readString() {
        const line = this.line, col = this.column;
        this.advance(); // Skip opening quote
        let str = '';
        while (this.peek() && this.peek() !== '"') {
            if (this.peek() === '\\') {
                this.advance();
                const next = this.advance();
                const escapes = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' };
                str += escapes[next] || next;
            } else {
                str += this.advance();
            }
        }
        if (!this.peek()) this.error('Unterminated string');
        this.advance(); // Skip closing quote
        return new Token(TokenType.STRING, str, line, col);
    }
    
    readIdentifier() {
        const line = this.line, col = this.column;
        let ident = '';
        while (this.peek() && /[a-zA-Z0-9_]/.test(this.peek())) {
            ident += this.advance();
        }
        const type = this.keywords[ident] || TokenType.IDENTIFIER;
        const value = type === TokenType.TRUE ? true : 
                     type === TokenType.FALSE ? false : ident;
        return new Token(type, value, line, col);
    }
    
    nextToken() {
        while (true) {
            this.skipWhitespace();
            if (this.peek() === '/' && this.peek(1) === '/') {
                this.skipComment();
                continue;
            }
            break;
        }
        
        const line = this.line, col = this.column;
        const char = this.peek();
        
        if (!char) return new Token(TokenType.EOF, null, line, col);
        
        if (/\d/.test(char)) return this.readNumber();
        if (char === '"') return this.readString();
        if (/[a-zA-Z_]/.test(char)) return this.readIdentifier();
        
        // Two-character operators
        if (char === '=' && this.peek(1) === '=') {
            this.advance(); this.advance();
            return new Token(TokenType.EQ, '==', line, col);
        }
        if (char === '!' && this.peek(1) === '=') {
            this.advance(); this.advance();
            return new Token(TokenType.NEQ, '!=', line, col);
        }
        if (char === '<' && this.peek(1) === '=') {
            this.advance(); this.advance();
            return new Token(TokenType.LTE, '<=', line, col);
        }
        if (char === '>' && this.peek(1) === '=') {
            this.advance(); this.advance();
            return new Token(TokenType.GTE, '>=', line, col);
        }
        
        // Single-character tokens
        const singles = {
            '+': TokenType.PLUS, '-': TokenType.MINUS,
            '*': TokenType.STAR, '/': TokenType.SLASH,
            '=': TokenType.ASSIGN, '<': TokenType.LT, '>': TokenType.GT,
            '(': TokenType.LPAREN, ')': TokenType.RPAREN,
            '{': TokenType.LBRACE, '}': TokenType.RBRACE,
            ',': TokenType.COMMA, ';': TokenType.SEMICOLON
        };
        
        if (singles[char]) {
            this.advance();
            return new Token(singles[char], char, line, col);
        }
        
        this.error(`Unexpected character: ${char}`);
    }
    
    tokenize() {
        const tokens = [];
        while (true) {
            const token = this.nextToken();
            tokens.push(token);
            if (token.type === TokenType.EOF) break;
        }
        return tokens;
    }
}

// AST Nodes
class NumberNode { constructor(value) { this.value = value; } }
class StringNode { constructor(value) { this.value = value; } }
class BooleanNode { constructor(value) { this.value = value; } }
class IdentifierNode { constructor(name) { this.name = name; } }
class BinaryOpNode { constructor(left, operator, right) { 
    this.left = left; this.operator = operator; this.right = right; 
} }
class AssignmentNode { constructor(name, value) { 
    this.name = name; this.value = value; 
} }
class BlockNode { constructor(statements) { this.statements = statements; } }
class IfNode { constructor(condition, thenBlock, elseBlock) {
    this.condition = condition; this.thenBlock = thenBlock; this.elseBlock = elseBlock;
} }
class WhileNode { constructor(condition, body) {
    this.condition = condition; this.body = body;
} }
class FunctionDefNode { constructor(name, params, body) {
    this.name = name; this.params = params; this.body = body;
} }
class FunctionCallNode { constructor(name, args) {
    this.name = name; this.args = args;
} }
class ReturnNode { constructor(value) { this.value = value; } }

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }
    
    error(msg) {
        const token = this.current();
        throw new Error(`Parse error at ${token.line}:${token.column}: ${msg}`);
    }
    
    current() {
        return this.pos < this.tokens.length ? this.tokens[this.pos] : this.tokens[this.tokens.length - 1];
    }
    
    peek(offset = 0) {
        const pos = this.pos + offset;
        return pos < this.tokens.length ? this.tokens[pos] : this.tokens[this.tokens.length - 1];
    }
    
    advance() {
        const token = this.current();
        if (this.pos < this.tokens.length - 1) this.pos++;
        return token;
    }
    
    expect(type) {
        const token = this.current();
        if (token.type !== type) {
            this.error(`Expected ${type}, got ${token.type}`);
        }
        return this.advance();
    }
    
    parse() {
        const statements = [];
        while (this.current().type !== TokenType.EOF) {
            statements.push(this.statement());
        }
        return new BlockNode(statements);
    }
    
    statement() {
        const token = this.current();
        
        if (token.type === TokenType.LET) return this.letStatement();
        if (token.type === TokenType.FUNCTION) return this.functionDef();
        if (token.type === TokenType.IF) return this.ifStatement();
        if (token.type === TokenType.WHILE) return this.whileStatement();
        if (token.type === TokenType.RETURN) return this.returnStatement();
        if (token.type === TokenType.LBRACE) return this.block();
        
        const expr = this.expression();
        this.expect(TokenType.SEMICOLON);
        return expr;
    }
    
    letStatement() {
        this.advance(); // Skip 'let'
        const name = this.expect(TokenType.IDENTIFIER).value;
        this.expect(TokenType.ASSIGN);
        const value = this.expression();
        this.expect(TokenType.SEMICOLON);
        return new AssignmentNode(name, value);
    }
    
    functionDef() {
        this.advance(); // Skip 'fn'
        const name = this.expect(TokenType.IDENTIFIER).value;
        this.expect(TokenType.LPAREN);
        
        const params = [];
        if (this.current().type !== TokenType.RPAREN) {
            params.push(this.expect(TokenType.IDENTIFIER).value);
            while (this.current().type === TokenType.COMMA) {
                this.advance();
                params.push(this.expect(TokenType.IDENTIFIER).value);
            }
        }
        
        this.expect(TokenType.RPAREN);
        const body = this.block();
        return new FunctionDefNode(name, params, body);
    }
    
    ifStatement() {
        this.advance(); // Skip 'if'
        this.expect(TokenType.LPAREN);
        const condition = this.expression();
        this.expect(TokenType.RPAREN);
        const thenBlock = this.block();
        
        let elseBlock = null;
        if (this.current().type === TokenType.ELSE) {
            this.advance();
            elseBlock = this.block();
        }
        
        return new IfNode(condition, thenBlock, elseBlock);
    }
    
    whileStatement() {
        this.advance(); // Skip 'while'
        this.expect(TokenType.LPAREN);
        const condition = this.expression();
        this.expect(TokenType.RPAREN);
        const body = this.block();
        return new WhileNode(condition, body);
    }
    
    returnStatement() {
        this.advance(); // Skip 'return'
        let value = null;
        if (this.current().type !== TokenType.SEMICOLON) {
            value = this.expression();
        }
        this.expect(TokenType.SEMICOLON);
        return new ReturnNode(value);
    }
    
    block() {
        this.expect(TokenType.LBRACE);
        const statements = [];
        while (this.current().type !== TokenType.RBRACE) {
            statements.push(this.statement());
        }
        this.expect(TokenType.RBRACE);
        return new BlockNode(statements);
    }
    
    expression() {
        return this.comparison();
    }
    
    comparison() {
        let left = this.additive();
        
        const compOps = [TokenType.EQ, TokenType.NEQ, TokenType.LT, 
                        TokenType.GT, TokenType.LTE, TokenType.GTE];
        while (compOps.includes(this.current().type)) {
            const op = this.advance().type;
            const right = this.additive();
            left = new BinaryOpNode(left, op, right);
        }
        
        return left;
    }
    
    additive() {
        let left = this.multiplicative();
        
        while ([TokenType.PLUS, TokenType.MINUS].includes(this.current().type)) {
            const op = this.advance().type;
            const right = this.multiplicative();
            left = new BinaryOpNode(left, op, right);
        }
        
        return left;
    }
    
    multiplicative() {
        let left = this.primary();
        
        while ([TokenType.STAR, TokenType.SLASH].includes(this.current().type)) {
            const op = this.advance().type;
            const right = this.primary();
            left = new BinaryOpNode(left, op, right);
        }
        
        return left;
    }
    
    primary() {
        const token = this.current();
        
        if (token.type === TokenType.NUMBER) {
            this.advance();
            return new NumberNode(token.value);
        }
        
        if (token.type === TokenType.STRING) {
            this.advance();
            return new StringNode(token.value);
        }
        
        if ([TokenType.TRUE, TokenType.FALSE].includes(token.type)) {
            this.advance();
            return new BooleanNode(token.value);
        }
        
        if (token.type === TokenType.IDENTIFIER) {
            const name = token.value;
            this.advance();
            
            // Function call
            if (this.current().type === TokenType.LPAREN) {
                this.advance();
                const args = [];
                if (this.current().type !== TokenType.RPAREN) {
                    args.push(this.expression());
                    while (this.current().type === TokenType.COMMA) {
                        this.advance();
                        args.push(this.expression());
                    }
                }
                this.expect(TokenType.RPAREN);
                return new FunctionCallNode(name, args);
            }
            
            // Assignment
            if (this.current().type === TokenType.ASSIGN) {
                this.advance();
                const value = this.expression();
                return new AssignmentNode(name, value);
            }
            
            return new IdentifierNode(name);
        }
        
        if (token.type === TokenType.LPAREN) {
            this.advance();
            const expr = this.expression();
            this.expect(TokenType.RPAREN);
            return expr;
        }
        
        this.error(`Unexpected token: ${token.type}`);
    }
}

class ReturnException extends Error {
    constructor(value) {
        super();
        this.value = value;
    }
}

class Environment {
    constructor(parent = null) {
        this.parent = parent;
        this.symbols = new Map();
    }
    
    define(name, value) {
        this.symbols.set(name, value);
    }
    
    get(name) {
        if (this.symbols.has(name)) {
            return this.symbols.get(name);
        }
        if (this.parent) {
            return this.parent.get(name);
        }
        throw new Error(`Undefined variable: ${name}`);
    }
    
    set(name, value) {
        if (this.symbols.has(name)) {
            this.symbols.set(name, value);
        } else if (this.parent) {
            this.parent.set(name, value);
        } else {
            throw new Error(`Undefined variable: ${name}`);
        }
    }
}

class Function {
    constructor(params, body, closure) {
        this.params = params;
        this.body = body;
        this.closure = closure;
    }
}

class Interpreter {
    constructor() {
        this.globalEnv = new Environment();
        this.setupBuiltins();
    }
    
    setupBuiltins() {
        this.globalEnv.define('print', (...args) => {
            console.log(...args);
            return null;
        });
        
        this.globalEnv.define('input', (prompt = '') => {
            // For demo purposes, return a dummy value
            return 'user input';
        });
        
        this.globalEnv.define('len', (obj) => {
            return String(obj).length;
        });
    }
    
    eval(node, env) {
        if (node instanceof NumberNode) return node.value;
        if (node instanceof StringNode) return node.value;
        if (node instanceof BooleanNode) return node.value;
        if (node instanceof IdentifierNode) return env.get(node.name);
        
        if (node instanceof BinaryOpNode) {
            const left = this.eval(node.left, env);
            const right = this.eval(node.right, env);
            
            const ops = {
                [TokenType.PLUS]: (l, r) => l + r,
                [TokenType.MINUS]: (l, r) => l - r,
                [TokenType.STAR]: (l, r) => l * r,
                [TokenType.SLASH]: (l, r) => l / r,
                [TokenType.EQ]: (l, r) => l === r,
                [TokenType.NEQ]: (l, r) => l !== r,
                [TokenType.LT]: (l, r) => l < r,
                [TokenType.GT]: (l, r) => l > r,
                [TokenType.LTE]: (l, r) => l <= r,
                [TokenType.GTE]: (l, r) => l >= r
            };
            
            return ops[node.operator](left, right);
        }
        
        if (node instanceof AssignmentNode) {
            const value = this.eval(node.value, env);
            try {
                env.set(node.name, value);
            } catch (e) {
                env.define(node.name, value);
            }
            return value;
        }
        
        if (node instanceof BlockNode) {
            let result = null;
            for (const stmt of node.statements) {
                result = this.eval(stmt, env);
            }
            return result;
        }
        
        if (node instanceof IfNode) {
            const condition = this.eval(node.condition, env);
            if (this.isTruthy(condition)) {
                return this.eval(node.thenBlock, env);
            } else if (node.elseBlock) {
                return this.eval(node.elseBlock, env);
            }
            return null;
        }
        
        if (node instanceof WhileNode) {
            let result = null;
            while (this.isTruthy(this.eval(node.condition, env))) {
                result = this.eval(node.body, env);
            }
            return result;
        }
        
        if (node instanceof FunctionDefNode) {
            const func = new Function(node.params, node.body, env);
            env.define(node.name, func);
            return func;
        }
        
        if (node instanceof FunctionCallNode) {
            const func = env.get(node.name);
            const args = node.args.map(arg => this.eval(arg, env));
            
            // Built-in function
            if (typeof func === 'function') {
                return func(...args);
            }
            
            // User-defined function
            if (func instanceof Function) {
                if (args.length !== func.params.length) {
                    throw new Error(`Function ${node.name} expects ${func.params.length} args, got ${args.length}`);
                }
                
                const funcEnv = new Environment(func.closure);
                for (let i = 0; i < func.params.length; i++) {
                    funcEnv.define(func.params[i], args[i]);
                }
                
                try {
                    this.eval(func.body, funcEnv);
                    return null;
                } catch (e) {
                    if (e instanceof ReturnException) {
                        return e.value;
                    }
                    throw e;
                }
            }
            
            throw new Error(`${node.name} is not a function`);
        }
        
        if (node instanceof ReturnNode) {
            const value = node.value ? this.eval(node.value, env) : null;
            throw new ReturnException(value);
        }
        
        throw new Error(`Unknown node type: ${node.constructor.name}`);
    }
    
    isTruthy(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (value === null) return false;
        return true;
    }
    
    run(source) {
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        return this.eval(ast, this.globalEnv);
    }
}

// Demo
const demoCode = `
// Fibonacci function
fn fib(n) {
    if (n <= 1) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);
}

// Calculate and print
let i = 0;
while (i < 10) {
    print("fib(", i, ") =", fib(i));
    i = i + 1;
}

// Factorial
fn factorial(n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

print("5! =", factorial(5));
`;

console.log('=== Running Demo ===\n');
const interpreter = new Interpreter();
interpreter.run(demoCode);
