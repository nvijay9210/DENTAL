const { execSync } = require("child_process");

const now = new Date();

const timestamp =
  now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, "0") +
  String(now.getDate()).padStart(2, "0") +
  String(now.getHours()).padStart(2, "0") +
  String(now.getMinutes()).padStart(2, "0") +
  String(now.getSeconds()).padStart(2, "0");

const migrationName = `auto_${timestamp}`;

console.log(`Running Prisma migration: ${migrationName}`);

execSync(`npx prisma migrate dev --name ${migrationName}`, {
  stdio: "inherit",
});