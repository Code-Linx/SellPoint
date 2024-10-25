const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  currency: {
    type: String,
    default: 'USD', // Default currency
  },
  // Add more global settings here if necessary
});

const AppSettings = mongoose.model('AppSettings', settingsSchema);
module.exports = AppSettings;
