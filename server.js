// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection String (from your MongoDB Atlas)
const MONGODB_URI = "mongodb+srv://inete_admin:2irW3RmFN864AVxK@cluster0.8i1sn.mongodb.net/IneteDB?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB - IneteDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// User Schema (for Users collection)
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
});

const User = mongoose.model('User', userSchema, 'Users'); // 'Users' is your collection name

// Dictionary Schema (for Dictionary collection)
const dictionarySchema = new mongoose.Schema({
  word: { type: String, required: true },
  translation: { type: String, required: true },
  pronunciation: String,
  partOfSpeech: String,
  definition: String,
  example: String,
  audioUrl: String,
  createdAt: { type: Date, default: Date.now },
});

const Dictionary = mongoose.model('Dictionary', dictionarySchema, 'Dictionary');

// ============= AUTH ROUTES =============

// Signup Route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await user.save();

    console.log('✅ New user created:', email);
    res.status(201).json({ message: 'Account created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login Route
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in:', email);
    res.json({
      token,
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============= DICTIONARY ROUTES =============

// Get all dictionary words
app.get('/api/dictionary', async (req, res) => {
  try {
    const words = await Dictionary.find().sort({ word: 1 });
    res.json(words);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dictionary', error: error.message });
  }
});

// Search dictionary
app.get('/api/dictionary/search', async (req, res) => {
  try {
    const { query } = req.query;
    const words = await Dictionary.find({
      $or: [
        { word: { $regex: query, $options: 'i' } },
        { translation: { $regex: query, $options: 'i' } },
      ]
    });
    res.json(words);
  } catch (error) {
    res.status(500).json({ message: 'Search error', error: error.message });
  }
});

// Add new word (protected route)
app.post('/api/dictionary', async (req, res) => {
  try {
    const newWord = new Dictionary(req.body);
    await newWord.save();
    res.status(201).json(newWord);
  } catch (error) {
    res.status(500).json({ message: 'Error adding word', error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'IneteLearn API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 IneteLearn API Server running on port ${PORT}`);
});
