const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const toothdetailsService = require("../services/ToothDetailsService");
const { isValidDate } = require("../utils/DateUtils");
const toothdetailsValidation = require("../validations/ToothDetailsValidation");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");

/**
 * Create a new toothdetails
 */
exports.createToothDetails = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate toothdetails data
    await toothdetailsValidation.createToothDetailsValidation(details);

    // Create the toothdetails
    const id = await toothdetailsService.createToothDetails(details);
    res.status(201).json({ message: "ToothDetails created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all toothdetailss by tenant ID with pagination
 */
exports.getAllToothDetailssByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  try {
    await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
    const toothdetailss =
      await toothdetailsService.getAllToothDetailssByTenantId(
        tenant_id,
        page,
        limit
      );
    res.status(200).json(toothdetailss);
  } catch (err) {
    next(err);
  }
};

exports.getAllToothDetailsByTenantAndClinicAndDentistAndPatientId = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id, dentist_id, patient_id } = req.params;
  const { page, limit } = req.query;
  try {
    await validateTenantIdAndPageAndLimit(
      tenant_id,
      page,
      limit
    );
    const toothdetailss =
      await toothdetailsService.getAllToothDetailsByTenantAndClinicAndDentistAndPatientId(
        tenant_id,
        clinic_id,
        dentist_id,
        patient_id,
        page,
        limit
      );
    res.status(200).json(toothdetailss);
  } catch (err) {
    next(err);
  }
};

exports.getAllToothDetailsByTenantAndClinicAndPatientId = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id, patient_id } = req.params;
  const { page, limit } = req.query;
  try {
    await validateTenantIdAndPageAndLimit(
      tenant_id,
      page,
      limit
    );
    const toothdetailss =
      await toothdetailsService.getAllToothDetailsByTenantAndClinicAndPatientId(
        tenant_id,
        clinic_id,
        patient_id,
        page,
        limit
      );
    res.status(200).json(toothdetailss);
  } catch (err) {
    next(err);
  }
};

/**
 * Get toothdetails by tenant and toothdetails ID
 */
exports.getToothDetailsByTenantIdAndToothDetailsId = async (req, res, next) => {
  const { toothdetails_id, tenant_id } = req.params;

  try {
    const toothdetails1 = await checkIfExists(
      "toothdetails",
      "toothdetails_id",
      toothdetails_id,
      tenant_id
    );
    if (!toothdetails1) throw new CustomError("ToothDetails not found", 404);

    // Fetch toothdetails details
    const toothdetails =
      await toothdetailsService.getToothDetailsByTenantIdAndToothDetailsId(
        tenant_id,
        toothdetails_id
      );
    res.status(200).json(toothdetails);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing toothdetails
 */
exports.updateToothDetails = async (req, res, next) => {
  const { toothdetails_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await toothdetailsValidation.updateToothDetailsValidation(
      toothdetails_id,
      details
    );

    // Update the toothdetails
    await toothdetailsService.updateToothDetails(
      toothdetails_id,
      details,
      tenant_id
    );
    res.status(200).json({ message: "ToothDetails updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a toothdetails by ID and tenant ID
 */
exports.deleteToothDetailsByTenantIdAndToothDetailsId = async (
  req,
  res,
  next
) => {
  const { toothdetails_id, tenant_id } = req.params;

  try {
    // Validate if toothdetails exists
    const toothdetails1 = await checkIfExists(
      "toothdetails",
      "toothdetails_id",
      toothdetails_id,
      tenant_id
    );
    if (!toothdetails1) throw new CustomError("ToothDetails not found", 404);

    // Delete the toothdetails
    await toothdetailsService.deleteToothDetailsByTenantIdAndToothDetailsId(
      tenant_id,
      toothdetails_id
    );
    res.status(200).json({ message: "ToothDetails deleted successfully" });
  } catch (err) {
    next(err);
  }
};
