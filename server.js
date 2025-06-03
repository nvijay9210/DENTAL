const app = require('./app');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'development';

// Load base .env
dotenv.config();

// Load env-specific .env file
dotenv.config({ path: `.env.${env}` });

// Now require config so process.env is ready
const config = require('./config/Config');

const PORT = config.port || 5000;

console.log(`Using DB Host: ${config.db.host}`);

app.listen(PORT, () => console.log(`Server running on ${config.db.host} port ${PORT}`));
