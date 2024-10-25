const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.ObjectId, // Referencing the Item model
    ref: 'Item',
    required: [true, 'An item must be provided'],
  },
  quantity: {
    type: Number,
    required: [true, 'An item quantity is required'],
    min: [1, 'Quantity must be at least 1'], // Ensures at least one item is ordered
  },
  price: {
    type: Number,
    required: true, // This could be optional if you want to fetch it from the Item model instead
  },
});

const orderSchema = new mongoose.Schema({
  items: [orderItemSchema],
  total: {
    type: Number,
    required: true,
  },
  cashier: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'], // Adding customer name
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'], // Adding customer email
    validate: {
      validator: function (v) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v); // Simple email validation regex
      },
      message: (props) => `${props.value} is not a valid email address!`,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Export the Order model
const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
