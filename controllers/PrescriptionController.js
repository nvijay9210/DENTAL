const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists, checkIfIdExists } = require("../models/checkIfExists");
const prescriptionService = require("../services/PrescriptionService");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");
const prescriptionValidation = require("../validations/PrescriptionValidation");

/**
 * Create a new prescription
 */
exports.createPrescription = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate prescription data
    await prescriptionValidation.createPrescriptionValidation(details);

    // Create the prescription
    const id = await prescriptionService.createPrescription(details);
    res.status(201).json({ message: "Prescription created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all prescriptions by tenant ID with pagination
 */
exports.getAllPrescriptionsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const prescriptions =
      await prescriptionService.getAllPrescriptionsByTenantId(
        tenant_id,
        page,
        limit
      );
    res.status(200).json({prescriptions,total:prescriptions.length,page});
  } catch (err) {
    next(err);
  }
};

exports.getAllPrescriptionsByTenantAndClinicIdAndTreatmentId = async (req, res, next) => {
  const { tenant_id, clinic_id,treatment_id } = req.params;
  const { page, limit } = req.query;

  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  
  const treatment1 = await checkIfExists(
    "treatment",
    "treatment_id",
    treatment_id,
    tenant_id
  );

  if (!treatment1) throw new CustomError("Treatment not found", 404);
  try {
    const prescriptions =
      await prescriptionService.getAllPrescriptionsByTenantAndClinicIdAndTreatmentId(
        tenant_id,
        clinic_id,
        treatment_id,
        page,
        limit
      );
    res.status(200).json(prescriptions);
  } catch (err) {
    next(err);
  }
};

exports.getAllPrescriptionsByTenantAndClinicIdAndPatientIdAndTreatmentId = async (req, res, next) => {
  const { tenant_id, clinic_id,dentist_id,treatment_id } = req.params;
  const { page, limit } = req.query;

  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)
  
  const treatment1 = await checkIfExists(
    "treatment",
    "treatment_id",
    treatment_id,
    tenant_id
  );

  if (!treatment1) throw new CustomError("Treatment not found", 404);
  try {
    const prescriptions =
      await prescriptionService.getAllPrescriptionsByTenantAndClinicIdAndPatientIdAndTreatmentId(
        tenant_id,
        clinic_id,
        dentist_id,
        treatment_id,
        page,
        limit
      );
      res.status(200).json(prescriptions);
  } catch (err) {
    next(err);
  }
};
exports.getAllPrescriptionsByTenantIdAndDentistId = async (req, res, next) => {
  const { tenant_id, dentist_id } = req.params;
  const { page, limit } = req.query;

  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)
  
  try {
    const prescriptions =
      await prescriptionService.getAllPrescriptionsByTenantIdAndDentistId(
        tenant_id,
        dentist_id,
        page,
        limit
      );
      res.status(200).json(prescriptions);
  } catch (err) {
    next(err);
  }
};
  
exports.getAllPrescriptionsByTenantIdAndPatientId = async (req, res, next) => {
  const { tenant_id, patient_id } = req.params;
  const { page, limit } = req.query;

  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('patient','patient_id',patient_id)

  try {
    const prescriptions =
      await prescriptionService.getAllPrescriptionsByTenantIdAndPatientId(
        tenant_id,
        patient_id,
        page,
        limit
      );
      res.status(200).json(prescriptions);
  } catch (err) {
    next(err);
  }
};

/**
 * Get prescription by tenant and prescription ID
 */
exports.getPrescriptionByTenantIdAndPrescriptionId = async (req, res, next) => {
  const { prescription_id, tenant_id } = req.params;

  const prescription = await checkIfExists(
    "prescription",
    "prescription_id",
    prescription_id,
    tenant_id
  );

  if (!prescription) throw new CustomError("prescription not found", 404);

  try {

    // Fetch prescription details
    const prescription =
      await prescriptionService.getPrescriptionByTenantIdAndPrescriptionId(
        tenant_id,
        prescription_id
      );
    res.status(200).json(prescription);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing prescription
 */
exports.updatePrescription = async (req, res, next) => {
  const { prescription_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await prescriptionValidation.updatePrescriptionValidation(
      prescription_id,
      details
    );

    // Update the prescription
    await prescriptionService.updatePrescription(
      prescription_id,
      details,
      tenant_id
    );
    res.status(200).json({ message: "Prescription updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a prescription by ID and tenant ID
 */
exports.deletePrescriptionByTenantIdAndPrescriptionId = async (
  req,
  res,
  next
) => {
  const { prescription_id, tenant_id } = req.params;

  try {
    // Validate if prescription exists
    const prescription = await checkIfExists(
      "prescription",
      "prescription_id",
      prescription_id,
      tenant_id
    );

    if (!prescription) throw new CustomError("prescription not found", 404);

    // Delete the prescription
    await prescriptionService.deletePrescriptionByTenantIdAndPrescriptionId(
      tenant_id,
      prescription_id
    );
    res.status(200).json({ message: "Prescription deleted successfully" });
  } catch (err) {
    next(err);
  }
};
