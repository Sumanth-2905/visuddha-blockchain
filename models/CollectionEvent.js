const mongoose = require('mongoose');

const CollectionEventSchema = new mongoose.Schema({
  eventID: { type: String, unique: true, required: true },
  farmerID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gps: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  timestamp: { type: Date, default: Date.now },
  species: { type: String, required: true },
  qualityMetrics: { type: Object, default: {} },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('CollectionEvent', CollectionEventSchema);
