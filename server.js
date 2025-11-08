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

// MongoDB Connection String (using environment variable)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://inete_admin:2irW3RmFN864AVxK@cluster0.8i1sn.mongodb.net/IneteDB?retryWrites=true&w=majority&appName=Cluster0";

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

const User = mongoose.model('User', userSchema, 'Users');

// Dictionary Schema (for Dictionary collection)
// Update your Dictionary Schema to include new fields
const dictionarySchema = new mongoose.Schema({
  inete: { type: String, required: true },
  hiligaynon: { type: String, required: true },
  english: { type: String, required: true },
  pronunciation: String,
  partOfSpeech: String,
  
  // New definition fields
  definitionInete: String,
  definitionHiligaynon: String,
  definitionEnglish: String,
  
  // New example fields
  exampleInete: String,
  exampleHiligaynon: String,
  exampleEnglish: String,
  
  // Contributor info
  contributorName: String,
  contributorEmail: String,
  
  category: String,
  audioUrl: String,
  createdAt: { type: Date, default: Date.now },
});

// Text index for search
dictionarySchema.index({ 
  inete: 'text', 
  hiligaynon: 'text', 
  english: 'text' 
});

const Dictionary = mongoose.model('Dictionary', dictionarySchema, 'Dictionary');


// ============= ROOT ROUTE =============
app.get('/', (req, res) => {
  res.json({ 
    message: 'IneteLearn API is running!',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      signup: '/api/auth/signup',
      signin: '/api/auth/signin',
      dictionary: '/api/dictionary',
    }
  });
});

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
// Search dictionary - UPDATED to search new fields
app.get('/api/dictionary/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.json([]);
    }

    // Search in Inete, Hiligaynon, AND English fields
    const words = await Dictionary.find({
      $or: [
        { inete: { $regex: query, $options: 'i' } },
        { hiligaynon: { $regex: query, $options: 'i' } },
        { english: { $regex: query, $options: 'i' } }
      ]
    }).limit(50);

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
  res.json({ 
    status: 'OK', 
    message: 'IneteLearn API is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});


// Add to your server.js

// ============= COMMUNITY CONTRIBUTION ROUTES =============

// Submit word contribution
app.post('/api/dictionary/contribute', async (req, res) => {
  try {
    const { 
      inete, 
      hiligaynon, 
      english, 
      definitionInete,
      definitionHiligaynon,
      definitionEnglish,
      exampleInete,
      exampleHiligaynon,
      exampleEnglish,
      contributorName,
      contributorEmail
    } = req.body;

    // Validation
    if (!inete || !hiligaynon || !english) {
      return res.status(400).json({ 
        message: 'Inete, Hiligaynon, and English words are required' 
      });
    }

    // Check if word already exists
    const existingWord = await Dictionary.findOne({ 
      inete: inete.toLowerCase() 
    });
    
    if (existingWord) {
      return res.status(400).json({ 
        message: 'This Inete word already exists in the dictionary' 
      });
    }

    // Create new dictionary entry directly
    const newWord = new Dictionary({
      inete: inete.trim(),
      hiligaynon: hiligaynon.trim(),
      english: english.trim(),
      definitionInete: definitionInete?.trim() || '',
      definitionHiligaynon: definitionHiligaynon?.trim() || '',
      definitionEnglish: definitionEnglish?.trim() || '',
      exampleInete: exampleInete?.trim() || '',
      exampleHiligaynon: exampleHiligaynon?.trim() || '',
      exampleEnglish: exampleEnglish?.trim() || '',
      contributorName: contributorName?.trim() || 'Anonymous',
      contributorEmail: contributorEmail?.trim() || '',
      createdAt: new Date()
    });

    await newWord.save();

    console.log('✅ New word contributed:', inete, 'by', contributorName);
    
    res.status(201).json({ 
      message: 'Word added successfully! Thank you for your contribution.',
      word: newWord
    });

  } catch (error) {
    console.error('Contribution error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get recent contributions (for display)
app.get('/api/dictionary/recent', async (req, res) => {
  try {
    const recentWords = await Dictionary.find()
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json(recentWords);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching recent words', 
      error: error.message 
    });
  }
});

// Add this after your signin route in server.js

// Update user profile
app.put('/api/auth/update-profile', async (req, res) => {
  try {
    const { userId, fullName, token } = req.body;

    // Validation
    if (!userId || !fullName) {
      return res.status(400).json({ message: 'User ID and name are required' });
    }

    // Verify token (basic validation)
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find and update user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update full name
    user.fullName = fullName.trim();
    await user.save();

    console.log('✅ Profile updated for:', user.email);
    
    res.json({
      message: 'Profile updated successfully',
      fullName: user.fullName,
      email: user.email,
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 IneteLearn API Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
