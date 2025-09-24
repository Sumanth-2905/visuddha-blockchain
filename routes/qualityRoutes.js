const express = require('express');
const { createQualityTest, getQualityTest } = require('../controllers/qualityController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const Joi = require('joi');
const validateBody = require('../utils/validateBody');

const router = express.Router();

const qualitySchema = Joi.object({
  sampleID: Joi.string().required(),
  results: Joi.object({
    moisture: Joi.number(),
    pesticide: Joi.number(),
    dnaBarcode: Joi.boolean()
  }),
  reportURL: Joi.string()
});

router.post('/', authenticateJWT, authorizeRoles('lab'), validateBody(qualitySchema), createQualityTest);
router.get('/:id', authenticateJWT, getQualityTest);

module.exports = router;
