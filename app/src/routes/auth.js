const express = require('express');
const router = express.Router();

// OAuth install/callback handlers — wire up BC app OAuth flow here
router.get('/callback', (req, res) => {
  res.json({ status: 'auth callback not yet implemented' });
});

module.exports = router;
