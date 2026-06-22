import axios, { AxiosInstance } from 'axios';

const bcClient: AxiosInstance = axios.create({
  baseURL: `https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}`,
  headers: {
    'X-Auth-Token': process.env.BC_ACCESS_TOKEN ?? '',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const getProducts = () => bcClient.get('/v3/catalog/products');
const createProduct = (data: unknown) => bcClient.post('/v3/catalog/products', data);
const getOrders = () => bcClient.get('/v2/orders');
const getCustomers = () => bcClient.get('/v2/customers');

export { bcClient, getProducts, createProduct, getOrders, getCustomers };
