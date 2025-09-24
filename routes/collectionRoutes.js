const express = require('express');
const { createCollectionEvent, getCollectionEvents } = require('../controllers/collectionController');
const { authenticateJWT } = require('../middleware/auth');
const Joi = require('joi');
const validateBody = require('../utils/validateBody');

const router = express.Router();

// Joi schema
const collectionSchema = Joi.object({
  gps: Joi.object({ lat: Joi.number().required(), lng: Joi.number().required() }).required(),
  species: Joi.string().required(),
  qualityMetrics: Joi.object()
});

router.post('/', authenticateJWT, validateBody(collectionSchema), createCollectionEvent);
router.get('/', authenticateJWT, getCollectionEvents);

module.exports = router;
