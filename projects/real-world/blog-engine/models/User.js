const { db } = require('../config/database');

class User {
  static create(userData) {
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      userData.username,
      userData.email,
      userData.password,
      userData.role || 'user'
    );
    return result.lastInsertRowid;
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static findByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  static getAll() {
    const stmt = db.prepare('SELECT id, username, email, role, created_at FROM users');
    return stmt.all();
  }

  static update(id, userData) {
    const stmt = db.prepare(`
      UPDATE users 
      SET username = ?, email = ?, role = ?
      WHERE id = ?
    `);
    return stmt.run(userData.username, userData.email, userData.role, id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  }

  static getPostCount(userId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ?');
    return stmt.get(userId).count;
  }
}

module.exports = User;
