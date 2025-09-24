const ProcessingStep = require('../models/ProcessingStep');
const { v4: uuidv4 } = require('uuid');

exports.createProcessingStep = async (req, res) => {
  try {
    const { batchID, action, parameters } = req.body;

    const step = new ProcessingStep({
      stepID: uuidv4(),
      batchID,
      facilityID: req.user.id,
      action,
      parameters
    });

    await step.save();
    res.status(201).json({ message: 'Processing step added', step });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProcessingSteps = async (req, res) => {
  try {
    const steps = await ProcessingStep.find({ batchID: req.params.batchID });
    res.json(steps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
