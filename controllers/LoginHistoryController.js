const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const login_historyService = require("../services/LoginHistoryService");
const { getClientInfo } = require("../utils/LoginHistoryInfo");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");
const { createLoginHistoryValidation, updateLoginHistoryValidation } = require("../validations/LoginHistoryValidation");
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new login_history
 */
exports.createLoginHistory = async (req, res, next) => {
  const details = req.body;

  try {
    // Generate session ID if not already set
    if (!details.session_id) {
      details.session_id = uuidv4();
    }

    // Get client info (IP, browser, device, etc.)
    const clientInfo = await getClientInfo(req);


    // Build login history data
    const loginHistoryData = {
      ...details,
      login_time:new Date(),
      app_name: 'dental',
      ip_address: clientInfo.ip,
      device_info: clientInfo.device,
      browser_info: clientInfo.browser
    };

    // Validate data
    await createLoginHistoryValidation(loginHistoryData);

    // Save to DB
    const id = await login_historyService.createLoginHistory(loginHistoryData);

    // Respond
    res.status(201).json({ message: "LoginHistory created", id });

  } catch (err) {
    next(err);
  }
};

/**
 * Get all login_historys by tenant ID with pagination
 */
exports.getAllLoginHistorysByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const login_historys = await login_historyService.getAllLoginHistorysByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(login_historys);
  } catch (err) {
    next(err);
  }
};

/**
 * Get login_history by tenant and login_history ID
 */
exports.getLoginHistoryByTenantIdAndLoginHistoryId = async (req, res, next) => {
  const { login_history_id, tenant_id } = req.params;

  try {
    const login_history1 = await checkIfExists(
      "login_history",
      "login_history_id",
      login_history_id,
      tenant_id
    );

    if (!login_history1) throw new CustomError("LoginHistory not found", 404);

    // Fetch login_history details
    const login_history = await login_historyService.getLoginHistoryByTenantIdAndLoginHistoryId(
      tenant_id,
      login_history_id
    );
    res.status(200).json(login_history);
  } catch (err) {
    next(err);
  }
};

exports.getLoginHistoryByTenantAndKeycloakUserId = async (req, res, next) => {
  const { keycloak_user_id, tenant_id } = req.params;

  console.log('getloginController:',tenant_id,keycloak_user_id)

  try {

    // Fetch login_history details
    const login_history = await login_historyService.getLoginHistoryByTenantAndKeycloakUserId(
      tenant_id,
      keycloak_user_id
    );
    res.status(200).json(login_history);
  } catch (err) {
    console.log(err)
    next(err);
  }
};

/**
 * Update an existing login_history
 */
exports.updateLoginHistory = async (req, res, next) => {
  const { login_history_id,tenant_id } = req.params;
  const details = req.body;


  try {
    // Validate update input
    await updateLoginHistoryValidation(login_history_id, details);

    // Update the login_history
    await login_historyService.updateLoginHistory(login_history_id, details, tenant_id);
    res.status(200).json({ message: "LoginHistory updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a login_history by ID and tenant ID
 */
exports.deleteLoginHistoryByTenantIdAndLoginHistoryId = async (req, res, next) => {
  const { login_history_id, tenant_id } = req.params;

  try {
    // Validate if login_history exists
    const treatment = await checkIfExists(
      "login_history",
      "login_history_id",
      login_history_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("login_historyId not Exists", 404);

    // Delete the login_history
    await login_historyService.deleteLoginHistoryByTenantIdAndLoginHistoryId(
      tenant_id,
      login_history_id
    );
    res.status(200).json({ message: "LoginHistory deleted successfully" });
  } catch (err) {
    next(err);
  }
};
