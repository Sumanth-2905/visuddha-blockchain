const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['farmer', 'lab', 'processor', 'manufacturer', 'ayush'], 
    default: 'farmer'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
