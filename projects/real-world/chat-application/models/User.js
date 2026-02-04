const { db } = require('../server/database');

class User {
  static create(userData) {
    const stmt = db.prepare(`
      INSERT INTO users (username)
      VALUES (?)
    `);
    const result = stmt.run(userData.username);
    return result.lastInsertRowid;
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static findByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  static getAll() {
    const stmt = db.prepare('SELECT * FROM users ORDER BY last_seen DESC');
    return stmt.all();
  }

  static updateLastSeen(id) {
    const stmt = db.prepare(`
      UPDATE users 
      SET last_seen = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(id);
  }

  static getMessageCount(userId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ?');
    return stmt.get(userId).count;
  }
}

module.exports = User;
