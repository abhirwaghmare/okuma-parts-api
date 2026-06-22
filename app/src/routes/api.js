const express = require('express');
const router = express.Router();
const { getProducts } = require('../services/bigcommerce');

router.get('/products', async (req, res) => {
  try {
    const { data } = await getProducts();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
