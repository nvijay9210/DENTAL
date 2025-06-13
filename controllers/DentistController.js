// src/controllers/DentistController.js
const dentistService = require("../services/DentistService");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const dentistValidation = require("../validations/DentistValidation");

exports.createDentist = async (req, res, next) => {
  const details = req.body;
  const token=req.token;
  const realm=req.tenant_name;
  const client=req.client
  try {
    await dentistValidation.createDentistValidation(details);

    // Create a new dentist
    const id = await dentistService.createDentist(details,token,realm,client);
    res.status(200).json({ message: "Dentist created", id });
  } catch (err) {
    next(err);
  }
};

exports.getAllDentistsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const dentists = await dentistService.getAllDentistsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(dentists);
  } catch (err) {
    next(err);
  }
};

exports.getDentistByTenantIdAndDentistId = async (req, res, next) => {
  const { dentist_id, tenant_id } = req.params;
  try {
    await dentistValidation.checkDentistExistsByDentistIdValidation(
      tenant_id,
      dentist_id
    );

    const dentist = await dentistService.getDentistByTenantIdAndDentistId(
      tenant_id,
      dentist_id
    );
    res.status(200).json(dentist);
  } catch (err) {
    next(err);
  }
};

exports.updateDentist = async (req, res, next) => {
  const { dentist_id, tenant_id } = req.params;
  const details = req.body;

  try {
    await dentistValidation.updateDentistValidation(
      dentist_id,
      details,
      tenant_id
    );

    await dentistService.updateDentist(dentist_id, details, tenant_id);
    res.status(200).json({ message: "Dentist updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deleteDentistByTenantIdAndDentistId = async (req, res, next) => {
  const { dentist_id, tenant_id } = req.params;

  try {
    await dentistValidation.checkDentistExistsByDentistIdValidation(
      tenant_id,
      dentist_id
    );

    await dentistService.deleteDentistByTenantIdAndDentistId(
      tenant_id,
      dentist_id
    );
    res.status(200).json({ message: "Dentist deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getAllDentistByTenantIdAndClientId = async (req, res, next) => {
  const { tenant_id, clinic_id } = req.params;
  const { page, limit } = req.query;

  try {
    const dentists = await dentistService.getAllDentistsByTenantIdAndClinicId(
      tenant_id,
      clinic_id,
      page,
      limit
    );
    res.status(200).json(dentists);
  } catch (err) {
    next(err);
  }
};
