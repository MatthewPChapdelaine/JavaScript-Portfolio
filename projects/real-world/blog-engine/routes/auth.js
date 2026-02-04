const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { forwardAuthenticated } = require('../middleware/auth');

// Login page
router.get('/login', forwardAuthenticated, (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

// Login handler
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true
  })(req, res, next);
});

// Register page
router.get('/register', forwardAuthenticated, (req, res) => {
  res.render('auth/register', { title: 'Register' });
});

// Register handler
router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('password2').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'Register',
      errors: errors.array(),
      formData: req.body
    });
  }

  const { username, email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = User.findByEmail(email);
    if (existingUser) {
      return res.render('auth/register', {
        title: 'Register',
        errors: [{ msg: 'Email already registered' }],
        formData: req.body
      });
    }

    const existingUsername = User.findByUsername(username);
    if (existingUsername) {
      return res.render('auth/register', {
        title: 'Register',
        errors: [{ msg: 'Username already taken' }],
        formData: req.body
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    User.create({
      username,
      email,
      password: hashedPassword,
      role: 'user'
    });

    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error registering user');
    res.redirect('/auth/register');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
    }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/');
  });
});

module.exports = router;
