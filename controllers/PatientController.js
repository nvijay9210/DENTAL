const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const patientService = require("../services/PatientService");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const patientValidation = require("../validations/PatientValidation");

exports.createPatient = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate patient data
    await patientValidation.createPatientValidation(details);

    // Create a new patient
    const id = await patientService.createPatient(details);
    res.status(200).json({ message: "Patient created", id });
  } catch (err) {
    next(err);
  }
};

exports.getAllPatientsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const patients = await patientService.getAllPatientsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(patients);
  } catch (err) {
    next(err);
  }
};

exports.getPatientByTenantIdAndPatientId = async (req, res, next) => {
  const { patient_id, tenant_id } = req.params;
  try {
    // Validate if the patient exists
    const patient1 = await checkIfExists(
      "patient",
      "patient_id",
      patient_id,
      tenant_id
    );

    if (!patient1) throw new CustomError("Patient not found", 404);

    // Fetch patient details
    const patient = await patientService.getPatientByTenantIdAndPatientId(
      tenant_id,
      patient_id
    );
    res.status(200).json(patient);
  } catch (err) {
    next(err);
  }
};

exports.updatePatient = async (req, res, next) => {
  const { patient_id, tenant_id } = req.params;
  const details = req.body;
  try {
    // Validate update input
    await patientValidation.updatePatientValidation(
      patient_id,
      details,
      tenant_id
    );

    // Update patient
    await patientService.updatePatient(patient_id, details, tenant_id);
    res.status(200).json({ message: "Patient updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.updateToothDetails = async (req, res, next) => {
  const { patient_id, tenant_id } = req.params;
  const details = req.body;
  console.log("details:", details);
  try {
    const patient = await checkIfExists(
      "patient",
      "patient_id",
      patient_id,
      tenant_id
    );

    if (!patient) throw new CustomError("Patient not found", 404);

    // Update patient
    await patientService.updateToothDetails(details, patient_id, tenant_id);
    res.status(200).json({ message: "Patient updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deletePatientByTenantIdAndPatientId = async (req, res, next) => {
  const { patient_id, tenant_id } = req.params;
  try {
    const patient = await checkIfExists(
      "patient",
      "patient_id",
      patient_id,
      tenant_id
    );

    if (!patient) throw new CustomError("Patient not found", 404);

    // Delete patient
    await patientService.deletePatientByTenantIdAndPatientId(
      tenant_id,
      patient_id
    );
    res.status(200).json({ message: "Patient deleted successfully" });
  } catch (err) {
    next(err);
  }
};
