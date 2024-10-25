const Category = require('../model/categoryModel'); // Assuming this is the file path

const categories = [
  { name: 'Fruits', description: 'Fresh fruits and produce' },
  { name: 'Vegetables', description: 'Fresh vegetables and greens' },
  { name: 'Meat', description: 'Various meat cuts and preparations' },
  { name: 'Seafood', description: 'Fish, shrimp, and other seafood' },
  { name: 'Dairy', description: 'Milk, cheese, and other dairy products' },
  { name: 'Beverages', description: 'Soft drinks, alcohol, coffee, etc.' },
  { name: 'Bakery', description: 'Bread, cakes, and baked goods' },
  { name: 'Snacks', description: 'Quick bites, chips, and snacks' },
  { name: 'Appetizers', description: 'Salads, soups, and starters' },
  { name: 'Main Courses', description: 'Entrees and main dishes' },
  { name: 'Desserts', description: 'Sweet dishes and ice creams' },
  { name: 'Condiments', description: 'Sauces, seasonings, and spices' },
  { name: 'Frozen Items', description: 'Frozen goods for later preparation' },
  { name: 'Prepared Meals', description: 'Ready-to-eat meals' },
];

// Insert into database
Category.insertMany(categories)
  .then(() => console.log('Categories added successfully!'))
  .catch((err) => console.log('Error adding categories: ', err));
