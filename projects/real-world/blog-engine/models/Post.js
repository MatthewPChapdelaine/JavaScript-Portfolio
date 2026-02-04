const { db } = require('../config/database');

class Post {
  static create(postData) {
    const stmt = db.prepare(`
      INSERT INTO posts (title, slug, content, excerpt, author_id, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      postData.title,
      postData.slug,
      postData.content,
      postData.excerpt || '',
      postData.author_id,
      postData.status || 'draft'
    );
    return result.lastInsertRowid;
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT posts.*, users.username as author_name, users.email as author_email
      FROM posts
      JOIN users ON posts.author_id = users.id
      WHERE posts.id = ?
    `);
    return stmt.get(id);
  }

  static findBySlug(slug) {
    const stmt = db.prepare(`
      SELECT posts.*, users.username as author_name, users.email as author_email
      FROM posts
      JOIN users ON posts.author_id = users.id
      WHERE posts.slug = ?
    `);
    return stmt.get(slug);
  }

  static getAll(options = {}) {
    let query = `
      SELECT posts.*, users.username as author_name
      FROM posts
      JOIN users ON posts.author_id = users.id
    `;
    
    const conditions = [];
    const params = [];

    if (options.status) {
      conditions.push('posts.status = ?');
      params.push(options.status);
    }

    if (options.authorId) {
      conditions.push('posts.author_id = ?');
      params.push(options.authorId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY posts.created_at DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static update(id, postData) {
    const stmt = db.prepare(`
      UPDATE posts 
      SET title = ?, slug = ?, content = ?, excerpt = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      postData.title,
      postData.slug,
      postData.content,
      postData.excerpt,
      postData.status,
      id
    );
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM posts WHERE id = ?');
    return stmt.run(id);
  }

  static incrementViews(id) {
    const stmt = db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?');
    return stmt.run(id);
  }

  static getCommentCount(postId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?');
    return stmt.get(postId).count;
  }

  static search(searchTerm) {
    const stmt = db.prepare(`
      SELECT posts.*, users.username as author_name
      FROM posts
      JOIN users ON posts.author_id = users.id
      WHERE posts.status = 'published' 
      AND (posts.title LIKE ? OR posts.content LIKE ?)
      ORDER BY posts.created_at DESC
    `);
    const term = `%${searchTerm}%`;
    return stmt.all(term, term);
  }
}

module.exports = Post;
