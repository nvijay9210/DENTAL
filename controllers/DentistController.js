const dentistService = require("../services/DentistService");
const dentistValidation = require("../validations/DentistValidation");

exports.createDentist = async (req, res, next) => {
  const details = req.body;
  // console.log(details)
  try {
    // Validate dentist data
    await dentistValidation.createDentistValidation(details);

    // Create a new dentist
    const id = await dentistService.createDentist(details);
    res.status(200).json({ message: "Dentist created", id });
  } catch (err) {
    next(err);
  }
};

exports.getAllDentistsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  // console.log(tenant_id,page,limit)
  try {
    const dentists = await dentistService.getAllDentistsByTenantId(tenant_id, page, limit);
    res.status(200).json(dentists);
  } catch (err) {
    next(err);
  }
};

exports.getDentistByTenantIdAndDentistId = async (req, res, next) => {
  const { dentist_id, tenant_id } = req.params;
  try {
    // Validate if the dentist exists
    await dentistValidation.checkDentistExistsByIdValidation(tenant_id, dentist_id);

    // Fetch dentist details
    const dentist = await dentistService.getDentistByTenantIdAndDentistId(tenant_id, dentist_id);
    res.status(200).json(dentist);
  } catch (err) {
    next(err);
  }
};

exports.updateDentist = async (req, res, next) => {
  const {dentist_id,tenant_id} = req.params;
  const details = req.body;
  try {
    // Validate update input
    await dentistValidation.updateDentistValidation(dentist_id, details,tenant_id);

    // Update dentist
    await dentistService.updateDentist(dentist_id, details,tenant_id);
    res.status(200).json({ message: "Dentist updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deleteDentistByTenantIdAndDentistId = async (req, res, next) => {
  const { dentist_id, tenant_id } = req.params;
  try {
    // Validate if dentist exists
    await dentistValidation.checkDentistExistsByDentistIdValidation(tenant_id, dentist_id);

    // Delete dentist
    await dentistService.deleteDentistByTenantIdAndDentistId(tenant_id, dentist_id);
    res.status(200).json({ message: "Dentist deleted successfully" });
  } catch (err) {
    next(err);
  }
};
