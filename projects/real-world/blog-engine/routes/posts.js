const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { ensureAuthenticated } = require('../middleware/auth');

// Get all posts
router.get('/', (req, res) => {
  try {
    const posts = Post.getAll({ status: 'published' });
    res.render('posts/list', { title: 'All Posts', posts });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', error });
  }
});

// New post form
router.get('/new', ensureAuthenticated, (req, res) => {
  res.render('posts/new', { title: 'New Post' });
});

// Create post
router.post('/', ensureAuthenticated, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('excerpt').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('posts/new', {
      title: 'New Post',
      errors: errors.array(),
      formData: req.body
    });
  }

  try {
    const slug = req.body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const postData = {
      title: req.body.title,
      slug,
      content: req.body.content,
      excerpt: req.body.excerpt,
      author_id: req.user.id,
      status: req.body.status || 'draft'
    };

    const postId = Post.create(postData);
    req.flash('success_msg', 'Post created successfully');
    res.redirect(`/posts/${slug}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating post');
    res.redirect('/posts/new');
  }
});

// View single post
router.get('/:slug', (req, res) => {
  try {
    const post = Post.findBySlug(req.params.slug);
    
    if (!post) {
      return res.status(404).render('404', { title: 'Post Not Found' });
    }

    if (post.status !== 'published' && (!req.user || req.user.id !== post.author_id)) {
      return res.status(403).render('error', { 
        title: 'Access Denied',
        error: { message: 'This post is not published yet' }
      });
    }

    Post.incrementViews(post.id);
    const comments = Comment.getByPostId(post.id);
    const htmlContent = marked(post.content);
    const sanitizedContent = sanitizeHtml(htmlContent, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt'],
        a: ['href', 'target']
      }
    });

    res.render('posts/view', {
      title: post.title,
      post: { ...post, htmlContent: sanitizedContent },
      comments
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', error });
  }
});

// Edit post form
router.get('/:slug/edit', ensureAuthenticated, (req, res) => {
  try {
    const post = Post.findBySlug(req.params.slug);
    
    if (!post) {
      return res.status(404).render('404', { title: 'Post Not Found' });
    }

    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      req.flash('error_msg', 'You do not have permission to edit this post');
      return res.redirect(`/posts/${req.params.slug}`);
    }

    res.render('posts/edit', { title: 'Edit Post', post });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', error });
  }
});

// Update post
router.put('/:slug', ensureAuthenticated, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required')
], (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('posts/edit', {
      title: 'Edit Post',
      errors: errors.array(),
      post: req.body
    });
  }

  try {
    const post = Post.findBySlug(req.params.slug);
    
    if (!post) {
      return res.status(404).render('404', { title: 'Post Not Found' });
    }

    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      req.flash('error_msg', 'You do not have permission to edit this post');
      return res.redirect(`/posts/${req.params.slug}`);
    }

    const slug = req.body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const postData = {
      title: req.body.title,
      slug,
      content: req.body.content,
      excerpt: req.body.excerpt,
      status: req.body.status
    };

    Post.update(post.id, postData);
    req.flash('success_msg', 'Post updated successfully');
    res.redirect(`/posts/${slug}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating post');
    res.redirect(`/posts/${req.params.slug}/edit`);
  }
});

// Delete post
router.delete('/:slug', ensureAuthenticated, (req, res) => {
  try {
    const post = Post.findBySlug(req.params.slug);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    Post.delete(post.id);
    req.flash('success_msg', 'Post deleted successfully');
    res.redirect('/');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting post');
    res.redirect(`/posts/${req.params.slug}`);
  }
});

// Add comment
router.post('/:slug/comments', ensureAuthenticated, [
  body('content').trim().notEmpty().withMessage('Comment cannot be empty')
], (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Comment cannot be empty');
    return res.redirect(`/posts/${req.params.slug}`);
  }

  try {
    const post = Post.findBySlug(req.params.slug);
    
    if (!post) {
      return res.status(404).render('404', { title: 'Post Not Found' });
    }

    const commentData = {
      post_id: post.id,
      user_id: req.user.id,
      content: req.body.content,
      status: 'approved'
    };

    Comment.create(commentData);
    req.flash('success_msg', 'Comment added successfully');
    res.redirect(`/posts/${req.params.slug}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error adding comment');
    res.redirect(`/posts/${req.params.slug}`);
  }
});

module.exports = router;
