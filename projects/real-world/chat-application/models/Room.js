const { db } = require('../server/database');

class Room {
  static create(roomData) {
    const stmt = db.prepare(`
      INSERT INTO rooms (name, description)
      VALUES (?, ?)
    `);
    const result = stmt.run(roomData.name, roomData.description || '');
    return result.lastInsertRowid;
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    return stmt.get(id);
  }

  static findByName(name) {
    const stmt = db.prepare('SELECT * FROM rooms WHERE name = ?');
    return stmt.get(name);
  }

  static getAll() {
    const stmt = db.prepare('SELECT * FROM rooms ORDER BY name');
    return stmt.all();
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM rooms WHERE id = ?');
    return stmt.run(id);
  }
}

module.exports = Room;
