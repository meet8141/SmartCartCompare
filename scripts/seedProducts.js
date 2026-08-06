require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const StoreProduct = require('../models/StoreProduct');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartcartcompare')
  .then(() => console.log('Connected to MongoDB for seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const generateProducts = (category, count, subCategory = 'General', priceRange = [100, 5000]) => {
  const products = [];
  for (let i = 1; i <= count; i++) {
    products.push({
      name: `${category} Item ${i} (${subCategory})`,
      description: `High quality ${category.toLowerCase()} item for your everyday needs. Model ${i}.`,
      price: Math.floor(Math.random() * (priceRange[1] - priceRange[0])) + priceRange[0],
      category,
      subCategory,
      imageUrl: `https://picsum.photos/seed/${category}${subCategory}${i}/200/200`,
      stock: Math.floor(Math.random() * 50) + 10
    });
  }
  return products;
};

const seed = async () => {
  try {
    await StoreProduct.deleteMany({});
    console.log('Cleared existing products');

    const products = [
      ...generateProducts('Sports', 20, 'General', [500, 3000]),
      ...generateProducts('Clothes', 17, 'Men', [300, 2000]),
      ...generateProducts('Clothes', 17, 'Women', [400, 2500]),
      ...generateProducts('Clothes', 16, 'Kids', [200, 1500]),
      ...generateProducts('Shoes', 20, 'General', [800, 5000]),
      ...generateProducts('Electronics', 30, 'General', [1000, 50000]),
      ...generateProducts('Groceries', 20, 'General', [50, 1000]),
      ...generateProducts('Home', 20, 'General', [300, 10000]),
      ...generateProducts('Bags', 20, 'General', [400, 3000]),
      ...generateProducts('Headphones', 10, 'General', [500, 15000])
    ];

    await StoreProduct.insertMany(products);
    console.log(`Seeded ${products.length} products successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
};

seed();
