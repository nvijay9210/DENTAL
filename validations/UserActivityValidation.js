const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists } = require("../models/checkIfExists");
const { isEarlier } = require("../utils/DateUtils");

const useractivityColumnConfig = [
  { columnname: "keycloak_user_id", type: "varchar", size: 36, null: false },
  { columnname: "ip_address", type: "varchar", size: 45, null: false },
  { columnname: "browser", type: "varchar", size: 100, null: false },
  {
    columnname: "device",
    type: "varchar",
    size: 50,
    null: false,
  },
  { columnname: "login_time", type: "datetime", null: false },
  { columnname: "logout_time", type: "datetime", size: 50, null: true },
  { columnname: "duration", type: "int", null: true },
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
