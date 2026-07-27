const mongoose = require('mongoose');
const SearchHistory = require('./models/SearchHistory');

mongoose.connect('mongodb://127.0.0.1:27017/smartcartcompare').then(async () => {
  try {
    const histories = await SearchHistory.find({ user: { $exists: true } }).sort({timestamp:-1}).limit(5);
    console.log("Histories with user:", histories);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
