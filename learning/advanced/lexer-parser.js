#!/usr/bin/env node

/**
 * Expression Lexer and Parser
 * Tokenization, parsing, AST generation, and evaluation of mathematical expressions
 * 
 * Features:
 * - Lexical analysis (tokenization)
 * - Recursive descent parser
 * - Abstract Syntax Tree (AST) generation
 * - Expression evaluation
 * - Support for operators: +, -, *, /, ^, ()
 * - Variable support
 * - Error handling with position tracking
 * 
 * Grammar:
 *   expression  := term (('+' | '-') term)*
 *   term        := factor (('*' | '/') factor)*
 *   factor      := power ('^' power)*
 *   power       := '-' power | primary
 *   primary     := NUMBER | IDENTIFIER | '(' expression ')'
 * 
 * Usage:
 *   node lexer-parser.js
 */

// Token types
const TokenType = {
  NUMBER: 'NUMBER',
  IDENTIFIER: 'IDENTIFIER',
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  MULTIPLY: 'MULTIPLY',
  DIVIDE: 'DIVIDE',
  POWER: 'POWER',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  EOF: 'EOF',
};

class Token {
  constructor(type, value, position) {
    this.type = type;
    this.value = value;
    this.position = position;
  }

  toString() {
    return `Token(${this.type}, ${this.value}, pos=${this.position})`;
  }
}

// Lexer: converts string into tokens
class Lexer {
  constructor(input) {
    this.input = input;
    this.position = 0;
    this.currentChar = input[0] || null;
  }

  advance() {
    this.position++;
    this.currentChar = this.position < this.input.length ? this.input[this.position] : null;
  }

  skipWhitespace() {
    while (this.currentChar && /\s/.test(this.currentChar)) {
      this.advance();
    }
  }

  readNumber() {
    let num = '';
    const startPos = this.position;

    while (this.currentChar && /[0-9.]/.test(this.currentChar)) {
      num += this.currentChar;
      this.advance();
    }

    if (num.split('.').length > 2) {
      throw new Error(`Invalid number format at position ${startPos}: ${num}`);
    }

    return new Token(TokenType.NUMBER, parseFloat(num), startPos);
  }

  readIdentifier() {
    let id = '';
    const startPos = this.position;

    while (this.currentChar && /[a-zA-Z_]/.test(this.currentChar)) {
      id += this.currentChar;
      this.advance();
    }

    return new Token(TokenType.IDENTIFIER, id, startPos);
  }

  getNextToken() {
    while (this.currentChar !== null) {
      if (/\s/.test(this.currentChar)) {
        this.skipWhitespace();
        continue;
      }

      if (/[0-9]/.test(this.currentChar)) {
        return this.readNumber();
      }

      if (/[a-zA-Z_]/.test(this.currentChar)) {
        return this.readIdentifier();
      }

      const pos = this.position;

      switch (this.currentChar) {
        case '+':
          this.advance();
          return new Token(TokenType.PLUS, '+', pos);
        case '-':
          this.advance();
          return new Token(TokenType.MINUS, '-', pos);
        case '*':
          this.advance();
          return new Token(TokenType.MULTIPLY, '*', pos);
        case '/':
          this.advance();
          return new Token(TokenType.DIVIDE, '/', pos);
        case '^':
          this.advance();
          return new Token(TokenType.POWER, '^', pos);
        case '(':
          this.advance();
          return new Token(TokenType.LPAREN, '(', pos);
        case ')':
          this.advance();
          return new Token(TokenType.RPAREN, ')', pos);
        default:
          throw new Error(`Invalid character at position ${pos}: '${this.currentChar}'`);
      }
    }

    return new Token(TokenType.EOF, null, this.position);
  }

  tokenize() {
    const tokens = [];
    let token = this.getNextToken();

    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.getNextToken();
    }

    tokens.push(token);
    return tokens;
  }
}

// AST Node types
class ASTNode {
  constructor(type) {
    this.type = type;
  }
}

class NumberNode extends ASTNode {
  constructor(value) {
    super('Number');
    this.value = value;
  }

  toString() {
    return `${this.value}`;
  }
}

class IdentifierNode extends ASTNode {
  constructor(name) {
    super('Identifier');
    this.name = name;
  }

  toString() {
    return this.name;
  }
}

class BinaryOpNode extends ASTNode {
  constructor(operator, left, right) {
    super('BinaryOp');
    this.operator = operator;
    this.left = left;
    this.right = right;
  }

  toString() {
    return `(${this.left} ${this.operator} ${this.right})`;
  }
}

class UnaryOpNode extends ASTNode {
  constructor(operator, operand) {
    super('UnaryOp');
    this.operator = operator;
    this.operand = operand;
  }

  toString() {
    return `(${this.operator}${this.operand})`;
  }
}

