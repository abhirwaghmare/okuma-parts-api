const axios = require('axios');

const bcClient = axios.create({
  baseURL: `https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}`,
  headers: {
    'X-Auth-Token': process.env.BC_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

const getProducts = () => bcClient.get('/v3/catalog/products');
const createProduct = (data) => bcClient.post('/v3/catalog/products', data);

module.exports = { bcClient, getProducts, createProduct };
