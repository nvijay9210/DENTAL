const pool = require("../config/db");
const { userQuery } = require("../query/userQuery");

const createUserTable = async () => {
  const query = userQuery.createUserTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Users table created successfully.");
  } catch (error) {
    console.error("Error creating users table:", error);
    throw new Error("Database error occurred while creating the users table.");
  } finally {
    conn.release();
  }
};

const createUser = async (data) => {
  const query = userQuery.createUser;
  const conn = await pool.getConnection();
  try {
    const { name, mobile, email } = data;
    // Execute query with values passed dynamically
    await conn.query(query, [name, mobile, email]);
    console.log(`User created successfully: ${name}`);
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Database error occurred while creating the user.");
  } finally {
    conn.release();
  }
};

const getAllUser = async () => {
  const query = userQuery.getAllUser;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query);
    return rows;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Database error occurred while fetching users.");
  } finally {
    conn.release();
  }
};

const getUserByPhoneNumber = async (mobile) => {
  const query = userQuery.getUserByPhoneNumber;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [mobile]);
    // Return true if user exists, otherwise false
    return rows.length > 0;
  } catch (error) {
    console.error(`Error fetching user by phone number ${mobile}:`, error);
    throw new Error("Database error occurred while fetching the user.");
  } finally {
    conn.release();
  }
};

const getExcludeUserByPhoneNumberAndUserId = async (mobile,userId) => {
  const query = userQuery.getExcludeUserByPhoneNumberAndUserId;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [mobile,userId]);
    // Return true if user exists, otherwise false
    return rows.length > 0;
  } catch (error) {
    console.error(`Error fetching user by phone number ${mobile}:`, error);
    throw new Error("Database error occurred while fetching the user By phonenumber and userId.");
  } finally {
    conn.release();
  }
};

const getUserById = async (userId) => {
  const query = userQuery.getUserById;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [userId]);
    // Return true if user exists, otherwise false
    return rows.length > 0;
  } catch (error) {
    throw new Error("Database error occurred while fetching the user.");
  } finally {
    conn.release();
  }
};

// Update User in the Database
const updateUser = async (userId, data) => {
  const query = userQuery.updateUser; // Assume you have an update query in your `userQuery.js`
  const conn = await pool.getConnection();
  try {
    const { name, mobile, email } = data;
    const [result] = await conn.query(query, [name, mobile, email, userId]);
    return result.affectedRows; // Return the number of rows affected (should be 1 if successful)
  } catch (error) {
    console.error("Error updating user:", error.message);
    throw new Error("Database error occurred while updating the user.");
  } finally {
    conn.release();
  }
};

// Delete User in the Database
const deleteUser = async (userId) => {
  const query = userQuery.deleteUser; // Assume you have a delete query in your `userQuery.js`
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [userId]);
    return result.affectedRows; // Return the number of rows affected (should be 1 if successful)
  } catch (error) {
    console.error("Error deleting user:", error.message);
    throw new Error("Database error occurred while deleting the user.");
  } finally {
    conn.release();
  }
};

module.exports = {
  createUser,
  getAllUser,
  getUserById,
  getUserByPhoneNumber,
  getExcludeUserByPhoneNumberAndUserId,
  updateUser,
  deleteUser,
};
