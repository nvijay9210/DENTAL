const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const useractivityService = require("../services/UserActivityService");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");

/**
 * Create a new useractivity
 */
exports.createUserActivity = async (req, res, next) => {
  const details = req.body;

  try {
    // Create the useractivity
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
    await useractivityValidation.updateUserActivityValidation(useractivity_id, details);

    // Update the useractivity
    await useractivityService.updateUserActivity(useractivity_id, details, tenant_id);
    res.status(200).json({ message: "UserActivity updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a useractivity by ID and tenant ID
 */
exports.deleteUserActivityByTenantIdAndUserActivityId = async (req, res, next) => {
  const { useractivity_id, tenant_id } = req.params;

  try {
    // Validate if useractivity exists
    const treatment = await checkIfExists(
      "useractivity",
      "useractivity_id",
      useractivity_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("useractivityId not Exists", 404);

    // Delete the useractivity
    await useractivityService.deleteUserActivityByTenantIdAndUserActivityId(
      tenant_id,
      useractivity_id
    );
    res.status(200).json({ message: "UserActivity deleted successfully" });
  } catch (err) {
    next(err);
  }
};
