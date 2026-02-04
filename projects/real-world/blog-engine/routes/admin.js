const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { ensureAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(ensureAdmin);

// Admin dashboard
router.get('/', (req, res) => {
  try {
    const stats = {
      totalPosts: Post.getAll().length,
      publishedPosts: Post.getAll({ status: 'published' }).length,
      draftPosts: Post.getAll({ status: 'draft' }).length,
      totalUsers: User.getAll().length,
      totalComments: Comment.getAll().length
    };

    const recentPosts = Post.getAll({ limit: 5 });
    const recentComments = Comment.getAll().slice(0, 5);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats,
      recentPosts,
      recentComments
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', error });
  }
});

// Manage posts
router.get('/posts', (req, res) => {
  try {
    const posts = Post.getAll();
    res.render('admin/posts', { title: 'Manage Posts', posts });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', error });
  }
});

// Manage users
router.get('/users', (req, res) => {
  try {
    const users = User.getAll();
    const usersWithStats = users.map(user => ({
      ...user,
      postCount: User.getPostCount(user.id)
    }));
    res.render('admin/users', { title: 'Manage Users', users: usersWithStats });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', error });
  }
});

// Manage comments
router.get('/comments', (req, res) => {
  try {
    const comments = Comment.getAll();
    res.render('admin/comments', { title: 'Manage Comments', comments });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', error });
  }
});

// Delete user
router.delete('/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    User.delete(userId);
    req.flash('success_msg', 'User deleted successfully');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting user');
    res.redirect('/admin/users');
  }
});

// Delete comment
router.delete('/comments/:id', (req, res) => {
  try {
    Comment.delete(parseInt(req.params.id));
    req.flash('success_msg', 'Comment deleted successfully');
    res.redirect('/admin/comments');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting comment');
    res.redirect('/admin/comments');
  }
});

module.exports = router;
