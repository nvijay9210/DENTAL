const clinicService = require("../services/ClinicService");
const clinicValidation = require("../validations/ClinicValidation");

exports.createClinic = async (req, res, next) => {
  const details=req.body
  try {

    await clinicValidation.createClinicValidation(details)
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
  try {
    const clinics = await clinicService.getAllClinicsByTenantId(tenant_id,page,limit);
    res.status(200).json(clinics);
  } catch (err) {
    next(err);
  }
};

exports.getClinicByTenantIdAndClinicId = async (req, res, next) => {
    const {clinic_id,tenant_id}=req.params
  try {
    await clinicValidation.checkClinicExistsByClinicIdValidation(tenant_id,clinic_id)
    const clinics = await clinicService.getClinicByTenantIdAndClinicId(tenant_id,clinic_id);
    res.status(200).json(clinics);
  } catch (err) {
    next(err);
  }
};

exports.updateClinic = async (req, res, next) => {
  const {clinic_id,tenant_id}=req.params
  const details=req.body
  try {
    await clinicValidation.updateClinicValidation(clinic_id,details,tenant_id)

    await clinicService.updateClinic(clinic_id, details,tenant_id);
    res.status(200).json({ message: "Clinic updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deleteClinicByTenantIdAndClinicId = async (req, res, next) => {
  const {clinic_id,tenant_id}=req.params
  console.log(tenant_id,clinic_id)
  try {
    await clinicValidation.checkClinicExistsByClinicIdValidation(tenant_id,clinic_id)
    
    await clinicService.deleteClinicByTenantIdAndClinicId(tenant_id,clinic_id);
    res.status(200).json({ message: "Clinic deleted successfully" });
  } catch (err) {
    next(err);
  }
};

