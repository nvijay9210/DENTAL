const { CustomError } = require("../middlewares/CustomeError");
const clinicService = require("../services/ClinicService");
const {
  checkPhoneNumberExists,
  checkPhoneNumberExistsWithId,
  checkIfExists,
  checkIfExistsWithoutId,
} = require("../models/checkIfExists");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");
const { recordExists } = require("../query/Records");

const uniqueFields = ["email", "gst_number", "license_number", "pan_number"];

// Helpers
const validateTenant = async (tenantId) => {
  await checkTenantExistsByTenantIdValidation(tenantId);
};

const validateClinicPhones = async (data, clinicId = 0) => {
  const checker = clinicId > 0 ? checkPhoneNumberExistsWithId : checkPhoneNumberExists;
  await checker("clinic", data.phone_number, "Phone Number", clinicId);
  if (data.alternate_phone_number) {
    await checker("clinic", data.alternate_phone_number, "Alternate Phone Number", clinicId);
  }
};

const validateUniqueFields = async (details, isUpdate = false, clinicId = 0) => {
  for (const field of uniqueFields) {
    if (!details[field]) continue;
    const exists = isUpdate
      ? await checkIfExistsWithoutId("clinic", field, details[field],clinicId,details.tenant_id)
      : await checkIfExists("clinic", field, details[field],details.tenant_id);
    if (exists) throw new CustomError(`${field} already exists`, 409);
  }
};

const validatePhonesNotSame = (details) => {
  if (
    details.alternate_phone_number &&
    Number(details.phone_number) === Number(details.alternate_phone_number)
  ) {
    throw new CustomError(
      "Phone number and alternate phone number cannot be the same",
      409
    );
  }
};

// Main validations
const createClinicValidation = async (details) => {
  validateInput(details, require("../configs/ClinicCreateConfig"));
  await validateTenant(details.tenant_id);
  await validateClinicPhones(details);
  await validateUniqueFields(details);
};

const updateClinicValidation = async (clinicId, details, tenantId) => {
  if (!clinicId) throw new CustomError("Clinic ID is required", 400);
  validateInput(details, require("../configs/ClinicUpdateConfig"));
  await validateTenant(tenantId);

  const clinic = await recordExists("clinic", { tenant_id: tenantId, clinic_id: clinicId });
  if (!clinic) throw new CustomError("Clinic ID not found", 404);

  validatePhonesNotSame(details);
  await validateClinicPhones(details, clinicId);
  await validateUniqueFields(details, true, clinicId);
};

const checkClinicExistsByClinicIdValidation = async (tenantId, clinicId) => {
  await validateTenant(tenantId);
  const clinic = await clinicService.checkClinicExistsByTenantIdAndClinicId(tenantId, clinicId);
  if (!clinic) throw new CustomError("Clinic not found", 409);
};

module.exports = {
  createClinicValidation,
  updateClinicValidation,
  checkClinicExistsByClinicIdValidation,
};
