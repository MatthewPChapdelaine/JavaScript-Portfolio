const { db } = require('../config/database');

class Comment {
  static create(commentData) {
    const stmt = db.prepare(`
      INSERT INTO comments (post_id, user_id, content, status)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      commentData.post_id,
      commentData.user_id,
      commentData.content,
      commentData.status || 'approved'
    );
    return result.lastInsertRowid;
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT comments.*, users.username, users.email
      FROM comments
      JOIN users ON comments.user_id = users.id
      WHERE comments.id = ?
    `);
    return stmt.get(id);
  }

  static getByPostId(postId, status = 'approved') {
    const stmt = db.prepare(`
      SELECT comments.*, users.username, users.email
      FROM comments
      JOIN users ON comments.user_id = users.id
      WHERE comments.post_id = ? AND comments.status = ?
      ORDER BY comments.created_at DESC
    `);
    return stmt.all(postId, status);
  }

  static getAll() {
    const stmt = db.prepare(`
      SELECT comments.*, users.username, posts.title as post_title
      FROM comments
      JOIN users ON comments.user_id = users.id
      JOIN posts ON comments.post_id = posts.id
      ORDER BY comments.created_at DESC
    `);
    return stmt.all();
  }

  static update(id, commentData) {
    const stmt = db.prepare(`
      UPDATE comments 
      SET content = ?, status = ?
      WHERE id = ?
    `);
    return stmt.run(commentData.content, commentData.status, id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM comments WHERE id = ?');
    return stmt.run(id);
  }

  static updateStatus(id, status) {
    const stmt = db.prepare('UPDATE comments SET status = ? WHERE id = ?');
    return stmt.run(status, id);
  }
}

module.exports = Comment;
