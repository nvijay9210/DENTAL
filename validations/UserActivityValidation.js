const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists } = require("../models/checkIfExists");
const { isEarlier } = require("../utils/DateUtils");

const userActivityColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "keycloak_user_id", type: "varchar", size: 36, null: false },
  { columnname: "session_id", type: "varchar", size: 50, null: false },
  { columnname: "activity_type", type: "varchar", size: 100, null: false }, // e.g., LOGIN, UPDATE, DELETE
  { columnname: "activity_desc", type: "text", null: true }, // optional description
  { columnname: "ip_address", type: "varchar", size: 45, null: true },
  { columnname: "browser_info", type: "text", null: true },
  { columnname: "device_info", type: "text", null: true },
  { columnname: "activity_time", type: "datetime", null: false }
];

/**
 * Validate Create UserActivity Input with Tenant Scope
 */
const createUserActivityValidation = async (details) => {
  validateInput(details, userActivityColumnConfig);
};

/**
 * Validate Update UserActivity Input with Tenant Scope
 */
const updateUserActivityValidation = async (useractivityId, details) => {
  validateInput(details, userActivityColumnConfig);

  if (details.logout_time === null)
    throw new CustomError("logout_time is required");

  const exists = await checkIfIdExists(
    "useractivity",
    "useractivity_id",
    useractivityId
  );
  if (!exists) {
    throw new CustomError("UserActivity not found", 404);
  }

  const earlier = isEarlier(details.login_time, details.logout_time);
  if (!earlier) throw new CustomError("logout_time is smaller than login_time");
};

module.exports = {
  createUserActivityValidation,
  updateUserActivityValidation,
};
