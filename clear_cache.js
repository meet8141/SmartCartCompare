/**
 * Utility: clear all cached product data from MongoDB
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function clearCache() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartcartcompare');
    console.log('Connected to MongoDB');
    
    const result = await mongoose.connection.db.collection('productcaches').deleteMany({});
    console.log(`Cleared ${result.deletedCount} cached entries`);
    
    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

clearCache();
