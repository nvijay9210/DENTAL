const { CustomError } = require("../middlewares/CustomeError");
const userModel = require("../models/userModel");

const validateKeycloakId = (keycloakId) => {
  if (!keycloakId) {
    throw new CustomError("Keycloak ID is required", 400);
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(keycloakId)) {
    throw new CustomError("Invalid Keycloak ID", 400);
  }
};

const validateStatus = (status) => {
  if (status !== undefined && status !== 0 && status !== 1) {
    throw new CustomError("Status must be 0 or 1", 400);
  }
};

const validateCreateUser = async (data) => {
  validateKeycloakId(data.keycloak_id);
  validateStatus(data.status);

  if (data.username) {
    const exists = await userModel.checkUsernameExists(data.username);

    if (exists) {
      throw new CustomError("Username already exists", 409);
    }
  }

  if (data.email) {
    const exists = await userModel.checkEmailExists(data.email);

    if (exists) {
      throw new CustomError("Email already exists", 409);
    }
  }

  const keycloakExists =
    await userModel.checkKeycloakIdExists(data.keycloak_id);

  if (keycloakExists) {
    throw new CustomError("Keycloak ID already exists", 409);
  }
};

const validateUpdateUser = async (userId, data) => {
  if (!userId) {
    throw new CustomError("User ID is required", 400);
  }

  validateStatus(data.status);

  const user = await userModel.getUserById(userId);

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  if (data.username) {
    const exists =
      await userModel.checkUsernameExistsExcludeUser(
        data.username,
        userId
      );

    if (exists) {
      throw new CustomError("Username already exists", 409);
    }
  }

  if (data.email) {
    const exists =
      await userModel.checkEmailExistsExcludeUser(
        data.email,
        userId
      );

    if (exists) {
      throw new CustomError("Email already exists", 409);
    }
  }
};

const validateStatusUpdate = async (userId, status) => {
  if (!userId) {
    throw new CustomError("User ID is required", 400);
  }

  if (status !== 0 && status !== 1) {
    throw new CustomError("Status must be 0 or 1", 400);
  }

  const user = await userModel.getUserById(userId);

  if (!user) {
    throw new CustomError("User not found", 404);
  }
};

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateStatusUpdate,
};