const express = require('express');
const { createProcessingStep, getProcessingSteps } = require('../controllers/processingController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const Joi = require('joi');
const validateBody = require('../utils/validateBody');

const router = express.Router();

const processingSchema = Joi.object({
  batchID: Joi.string().required(),
  action: Joi.string().required(),
  parameters: Joi.object()
});

router.post('/', authenticateJWT, authorizeRoles('processor', 'manufacturer'), validateBody(processingSchema), createProcessingStep);
router.get('/:batchID', authenticateJWT, getProcessingSteps);

module.exports = router;
