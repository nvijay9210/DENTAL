const userService = require("../services/userService");
const {
  validateCreateUser,
  validateUpdateUser,
  validateStatusUpdate,
} = require("../validations/userValidation");

exports.createUser = async (req, res, next) => {
  try {
    await validateCreateUser(req.body);

    const userId = await userService.createUser({
      ...req.body,
      created_by:
        req.body.created_by ||
        req.user?.preferred_username ||
        "SYSTEM",
    });

    res.status(201).json({
      message: "User created successfully",
      user_id: userId,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getUsers();

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { user_id } = req.params;

    const user = await userService.getUserById(user_id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

exports.getUserByKeycloakId = async (req, res, next) => {
  try {
    const { keycloak_id } = req.params;

    const user =
      await userService.getUserByKeycloakId(keycloak_id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;

    await validateUpdateUser(user_id, req.body);

    await userService.updateUser(user_id, {
      ...req.body,
      updated_by:
        req.body.updated_by ||
        req.user?.preferred_username ||
        "SYSTEM",
    });

    res.status(200).json({
      message: "User updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { status, updated_by } = req.body;

    await validateStatusUpdate(user_id, status);

    await userService.updateUserStatus(
      user_id,
      status,
      updated_by ||
        req.user?.preferred_username ||
        "SYSTEM"
    );

    res.status(200).json({
      message: "User status updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;

    const user = await userService.getUserById(user_id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await userService.deleteUser(user_id);

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};