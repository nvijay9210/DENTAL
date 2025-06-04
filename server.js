const app = require('./app');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'development';

dotenv.config(); // Load base .env first
dotenv.config({ path: `.env.${env}` }); // Then env-specific override

const config = require('./config/Config');

const PORT = process.env.PORT || 5000;

console.log(`Environment: ${env}`);
console.log(`Using DB Host: ${process.env.DB_HOST}`);
console.log(`Server listening on port: ${PORT}`);

app.listen(PORT, () => {
  console.log(`✅ Server running on ${process.env.DB_HOST} port ${PORT}`);
});
