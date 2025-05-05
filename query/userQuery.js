const userQuery = {
  createUserTable: `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      mobile VARCHAR(15) UNIQUE NOT NULL,
      email VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  createUser: `INSERT INTO users (name, mobile, email) VALUES (?, ?, ?)`,
  getAllUser: `SELECT * FROM users`,
  getUserById: `SELECT * FROM users where id=?`,
  getUserByPhoneNumber: `SELECT 1 FROM users where mobile=?`,
  getExcludeUserByPhoneNumberAndUserId: `SELECT 1 FROM users where mobile=? and id!=?`,
  updateUser: `UPDATE users SET name = ?, mobile = ?, email = ? WHERE id = ?`,
  deleteUser: `DELETE FROM users WHERE id = ?`,
};

module.exports = { userQuery };
