const userModel = require('../models/userModel');

// Create user service (calls the model function)
const createUser = async (data) => {
  try {
    const userId = await userModel.createUser(data); // Call model function to insert user
    return userId;
  } catch (error) {
    throw new Error('Failed to create user: ' + error.message);
  }
};

// Get all users service
const getUsers = async () => {
  try {
    const users = await userModel.getAllUser(); // Call model function to get users
    return users;
  } catch (error) {
    throw new Error('Failed to get users: ' + error.message);
  }
};

// Get user service
const getUserById = async (id) => {
  try {
    const users = await userModel.getUserById(id); // Call model function to get users
    return users;
  } catch (error) {
    throw new Error('Failed to get users: ' + error.message);
  }
};



// Check if user exists by phone number service
const getUserByPhoneNumber = async (mobile) => {
  try {
    const exists = await userModel.getUserByPhoneNumber(mobile); // Call model function to check user by mobile
    return exists;
  } catch (error) {
    throw new Error('Failed to check user by phone number: ' + error.message);
  }
};

// Check if user exists by phone number service
const getExcludeUserByPhoneNumberAndUserId = async (mobile,userId=null) => {
  try {
    const exists = await userModel.getExcludeUserByPhoneNumberAndUserId(mobile,userId); // Call model function to check user by mobile
    console.log(exists)
    return exists;
  } catch (error) {
    throw new Error('Failed to check user by phone number and userId: ' + error.message);
  }
};

// Update user service
const updateUser = async (userId, data) => {
  try {
    const affectedRows = await userModel.updateUser(userId, data);
    if (affectedRows === 0) {
      throw new Error("User not found or no changes made.");
    }
    return affectedRows;
  } catch (error) {
    throw new Error('Failed to update user: ' + error.message);
  }
};

// Delete user service
const deleteUser = async (userId) => {
  try {
    const affectedRows = await userModel.deleteUser(userId);
    if (affectedRows === 0) {
      throw new Error("User not found.");
    }
    return affectedRows;
  } catch (error) {
    throw new Error('Failed to delete user: ' + error.message);
  }
};


module.exports = { createUser, getUsers, getUserByPhoneNumber,getExcludeUserByPhoneNumberAndUserId,getUserById, updateUser,deleteUser };
