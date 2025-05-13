const { checkIfExists } = require("../models/checkIfExists");
const prescriptionService = require("../services/PrescriptionService");
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
  try {
    const prescriptions = await prescriptionService.getAllPrescriptionsByTenantId(tenant_id, page, limit);
    res.status(200).json(prescriptions);
  } catch (err) {
    next(err);
  }
};

exports.getAllPrescriptionsByTenantAndPatientId = async (req, res, next) => {
  const { tenant_id,patient_id } = req.params;
  const { page, limit } = req.query;
  try {
    const prescriptions = await prescriptionService.getAllPrescriptionsByTenantAndPatientId(tenant_id,patient_id, page, limit);
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

  try {
    // Validate if prescription exists
    await prescriptionValidation.checkPrescriptionExistsByIdValidation(tenant_id, prescription_id);

    // Fetch prescription details
    const prescription = await prescriptionService.getPrescriptionByTenantIdAndPrescriptionId(
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
  const { prescription_id,tenant_id } = req.params;
  const details = req.body;

  try {
  
    // Validate update input
    await prescriptionValidation.updatePrescriptionValidation(prescription_id, details);

    // Update the prescription
    await prescriptionService.updatePrescription(prescription_id, details, tenant_id);
    res.status(200).json({ message: "Prescription updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a prescription by ID and tenant ID
 */
exports.deletePrescriptionByTenantIdAndPrescriptionId = async (req, res, next) => {
  const { prescription_id, tenant_id } = req.params;

  try {
    // Validate if prescription exists
    const treatment=await checkIfExists('prescription','prescription_id',prescription_id,tenant_id);
    if(!treatment) throw new CustomError('prescriptionId not Exists',404)

    // Delete the prescription
    await prescriptionService.deletePrescriptionByTenantIdAndPrescriptionId(tenant_id, prescription_id);
    res.status(200).json({ message: "Prescription deleted successfully" });
  } catch (err) {
    next(err);
  }
};