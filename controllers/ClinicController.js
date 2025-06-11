const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists, checkIfIdExists } = require("../models/checkIfExists");
const clinicService = require("../services/ClinicService");
const clinicValidation = require("../validations/ClinicValidation");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");

exports.createClinic = async (req, res, next) => {
  const details = req.body;

  try {
    await clinicValidation.createClinicValidation(details);
    // Create a new clinic
    const id = await clinicService.createClinic(details);
    res.status(200).json({ message: "Clinic created", id });
  } catch (err) {
    next(err);
  }
};

exports.getAllClinicByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const clinics = await clinicService.getAllClinicsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(clinics);
  } catch (err) {
    next(err); 
  }
};

exports.getFinanceSummary = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  try {
    const clinics = await clinicService.getFinanceSummary(
      tenant_id, clinic_id
    );
    res.status(200).json(clinics);
  } catch (err) {
    next(err);
  }
};

exports.getFinanceSummarybyDentist = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)
  try {
    const clinics = await clinicService.getFinanceSummarybyDentist(
      tenant_id, clinic_id,dentist_id
    );
    res.status(200).json(clinics);
  } catch (err) {
    next(err);
  }
};

exports.getClinicByTenantIdAndClinicId = async (req, res, next) => {
  const { clinic_id, tenant_id } = req.params;
  try {
    await checkIfExists('tenant','tenant_id',tenant_id)
    // const clinic = await checkIfExists(
    //   "clinic",
    //   "clinic_id",
    //   clinic_id,
    //   tenant_id
    // );
    // if (clinic) throw new CustomError("Clinic not exists", 404);
    const clinics = await clinicService.getClinicByTenantIdAndClinicId(
      tenant_id,
      clinic_id
    );
    res.status(200).json(clinics);
  } catch (err) {
    next(err);
  }
};

exports.updateClinic = async (req, res, next) => {
  const { clinic_id, tenant_id } = req.params;
  const details = req.body;

  try {
    await clinicValidation.updateClinicValidation(
      clinic_id,
      details,
      tenant_id
    );

    await clinicService.updateClinic(clinic_id, details, tenant_id);
    res.status(200).json({ message: "Clinic updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deleteClinicByTenantIdAndClinicId = async (req, res, next) => {
  const { clinic_id, tenant_id } = req.params;

  try {
    const clinic = await checkIfExists(
      "clinic",
      "clinic_id",
      clinic_id,
      tenant_id
    );
    if (!clinic) throw new CustomError("ClinicId not Exists", 404);

    await clinicService.deleteClinicByTenantIdAndClinicId(tenant_id, clinic_id);
    res.status(200).json({ message: "Clinic deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.handleClinicAssignment = async (req, res, next) => {
  const { clinic_id, tenant_id } = req.params;
  const { assign } = req.query;
  const details = req.body;

  try {
    await clinicValidation.handleClinicAssignmentValidation(
      tenant_id,
      clinic_id,
      details,
      assign
    );

    const result = await clinicService.handleClinicAssignment(
      tenant_id,
      clinic_id,
      details,
      assign
    );
    res.status(200).send({
      success: true,
      message: result,
    });
  } catch (err) {
    next(err);
  }
};