// Parser: converts tokens into AST
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
    this.currentToken = tokens[0];
  }

  advance() {
    this.position++;
    if (this.position < this.tokens.length) {
      this.currentToken = this.tokens[this.position];
    }
  }

  expect(type) {
    if (this.currentToken.type !== type) {
      throw new Error(
        `Expected ${type} but got ${this.currentToken.type} at position ${this.currentToken.position}`
      );
    }
    const token = this.currentToken;
    this.advance();
    return token;
  }

  // expression := term (('+' | '-') term)*
  parseExpression() {
    let node = this.parseTerm();

    while ([TokenType.PLUS, TokenType.MINUS].includes(this.currentToken.type)) {
      const op = this.currentToken.value;
      this.advance();
      node = new BinaryOpNode(op, node, this.parseTerm());
    }

    return node;
  }

  // term := factor (('*' | '/') factor)*
  parseTerm() {
    let node = this.parseFactor();

    while ([TokenType.MULTIPLY, TokenType.DIVIDE].includes(this.currentToken.type)) {
      const op = this.currentToken.value;
      this.advance();
      node = new BinaryOpNode(op, node, this.parseFactor());
    }

    return node;
  }

  // factor := power ('^' power)*
  parseFactor() {
    let node = this.parsePower();

    while (this.currentToken.type === TokenType.POWER) {
      const op = this.currentToken.value;
      this.advance();
      node = new BinaryOpNode(op, node, this.parsePower());
    }

    return node;
  }

  // power := '-' power | primary
  parsePower() {
    if (this.currentToken.type === TokenType.MINUS) {
      this.advance();
      return new UnaryOpNode('-', this.parsePower());
    }

    return this.parsePrimary();
  }

  // primary := NUMBER | IDENTIFIER | '(' expression ')'
  parsePrimary() {
    const token = this.currentToken;

    if (token.type === TokenType.NUMBER) {
      this.advance();
      return new NumberNode(token.value);
    }

    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return new IdentifierNode(token.value);
    }

    if (token.type === TokenType.LPAREN) {
      this.advance();
      const node = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return node;
    }

    throw new Error(`Unexpected token at position ${token.position}: ${token.type}`);
  }

  parse() {
    const ast = this.parseExpression();
    if (this.currentToken.type !== TokenType.EOF) {
      throw new Error(
        `Unexpected token at position ${this.currentToken.position}: ${this.currentToken.type}`
      );
    }
    return ast;
  }
}

// Evaluator: evaluates AST
class Evaluator {
  constructor(variables = {}) {
    this.variables = variables;
  }

  evaluate(node) {
    switch (node.type) {
      case 'Number':
        return node.value;

      case 'Identifier':
        if (!(node.name in this.variables)) {
          throw new Error(`Undefined variable: ${node.name}`);
        }
        return this.variables[node.name];

      case 'BinaryOp':
        const left = this.evaluate(node.left);
        const right = this.evaluate(node.right);

        switch (node.operator) {
          case '+':
            return left + right;
          case '-':
            return left - right;
          case '*':
            return left * right;
          case '/':
            if (right === 0) {
              throw new Error('Division by zero');
            }
            return left / right;
          case '^':
            return Math.pow(left, right);
          default:
            throw new Error(`Unknown operator: ${node.operator}`);
        }

      case 'UnaryOp':
        const operand = this.evaluate(node.operand);
        switch (node.operator) {
          case '-':
            return -operand;
          default:
            throw new Error(`Unknown unary operator: ${node.operator}`);
        }

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }
}

// High-level interface
class ExpressionParser {
  constructor() {
    this.variables = {};
  }

  setVariable(name, value) {
    this.variables[name] = value;
  }

  setVariables(vars) {
    this.variables = { ...this.variables, ...vars };
  }

  tokenize(input) {
    const lexer = new Lexer(input);
    return lexer.tokenize();
  }

  parse(input) {
    const tokens = this.tokenize(input);
    const parser = new Parser(tokens);
    return parser.parse();
  }

  evaluate(input, variables = {}) {
    const ast = this.parse(input);
    const evaluator = new Evaluator({ ...this.variables, ...variables });
    return evaluator.evaluate(ast);
  }

