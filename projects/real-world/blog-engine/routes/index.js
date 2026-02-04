const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Home page
router.get('/', (req, res) => {
  try {
    const posts = Post.getAll({ status: 'published', limit: 10 });
    
    const postsWithComments = posts.map(post => ({
      ...post,
      commentCount: Post.getCommentCount(post.id)
    }));
    
    res.render('index', { 
      title: 'Home',
      posts: postsWithComments
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', error });
  }
});

// Search
router.get('/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const posts = query ? Post.search(query) : [];
    
    res.render('search', { 
      title: 'Search Results',
      posts,
      query
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { title: 'Error', error });
  }
});

// About page
router.get('/about', (req, res) => {
  res.render('about', { title: 'About' });
});

module.exports = router;
