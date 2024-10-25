const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'An item must have a name'],
  },
  price: {
    type: Number,
    required: [true, 'An item must have a price'],
  },
  description: {
    type: String,
  },
  quantity: {
    type: Number,
    required: [true, 'An item must have a quantity available'],
    min: [0, 'Quantity cannot be less than 0'],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Link to Category model
    required: [true, 'An item must belong to a category'],
  },
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
