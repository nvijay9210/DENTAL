const pool = require("../config/db");
const { userQuery } = require("../query/userQuery");

const createUser = async (data) => {
  const conn = await pool.getConnection();

  try {
    const {
      keycloak_id,
      username = null,
      email = null,
      status = 1,
      created_by = "SYSTEM",
    } = data;

    const [result] = await conn.query(userQuery.createUser, [
      keycloak_id,
      username,
      email,
      status,
      created_by,
    ]);

    return result.insertId;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  } finally {
    conn.release();
  }
};

const getAllUsers = async () => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(userQuery.getAllUsers);
    return rows;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  } finally {
    conn.release();
  }
};

const getUserById = async (userId) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(userQuery.getUserById, [userId]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  } finally {
    conn.release();
  }
};

const getUserByKeycloakId = async (keycloakId) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.getUserByKeycloakId,
      [keycloakId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error fetching user by Keycloak ID:", error);
    throw error;
  } finally {
    conn.release();
  }
};

const checkKeycloakIdExists = async (keycloakId) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.checkKeycloakIdExists,
      [keycloakId]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

const checkUsernameExists = async (username) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.checkUsernameExists,
      [username]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

const checkUsernameExistsExcludeUser = async (username, userId) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.checkUsernameExistsExcludeUser,
      [username, userId]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

const checkEmailExists = async (email) => {
  if (!email) return false;

  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.checkEmailExists,
      [email]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

const checkEmailExistsExcludeUser = async (email, userId) => {
  if (!email) return false;

  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.checkEmailExistsExcludeUser,
      [email, userId]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

const updateUser = async (userId, data) => {
  const conn = await pool.getConnection();

  try {
    const {
      username = null,
      email = null,
      status = 1,
      updated_by = "SYSTEM",
    } = data;

    const [result] = await conn.query(userQuery.updateUser, [
      username,
      email,
      status,
      updated_by,
      userId,
    ]);

    return result.affectedRows;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  } finally {
    conn.release();
  }
};

const updateUserStatus = async (userId, status, updatedBy = "SYSTEM") => {
  const conn = await pool.getConnection();

  try {
    const [result] = await conn.query(userQuery.updateUserStatus, [
      status,
      updatedBy,
      userId,
    ]);

    return result.affectedRows;
  } catch (error) {
    console.error("Error updating user status:", error);
    throw error;
  } finally {
    conn.release();
  }
};

const deleteUser = async (userId) => {
  const conn = await pool.getConnection();

  try {
    const [result] = await conn.query(
      userQuery.deleteUser,
      [userId]
    );

    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getUserByKeycloakId,
  checkKeycloakIdExists,
  checkUsernameExists,
  checkUsernameExistsExcludeUser,
  checkEmailExists,
  checkEmailExistsExcludeUser,
  updateUser,
  updateUserStatus,
  deleteUser,
};