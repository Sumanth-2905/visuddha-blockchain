const mongoose = require('mongoose');

const QualityTestSchema = new mongoose.Schema({
  testID: { type: String, unique: true, required: true },
  sampleID: { type: String, required: true },
  labID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  results: {
    moisture: Number,
    pesticide: Number,
    dnaBarcode: Boolean
  },
  reportURL: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('QualityTest', QualityTestSchema);
