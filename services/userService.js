const userModel = require("../models/userModel");

const createUser = async (data) => {
  try {
    return await userModel.createUser(data);
  } catch (error) {
    throw new Error("Failed to create user: " + error.message);
  }
};

const getUsers = async () => {
  try {
    return await userModel.getAllUsers();
  } catch (error) {
    throw new Error("Failed to get users: " + error.message);
  }
};

const getUserById = async (userId) => {
  try {
    return await userModel.getUserById(userId);
  } catch (error) {
    throw new Error("Failed to get user: " + error.message);
  }
};

const getUserByKeycloakId = async (keycloakId) => {
  try {
    return await userModel.getUserByKeycloakId(keycloakId);
  } catch (error) {
    throw new Error(
      "Failed to get user by Keycloak ID: " + error.message
    );
  }
};

const updateUser = async (userId, data) => {
  try {
    return await userModel.updateUser(userId, data);
  } catch (error) {
    throw new Error("Failed to update user: " + error.message);
  }
};

const updateUserStatus = async (userId, status, updatedBy) => {
  try {
    return await userModel.updateUserStatus(
      userId,
      status,
      updatedBy
    );
  } catch (error) {
    throw new Error(
      "Failed to update user status: " + error.message
    );
  }
};

const deleteUser = async (userId) => {
  try {
    return await userModel.deleteUser(userId);
  } catch (error) {
    throw new Error("Failed to delete user: " + error.message);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  getUserByKeycloakId,
  updateUser,
  updateUserStatus,
  deleteUser,
};