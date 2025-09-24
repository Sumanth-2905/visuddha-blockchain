const mongoose = require('mongoose');

const ProcessingStepSchema = new mongoose.Schema({
  stepID: { type: String, unique: true, required: true },
  batchID: { type: String, required: true },
  facilityID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  parameters: { type: Object, default: {} },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ProcessingStep', ProcessingStepSchema);