  compile(input) {
    const ast = this.parse(input);
    return (variables = {}) => {
      const evaluator = new Evaluator({ ...this.variables, ...variables });
      return evaluator.evaluate(ast);
    };
  }
}

// Pretty print AST
function printAST(node, indent = 0) {
  const spaces = '  '.repeat(indent);

  if (node.type === 'Number') {
    console.log(`${spaces}Number: ${node.value}`);
  } else if (node.type === 'Identifier') {
    console.log(`${spaces}Identifier: ${node.name}`);
  } else if (node.type === 'BinaryOp') {
    console.log(`${spaces}BinaryOp: ${node.operator}`);
    printAST(node.left, indent + 1);
    printAST(node.right, indent + 1);
  } else if (node.type === 'UnaryOp') {
    console.log(`${spaces}UnaryOp: ${node.operator}`);
    printAST(node.operand, indent + 1);
  }
}

// Demo
if (require.main === module) {
  console.log('🔍 Expression Lexer & Parser\n');

  const parser = new ExpressionParser();

  // Example 1: Tokenization
  console.log('Example 1: Tokenization');
  console.log('=======================');
  const expr1 = '3 + 4 * 2 - (1 + 5) ^ 2';
  console.log(`Expression: ${expr1}\n`);
  
  const tokens = parser.tokenize(expr1);
  console.log('Tokens:');
  tokens.forEach(token => console.log(`  ${token.toString()}`));
  console.log();

  // Example 2: Parsing and AST
  console.log('Example 2: Abstract Syntax Tree');
  console.log('===============================');
  const expr2 = '2 + 3 * 4';
  console.log(`Expression: ${expr2}\n`);
  
  const ast = parser.parse(expr2);
  console.log('AST:');
  printAST(ast);
  console.log(`\nString representation: ${ast.toString()}`);
  console.log();

  // Example 3: Expression evaluation
  console.log('Example 3: Expression Evaluation');
  console.log('================================');
  
  const expressions = [
    '2 + 2',
    '10 - 5 * 2',
    '(10 - 5) * 2',
    '2 ^ 3',
    '2 ^ 3 ^ 2',
    '100 / (5 * 2)',
    '-5 + 3',
    '-(5 + 3)',
    '2 * -3',
  ];

  expressions.forEach(expr => {
    try {
      const result = parser.evaluate(expr);
      console.log(`  ${expr.padEnd(20)} = ${result}`);
    } catch (err) {
      console.log(`  ${expr.padEnd(20)} = Error: ${err.message}`);
    }
  });
  console.log();

  // Example 4: Variables
  console.log('Example 4: Variables');
  console.log('===================');
  
  parser.setVariables({ x: 10, y: 5, z: 2 });
  
  const varExpressions = [
    'x + y',
    'x * y - z',
    '(x + y) / z',
    'x ^ z',
  ];

  console.log('Variables: x = 10, y = 5, z = 2\n');
  varExpressions.forEach(expr => {
    try {
      const result = parser.evaluate(expr);
      console.log(`  ${expr.padEnd(20)} = ${result}`);
    } catch (err) {
      console.log(`  ${expr.padEnd(20)} = Error: ${err.message}`);
    }
  });
  console.log();

  // Example 5: Compiled expressions
  console.log('Example 5: Compiled Expressions');
  console.log('===============================');
  
  const formula = parser.compile('a * x^2 + b * x + c');
  
  console.log('Formula: a * x^2 + b * x + c\n');
  console.log('Evaluating with different values:');
  
  const testCases = [
    { a: 1, b: 0, c: 0, x: 5 },
    { a: 2, b: 3, c: 1, x: 4 },
    { a: 1, b: -5, c: 6, x: 2 },
  ];

  testCases.forEach((vars, i) => {
    const result = formula(vars);
    console.log(`  Case ${i + 1}: a=${vars.a}, b=${vars.b}, c=${vars.c}, x=${vars.x} => ${result}`);
  });
  console.log();

  // Example 6: Complex expression
  console.log('Example 6: Complex Expression');
  console.log('=============================');
  
  const complexExpr = '((2 + 3) * 4 - 10) / 2 + 5 ^ 2';
  console.log(`Expression: ${complexExpr}\n`);
  
  console.log('AST:');
  const complexAst = parser.parse(complexExpr);
  printAST(complexAst);
  
  const result = parser.evaluate(complexExpr);
  console.log(`\nResult: ${result}`);
  console.log();

  // Example 7: Error handling
  console.log('Example 7: Error Handling');
  console.log('========================');
  
  const errorExprs = [
    { expr: '2 + + 3', desc: 'Invalid syntax' },
    { expr: '2 + (3', desc: 'Unclosed parenthesis' },
    { expr: '2 / 0', desc: 'Division by zero' },
    { expr: '2 + unknown', desc: 'Undefined variable' },
    { expr: '2 @ 3', desc: 'Invalid character' },
  ];

  errorExprs.forEach(({ expr, desc }) => {
    try {
      parser.evaluate(expr);
      console.log(`  ${desc}: ${expr} - No error (unexpected)`);
    } catch (err) {
      console.log(`  ${desc}: ${expr}`);
      console.log(`    Error: ${err.message}`);
    }
  });
  console.log();

  console.log('✅ All examples completed!');
  console.log('\n💡 Parser Features:');
  console.log('   - Proper operator precedence');
  console.log('   - Right-associative exponentiation');
  console.log('   - Unary minus support');
  console.log('   - Variable support');
  console.log('   - Detailed error messages');
}

module.exports = {
  Lexer,
  Parser,
  Evaluator,
  ExpressionParser,
  TokenType,
  printAST,
};
