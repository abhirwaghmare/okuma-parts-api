require('dotenv').config();
const express = require('express');

const app = express();

app.use(express.json());
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(process.env.PORT, () => {
  console.log(`App running on port ${process.env.PORT}`);
});
