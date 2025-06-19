const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const loginhistoryService = require("../services/LoginHistoryService");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");
const { createLoginHistoryValidation, updateLoginHistoryValidation } = require("../validations/LoginHistoryValidation");
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new loginhistory
 */
exports.createLoginHistory = async (req, res, next) => {
  const details = req.body;
  details.session_id=uuidv4()
  try {
    await createLoginHistoryValidation(details)
    // Create the loginhistory
    const id = await loginhistoryService.createLoginHistory(details);
    res.status(201).json({ message: "LoginHistory created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all loginhistorys by tenant ID with pagination
 */
exports.getAllLoginHistorysByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const loginhistorys = await loginhistoryService.getAllLoginHistorysByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(loginhistorys);
  } catch (err) {
    next(err);
  }
};

/**
 * Get loginhistory by tenant and loginhistory ID
 */
exports.getLoginHistoryByTenantIdAndLoginHistoryId = async (req, res, next) => {
  const { loginhistory_id, tenant_id } = req.params;

  try {
    const loginhistory1 = await checkIfExists(
      "loginhistory",
      "loginhistory_id",
      loginhistory_id,
      tenant_id
    );

    if (!loginhistory1) throw new CustomError("LoginHistory not found", 404);

    // Fetch loginhistory details
    const loginhistory = await loginhistoryService.getLoginHistoryByTenantIdAndLoginHistoryId(
      tenant_id,
      loginhistory_id
    );
    res.status(200).json(loginhistory);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing loginhistory
 */
exports.updateLoginHistory = async (req, res, next) => {
  const { loginhistory_id,tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await updateLoginHistoryValidation(loginhistory_id, details);

    // Update the loginhistory
    await loginhistoryService.updateLoginHistory(loginhistory_id, details, tenant_id);
    res.status(200).json({ message: "LoginHistory updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a loginhistory by ID and tenant ID
 */
exports.deleteLoginHistoryByTenantIdAndLoginHistoryId = async (req, res, next) => {
  const { loginhistory_id, tenant_id } = req.params;

  try {
    // Validate if loginhistory exists
    const treatment = await checkIfExists(
      "loginhistory",
      "loginhistory_id",
      loginhistory_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("loginhistoryId not Exists", 404);

    // Delete the loginhistory
    await loginhistoryService.deleteLoginHistoryByTenantIdAndLoginHistoryId(
      tenant_id,
      loginhistory_id
    );
    res.status(200).json({ message: "LoginHistory deleted successfully" });
  } catch (err) {
    next(err);
  }
};
