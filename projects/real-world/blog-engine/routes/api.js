const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { ensureAuthenticated } = require('../middleware/auth');

// GET /api/posts - Get all published posts
router.get('/posts', (req, res) => {
  try {
    const posts = Post.getAll({ status: 'published' });
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/posts/:id - Get single post
router.get('/posts/:id', (req, res) => {
  try {
    const post = Post.findById(parseInt(req.params.id));
    
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const comments = Comment.getByPostId(post.id);
    res.json({ success: true, data: { ...post, comments } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/posts - Create new post (authenticated)
router.post('/posts', ensureAuthenticated, (req, res) => {
  try {
    const { title, content, excerpt, status } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const postId = Post.create({
      title,
      slug,
      content,
      excerpt: excerpt || '',
      author_id: req.user.id,
      status: status || 'draft'
    });

    const post = Post.findById(postId);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/posts/:id - Update post (authenticated)
router.put('/posts/:id', ensureAuthenticated, (req, res) => {
  try {
    const post = Post.findById(parseInt(req.params.id));
    
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    const { title, content, excerpt, status } = req.body;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    Post.update(post.id, {
      title,
      slug,
      content,
      excerpt: excerpt || '',
      status: status || post.status
    });

    const updatedPost = Post.findById(post.id);
    res.json({ success: true, data: updatedPost });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/posts/:id - Delete post (authenticated)
router.delete('/posts/:id', ensureAuthenticated, (req, res) => {
  try {
    const post = Post.findById(parseInt(req.params.id));
    
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    Post.delete(post.id);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/posts/:id/comments - Get comments for a post
router.get('/posts/:id/comments', (req, res) => {
  try {
    const comments = Comment.getByPostId(parseInt(req.params.id));
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/posts/:id/comments - Add comment (authenticated)
router.post('/posts/:id/comments', ensureAuthenticated, (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const post = Post.findById(parseInt(req.params.id));
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const commentId = Comment.create({
      post_id: post.id,
      user_id: req.user.id,
      content,
      status: 'approved'
    });

    const comment = Comment.findById(commentId);
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
