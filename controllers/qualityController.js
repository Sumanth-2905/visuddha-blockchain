const QualityTest = require('../models/QualityTest');
const { v4: uuidv4 } = require('uuid');

exports.createQualityTest = async (req, res) => {
  try {
    const { sampleID, results, reportURL } = req.body;

    const test = new QualityTest({
      testID: uuidv4(),
      sampleID,
      labID: req.user.id,
      results,
      reportURL
    });

    await test.save();
    res.status(201).json({ message: 'Quality test created', test });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getQualityTest = async (req, res) => {
  try {
    const test = await QualityTest.findOne({ testID: req.params.id });
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
