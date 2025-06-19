const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const useractivityService = require("../services/UserActivityService");
const { isEarlier } = require("../utils/DateUtils");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");
const { createUserActivityValidation, updateUserActivityValidation } = require("../validations/UserActivityValidation");

/**
 * Create a new useractivity
 */
exports.createUserActivity = async (req, res, next) => {
  const details = req.body;

  try {
    // Create the useractivity
    await createUserActivityValidation(details)
    const id = await useractivityService.createUserActivity(details);
    res.status(201).json({ message: "UserActivity created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all useractivitys by tenant ID with pagination
 */
exports.getAllUserActivitysByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const useractivitys = await useractivityService.getAllUserActivitysByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(useractivitys);
  } catch (err) {
    next(err);
  }
};

/**
 * Get useractivity by tenant and useractivity ID
 */
exports.getUserActivityByTenantIdAndUserActivityId = async (req, res, next) => {
  const { useractivity_id, tenant_id } = req.params;

  try {
    const useractivity1 = await checkIfExists(
      "useractivity",
      "useractivity_id",
      useractivity_id,
      tenant_id
    );

    if (!useractivity1) throw new CustomError("UserActivity not found", 404);

    // Fetch useractivity details
    const useractivity = await useractivityService.getUserActivityByTenantIdAndUserActivityId(
      tenant_id,
      useractivity_id
    );
    res.status(200).json(useractivity);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing useractivity
 */
exports.updateUserActivity = async (req, res, next) => {
  const { useractivity_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await updateUserActivityValidation(useractivity_id, details);
    isEarlier()
    // Update the useractivity
    await useractivityService.updateUserActivity(useractivity_id, details, tenant_id);
    res.status(200).json({ message: "UserActivity updated successfully" });
  } catch (err) {
    next(err);
  }
};
