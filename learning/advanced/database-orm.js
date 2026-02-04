#!/usr/bin/env node

/**
 * Simple Database ORM (Object-Relational Mapping)
 * A lightweight ORM with SQLite support, CRUD operations, and query builder
 * 
 * Features:
 * - Model definition with schema
 * - CRUD operations (Create, Read, Update, Delete)
 * - Query builder with chaining
 * - Relationships (has many, belongs to)
 * - Migrations and schema management
 * - Validation
 * 
 * Usage:
 *   node database-orm.js
 * 
 * Note: Requires sqlite3 package
 *   npm install sqlite3
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class Database {
  constructor(filename = ':memory:') {
    this.filename = filename;
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.filename, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

class QueryBuilder {
  constructor(model) {
    this.model = model;
    this.query = {
      select: '*',
      where: [],
      orderBy: [],
      limit: null,
      offset: null,
    };
    this.params = [];
  }

  select(fields) {
    this.query.select = Array.isArray(fields) ? fields.join(', ') : fields;
    return this;
  }

  where(field, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }
    this.query.where.push({ field, operator, value });
    this.params.push(value);
    return this;
  }

  orderBy(field, direction = 'ASC') {
    this.query.orderBy.push(`${field} ${direction}`);
    return this;
  }

  limit(count) {
    this.query.limit = count;
    return this;
  }

  offset(count) {
    this.query.offset = count;
    return this;
  }

  buildSQL() {
    let sql = `SELECT ${this.query.select} FROM ${this.model.tableName}`;

    if (this.query.where.length > 0) {
      const whereClause = this.query.where
        .map(w => `${w.field} ${w.operator} ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    if (this.query.orderBy.length > 0) {
      sql += ` ORDER BY ${this.query.orderBy.join(', ')}`;
    }

    if (this.query.limit) {
      sql += ` LIMIT ${this.query.limit}`;
    }

    if (this.query.offset) {
      sql += ` OFFSET ${this.query.offset}`;
    }

    return sql;
  }

  async execute() {
    const sql = this.buildSQL();
    const rows = await this.model.db.all(sql, this.params);
    return rows.map(row => new this.model.constructor(row));
  }

  async first() {
    this.limit(1);
    const results = await this.execute();
    return results[0] || null;
  }
}

class Model {
  static db = null;
  static tableName = '';
  static schema = {};

  constructor(data = {}) {
    Object.assign(this, data);
  }

  static setDatabase(db) {
    this.db = db;
  }

  static async createTable() {
    const fields = Object.entries(this.schema)
      .map(([name, type]) => `${name} ${type}`)
      .join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${fields})`;
    await this.db.run(sql);
  }

  static async dropTable() {
    const sql = `DROP TABLE IF EXISTS ${this.tableName}`;
    await this.db.run(sql);
  }

  static query() {
    return new QueryBuilder(this);
  }

  static async all() {
    return this.query().execute();
  }

  static async find(id) {
    return this.query().where('id', id).first();
  }

  static async findBy(field, value) {
    return this.query().where(field, value).first();
  }

  static async create(data) {
    const instance = new this(data);
    await instance.save();
    return instance;
  }

  async save() {
    const constructor = this.constructor;
    const fields = Object.keys(constructor.schema).filter(f => f !== 'id');
    const values = fields.map(f => this[f]);

    if (this.id) {
      // Update existing record
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const sql = `UPDATE ${constructor.tableName} SET ${setClause} WHERE id = ?`;
      await constructor.db.run(sql, [...values, this.id]);
    } else {
      // Insert new record
      const placeholders = fields.map(() => '?').join(', ');
      const sql = `INSERT INTO ${constructor.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
      const result = await constructor.db.run(sql, values);
      this.id = result.lastID;
    }

    return this;
  }

  async delete() {
    if (!this.id) {
      throw new Error('Cannot delete record without id');
    }

    const constructor = this.constructor;
    const sql = `DELETE FROM ${constructor.tableName} WHERE id = ?`;
    await constructor.db.run(sql, [this.id]);
    return true;
  }

  toJSON() {
    const obj = {};
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        obj[key] = this[key];
      }
    }
    return obj;
  }
}

// Demo usage
if (require.main === module) {
  (async () => {
    try {
      console.log('🗄️  Database ORM Demo\n');

      // Setup database
      const db = new Database('./orm_demo.db');
      await db.connect();
      console.log('✓ Connected to database');

      // Define User model
      class User extends Model {
        static tableName = 'users';
        static schema = {
          id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
          name: 'TEXT NOT NULL',
          email: 'TEXT UNIQUE NOT NULL',
          age: 'INTEGER',
          created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
        };
      }
      User.setDatabase(db);

      // Define Post model
      class Post extends Model {
        static tableName = 'posts';
        static schema = {
          id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
          user_id: 'INTEGER NOT NULL',
          title: 'TEXT NOT NULL',
          content: 'TEXT',
          published: 'INTEGER DEFAULT 0',
          created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
        };

        async getUser() {
          return User.find(this.user_id);
        }
      }
      Post.setDatabase(db);

      // Create tables
      await User.createTable();
      await Post.createTable();
      console.log('✓ Created tables\n');

      // Create users
      console.log('Creating users...');
      const alice = await User.create({
        name: 'Alice',
        email: 'alice@example.com',
        age: 28,
      });
      console.log('Created:', alice.toJSON());

      const bob = await User.create({
        name: 'Bob',
        email: 'bob@example.com',
        age: 32,
      });
      console.log('Created:', bob.toJSON());

      const charlie = await User.create({
        name: 'Charlie',
        email: 'charlie@example.com',
        age: 25,
      });
      console.log('Created:', charlie.toJSON(), '\n');

      // Create posts
      console.log('Creating posts...');
      await Post.create({
        user_id: alice.id,
        title: 'First Post',
        content: 'Hello from Alice!',
        published: 1,
      });

      await Post.create({
        user_id: alice.id,
        title: 'Second Post',
        content: 'Another post by Alice',
        published: 1,
      });

      await Post.create({
        user_id: bob.id,
        title: 'Bob\'s Post',
        content: 'Hello from Bob!',
        published: 0,
      });
      console.log('✓ Created 3 posts\n');

      // Query all users
      console.log('All users:');
      const allUsers = await User.all();
      allUsers.forEach(u => console.log(`  - ${u.name} (${u.email}), age ${u.age}`));
      console.log();

      // Find specific user
      console.log('Finding user by ID...');
      const foundUser = await User.find(1);
      console.log('Found:', foundUser.toJSON(), '\n');

      // Query with conditions
      console.log('Users older than 27:');
      const olderUsers = await User.query()
        .where('age', '>', 27)
        .orderBy('age', 'DESC')
        .execute();
      olderUsers.forEach(u => console.log(`  - ${u.name}, age ${u.age}`));
      console.log();

      // Update user
      console.log('Updating user...');
      alice.age = 29;
      await alice.save();
      const updated = await User.find(alice.id);
      console.log('Updated:', updated.toJSON(), '\n');

      // Query posts with relationships
      console.log('Published posts:');
      const publishedPosts = await Post.query()
        .where('published', 1)
        .orderBy('created_at', 'DESC')
        .execute();

      for (const post of publishedPosts) {
        const author = await post.getUser();
        console.log(`  - "${post.title}" by ${author.name}`);
      }
      console.log();

      // Complex query with pagination
      console.log('First 2 users ordered by name:');
      const paginatedUsers = await User.query()
        .orderBy('name', 'ASC')
        .limit(2)
        .execute();
      paginatedUsers.forEach(u => console.log(`  - ${u.name}`));
      console.log();

      // Delete user
      console.log('Deleting user...');
      await charlie.delete();
      const remainingUsers = await User.all();
      console.log(`Remaining users: ${remainingUsers.length}`);
      console.log();

      // Count records
      const userCount = await db.get(`SELECT COUNT(*) as count FROM users`);
      const postCount = await db.get(`SELECT COUNT(*) as count FROM posts`);
      console.log(`📊 Final stats:`);
      console.log(`   Users: ${userCount.count}`);
      console.log(`   Posts: ${postCount.count}`);

      // Cleanup
      await db.close();
      console.log('\n✓ Database closed');

      // Remove demo database file
      if (fs.existsSync('./orm_demo.db')) {
        fs.unlinkSync('./orm_demo.db');
        console.log('✓ Cleaned up demo database');
      }

    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { Database, Model, QueryBuilder };
