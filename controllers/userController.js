const userService = require("../services/userService");
const { createUserValidation, updateUserValidation } = require("../validations/userValidation");

exports.create = async (req, res, next) => {
  try {

    await createUserValidation(req.body)
    // Create a new user
    const id = await userService.createUser(req.body);
    res.status(201).json({ message: "User created", id });
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const users = await userService.getUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const userId = req.params.id;  // Get the user ID from the URL parameter

    // Check if the user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await updateUserValidation(req.body,userId)

    // Update user data
    const updatedUser = await userService.updateUser(userId, req.body);
    res.status(200).json({ message: "User updated successfully", updatedUser });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const userId = req.params.id;  // Get the user ID from the URL parameter

    // Check if the user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user
    await userService.deleteUser(userId);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};

