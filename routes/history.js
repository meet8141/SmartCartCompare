const express = require('express');
const router = express.Router();
const SearchHistory = require('../models/SearchHistory');
const { auth } = require('../middleware/auth');

// GET /api/history
// Fetch history for logged in user
router.get('/', auth, async (req, res) => {
  try {
    const history = await SearchHistory.find({ user: req.user._id })
      .sort({ timestamp: -1 })
      .limit(50); // Limit to last 50 searches for performance
    res.json(history);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
