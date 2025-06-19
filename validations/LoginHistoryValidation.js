const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists } = require("../models/checkIfExists");

const useractivityColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "kecloak_user_id", type: "char", size: 36, null: false },
  { columnname: "session_id", type: "char", size: 36, null: false },
  { columnname: "ip_address", type: "varchar", size: 45, null: true },
  { columnname: "browser_info", type: "text", null: true },
  {
    columnname: "device_info",
    type: "text",
    null: true,
  },
  { columnname: "login_time", type: "datetime", null: false },
  { columnname: "logout_time", type: "datetime", size: 50, null: true }
];
/**
 * Validate Create UserActivity Input with Tenant Scope
 */
const createUserActivityValidation = async (details) => {
  validateInput(details, useractivityColumnConfig);
};

/**
 * Validate Update UserActivity Input with Tenant Scope
 */
const updateUserActivityValidation = async (useractivityId, details) => {
  validateInput(details, useractivityColumnConfig);

  const exists = await checkIfIdExists(
    "useractivity",
    "useractivity_id",
    useractivityId
  );
  if (!exists) {
    throw new CustomError("UserActivity not found", 404);
  }
};

module.exports = {
  createUserActivityValidation,
  updateUserActivityValidation,
};
