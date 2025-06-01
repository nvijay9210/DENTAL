const { CustomError } = require("../middlewares/CustomeError");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const treatmentService = require("../services/TreatmentService");
const treatmentValidation = require("../validations/TreatmentValidation");

/**
 * Create a new treatment
 */
exports.createTreatment = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate treatment data
    await treatmentValidation.createTreatmentValidation(details);

    // Create the treatment
    const id = await treatmentService.createTreatment(details);
    res.status(201).json({ message: "Treatment created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all treatments by tenant ID with pagination
 */
exports.getAllTreatmentsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const treatments = await treatmentService.getAllTreatmentsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(treatments);
  } catch (err) {
    next(err);
  }
};

exports.getAllTreatmentsByTenantAndClinicId = async (req, res, next) => {
  const { tenant_id,clinic_id,appointment_id } = req.params;
  const { page, limit } = req.query;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)

  const appointment = await checkIfExists(
    "appointment",
    "appointment_id",
    appointment_id,
    tenant_id
  );

  if (!appointment) throw new CustomError("Appointment not found", 404);
  try {
    const treatments =
      await treatmentService.getAllTreatmentsByTenantAndClinicId(
        tenant_id,
        clinic_id,
        appointment_id,
        page,
        limit
      );
    res.status(200).json(treatments);
  } catch (err) {
    next(err);
  }
};

exports.getAllTreatmentsByTenantAndClinicIdAndDentist= async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id,appointment_id } = req.params;
  const { page, limit } = req.query;

  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)

  const appointment = await checkIfExists(
    "appointment",
    "appointment_id",
    appointment_id,
    tenant_id
  );

  if (!appointment) throw new CustomError("Appointment not found", 404);
  try {
    const treatments =
      await treatmentService.getAllTreatmentsByTenantAndClinicIdAndDentist(
        tenant_id,
        clinic_id,
        dentist_id,
        appointment_id,
        page,
        limit
      );
    res.status(200).json(treatments);
  } catch (err) {
    next(err);
  }
};

/**
 * Get treatment by tenant and treatment ID
 */
exports.getTreatmentByTenantIdAndTreatmentId = async (req, res, next) => {
  const { treatment_id, tenant_id } = req.params;
  const treatment = await checkIfExists(
    "treatment",
    "treatment_id",
    treatment_id,
    tenant_id
  );
  if (!treatment) throw new CustomError("Treatment not found", 404);

  try {
    // Validate if treatment exists
    await treatmentValidation.checkTreatmentExistsByIdValidation(
      tenant_id,
      treatment_id
    );

    // Fetch treatment details
    const treatment =
      await treatmentService.getTreatmentByTenantIdAndTreatmentId(
        tenant_id,
        treatment_id
      );
    res.status(200).json(treatment);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing treatment
 */
exports.updateTreatment = async (req, res, next) => {
  const { treatment_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await treatmentValidation.updateTreatmentValidation(
      treatment_id,
      details,
      tenant_id
    );

    // Update the treatment
    await treatmentService.updateTreatment(treatment_id, details, tenant_id);
    res.status(200).json({ message: "Treatment updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an treatment by ID and tenant ID
 */
exports.deleteTreatmentByTenantIdAndTreatmentId = async (req, res, next) => {
  const { treatment_id, tenant_id } = req.params;

  try {
    // Validate if treatment exists
    const treatment = await checkIfExists(
      "treatment",
      "treatment_id",
      treatment_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("TreatmentId not Exists", 404);

    // Delete the treatment
    await treatmentService.deleteTreatmentByTenantIdAndTreatmentId(
      tenant_id,
      treatment_id
    );
    res.status(200).json({ message: "Treatment deleted successfully" });
  } catch (err) {
    next(err);
  }
};
