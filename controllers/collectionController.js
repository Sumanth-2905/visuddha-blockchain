const CollectionEvent = require('../models/CollectionEvent');
const { v4: uuidv4 } = require('uuid');

exports.createCollectionEvent = async (req, res) => {
  try {
    const { gps, species, qualityMetrics } = req.body;

    const event = new CollectionEvent({
      eventID: uuidv4(),
      farmerID: req.user.id,
      gps,
      species,
      qualityMetrics
    });

    await event.save();
    res.status(201).json({ message: 'Collection event created', event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCollectionEvents = async (req, res) => {
  try {
    const events = await CollectionEvent.find().limit(50); // simple GET
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
