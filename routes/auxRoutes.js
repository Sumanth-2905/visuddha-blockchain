const express = require('express');
const router = express.Router();

router.get('/species', (req, res) => {
  res.json(["Ashwagandha", "Tulsi", "Neem", "Giloy"]);
});

router.get('/zones', (req, res) => {
  res.json([
    { region: "North", polygon: [[28.6, 77.2], [28.7, 77.3]] },
    { region: "South", polygon: [[12.9, 77.5], [13.0, 77.6]] }
  ]);
});

module.exports = router;
