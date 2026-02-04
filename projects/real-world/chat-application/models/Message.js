const { db } = require('../database');

class Message {
  static create(messageData) {
    const stmt = db.prepare(`
      INSERT INTO messages (room, user_id, username, message, type)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      messageData.room,
      messageData.user_id,
      messageData.username,
      messageData.message,
      messageData.type || 'message'
    );
    return result.lastInsertRowid;
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
    return stmt.get(id);
  }

  static getByRoom(room, limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE room = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(room, limit).reverse();
  }

  static getAll(limit = 100) {
    const stmt = db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT ?');
    return stmt.all(limit);
  }

  static deleteOlderThan(days) {
    const stmt = db.prepare(`
      DELETE FROM messages 
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);
    return stmt.run(days);
  }
}

module.exports = Message;
