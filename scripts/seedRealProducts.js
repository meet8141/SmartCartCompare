require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const StoreProduct = require('../models/StoreProduct');
const axios = require('axios');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartcartcompare')
  .then(() => console.log('Connected to MongoDB for real data seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const CATEGORIES = [
  { category: 'Sports', queries: ['cricket bat', 'football', 'gym equipment', 'yoga mat'] },
  { category: 'Clothes', queries: ['tshirt for men', 'kurti for women', 'kids clothing', 'jeans'] },
  { category: 'Shoes', queries: ['running shoes', 'formal shoes men', 'sneakers', 'sandals women'] },
  { category: 'Electronics', queries: ['smartwatch', 'power bank', 'tablet', 'bluetooth speaker'] },
  { category: 'Groceries', queries: ['dry fruits', 'cooking oil', 'basmati rice', 'green tea'] },
  { category: 'Home', queries: ['bedsheet', 'curtains', 'wall clock', 'kitchen organizer'] },
  { category: 'Bags', queries: ['laptop backpack', 'travel luggage', 'women handbag', 'school bag'] },
  { category: 'Headphones', queries: ['wireless headphones', 'earbuds', 'gaming headset', 'neckband'] }
];

const seed = async () => {
  try {
    await StoreProduct.deleteMany({});
    console.log('Cleared all dummy products');

    for (const cat of CATEGORIES) {
      for (const query of cat.queries) {
        console.log(`Fetching real products for category: ${cat.category} (Search: "${query}")`);
        
        try {
          const response = await axios.get(`http://localhost:3000/api/product-details?product=${encodeURIComponent(query)}&noStore=true`, {
            timeout: 60000
          });
          
          const data = response.data;
          const amazonProds = (data.amazon?.products || []).slice(0, 4);
          const flipkartProds = (data.flipkart?.products || []).slice(0, 4);

        const newProducts = [];

        // Map Amazon Products
        for (const p of amazonProds) {
          let priceNum = 999;
          if (p.currentPrice && p.currentPrice !== 'N/A') {
            priceNum = parseFloat(p.currentPrice.replace(/[^0-9.]/g, ''));
          }
          newProducts.push({
            name: p.name.substring(0, 100), // Ensure name is not too long
            description: `Source: Amazon. ${p.features ? p.features.join(' | ') : 'High quality product from Amazon.'}`,
            price: priceNum > 0 ? priceNum : 999,
            category: cat.category,
            subCategory: 'General',
            imageUrl: p.imageUrl || 'https://via.placeholder.com/200',
            stock: Math.floor(Math.random() * 50) + 10
          });
        }

        // Map Flipkart Products
        for (const p of flipkartProds) {
          let priceNum = 999;
          if (p.currentPrice && p.currentPrice !== 'N/A') {
            priceNum = parseFloat(p.currentPrice.replace(/[^0-9.]/g, ''));
          }
          newProducts.push({
            name: p.name.substring(0, 100),
            description: `Source: Flipkart. ${p.features ? p.features.join(' | ') : 'High quality product from Flipkart.'}`,
            price: priceNum > 0 ? priceNum : 999,
            category: cat.category,
            subCategory: 'General',
            imageUrl: p.imageUrl || 'https://via.placeholder.com/200',
            stock: Math.floor(Math.random() * 50) + 10
          });
        }

        if (newProducts.length > 0) {
          await StoreProduct.insertMany(newProducts);
          console.log(` -> Seeded ${newProducts.length} legit products for ${cat.category} ("${query}")`);
        } else {
          console.log(` -> No products found for ${cat.category} ("${query}").`);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (err) {
          console.error(` -> Error fetching for ${cat.category} ("${query}"):`, err.message);
        }
      } // end inner for
    } // end outer for

    console.log('Seeding of real products complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

seed();
