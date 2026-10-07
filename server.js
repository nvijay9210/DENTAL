const dotenv = require("dotenv");

// Load .env FIRST
dotenv.config();

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("DB_HOST:", process.env.DB_HOST);

const { app } = require("./app");

const PORT = Number(process.env.PORT) || 8004;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
