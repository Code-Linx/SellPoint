const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A category must have a name'],
    unique: true,
  },
  deleted: {
    type: Boolean,
    default: false, // Default to false, meaning the category is active
  },
  description: {
    type: String,
  },
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
