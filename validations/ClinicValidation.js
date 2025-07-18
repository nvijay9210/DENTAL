const { CustomError } = require("../middlewares/CustomeError");
const clinicService = require("../services/ClinicService");
const {
  checkIfExists,
  checkIfExistsWithoutId,
  checkIfIdExists,
} = require("../models/checkIfExists");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");
const { recordExists } = require("../query/Records");
const {
  checkDentistExistsUsingTenantIdAndClinicIdAnddentistId,
} = require("../models/DentistModel");
const { checkPhoneConflicts } = require("../utils/PhonenumbersValidation");
const { checkEmailConflicts } = require("../utils/EmailValidation");

const uniqueFields = ["email", "gst_number", "license_number", "pan_number"];

// Helpers
const validateTenant = async (tenantId) => {
  await checkTenantExistsByTenantIdValidation(tenantId);
};

const validateClinicPhones = async (data, clinicId = 0) => {
  const tenantId = data.tenant_id;

  if (
    data.alternate_phone_number &&
    data.phone_number === data.alternate_phone_number
  ) {
    throw new CustomError("Phone and alternate phone cannot be the same", 409);
  }
};

const validateUniqueFields = async (
  details,
  isUpdate = false,
  clinicId = 0
) => {
  for (const field of uniqueFields) {
    if (!details[field]) continue;
    const exists = isUpdate
      ? await checkIfExistsWithoutId(
          "clinic",
          field,
          details[field],
          "clinic_id",
          clinicId,
          details.tenant_id
        )
      : await checkIfExists("clinic", field, details[field], details.tenant_id);
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

const clinicColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  {
    columnname: "clinic_name",
    type: "varchar",
    size: 255,
    null: false,
    pattern: /^[a-zA-Z\s]{2,50}$/,
  },
  {
    columnname: "email",
    type: "varchar",
    size: 255,
    null: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  {
    columnname: "phone_number",
    type: "varchar",
    size: 20,
    null: false,
    pattern: /^\+?[0-9]{7,15}$/,
  },
  {
    columnname: "alternate_phone_number",
    type: "varchar",
    size: 20,
    null: true,
    pattern: /^\+?[0-9]{7,15}$/,
  },
  { columnname: "branch", type: "varchar", size: 50, null: true },
  {
    columnname: "website",
    type: "varchar",
    size: 255,
    null: true,
    pattern: /^(https?:\/\/)?([\w\-]+\.)+[\w]{2,}\/?$/,
  },
  { columnname: "address", type: "text", null: false },
  { columnname: "city", type: "varchar", size: 100, null: false },
  { columnname: "state", type: "varchar", size: 100, null: false },
  { columnname: "country", type: "varchar", size: 50, null: false },
  {
    columnname: "pin_code",
    type: "varchar",
    size: 10,
    null: false,
    pattern: /^\d{6}$/,
  },
  {
    columnname: "license_number",
    type: "varchar",
    size: 10,
    null: false,
    // pattern: /^[A-Z]{2}[0-9]{4}[A-Z]{2}[0-9]{2}$/ // For Standard Pattern not found
  },
  {
    columnname: "currency_code",
    type: "varchar",
    size: 10,
    null: true,
  },
  {
    columnname: "gst_number",
    type: "varchar",
    size: 15,
    null: true,
    pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  },
  {
    columnname: "pan_number",
    type: "varchar",
    size: 10,
    null: true,
    pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  },
  { columnname: "established_year", type: "int", size: 11, null: false },
  { columnname: "total_doctors", type: "int", size: 4, null: true },
  { columnname: "total_patients", type: "int", size: 11, null: true },
  { columnname: "seating_capacity", type: "int", size: 4, null: true },
  { columnname: "number_of_assistants", type: "int", size: 11, null: true },
  {
    columnname: "available_services",
    type: "longtext",
    null: false,
    data_type: "json",
  },
  {
    columnname: "operating_hours",
    type: "longtext",
    null: true,
    data_type: "json",
  },
  {
    columnname: "insurance_supported",
    type: "tinyint",
    null: false,
    is_boolean: true,
  },
  { columnname: "ratings", type: "decimal", size: "3,2", null: true },
  { columnname: "reviews_count", type: "int", size: 11, null: true },
  {
    columnname: "emergency_support",
    type: "tinyint",
    null: false,
    is_boolean: true,
  },
  {
    columnname: "teleconsultation_supported",
    type: "tinyint",
    null: false,
    is_boolean: true,
  },
  { columnname: "clinic_logo", type: "varchar", size: 255, null: true },
  {
    columnname: "parking_availability",
    type: "tinyint",
    null: false,
    is_boolean: true,
  },
  { columnname: "pharmacy", type: "tinyint", null: true, is_boolean: true },
  { columnname: "wifi", type: "tinyint", null: false, is_boolean: true },
  { columnname: "clinic_app_font", type: "varchar", size: 100, null: true },
  { columnname: "clinic_app_themes", type: "varchar", size: 50, null: true },
];

const createClinicColumnConfig = [
  ...clinicColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateClinicColumnConfig = [
  ...clinicColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

// Main validations
const createClinicValidation = async (details) => {
  validateInput(details, createClinicColumnConfig);
  await validateTenant(details.tenant_id);
  await checkPhoneConflicts(
    details.phone_number,
    details.alternate_phone_number || null
  );
  await checkEmailConflicts(details.email);
};

const updateClinicValidation = async (clinicId, details, tenantId) => {
  await checkIfExists("tenant", "tenant_id", tenantId);
  await checkIfExists("clinic", "clinic_id", clinicId);
  if (!clinicId) throw new CustomError("Clinic ID is required", 400);
  validateInput(details, updateClinicColumnConfig);
  await validateTenant(tenantId);

  await checkPhoneConflicts(
    details.phone_number,
    details.alternate_phone_number || null,
    "clinic",
    clinicId
  );

  await checkEmailConflicts(details.email, 'clinic', clinicId);


  const clinic = await recordExists("clinic", {
    tenant_id: tenantId,
    clinic_id: clinicId,
  });
  if (!clinic) throw new CustomError("Clinic ID not found", 404);

  validatePhonesNotSame(details);
  await validateClinicPhones(details, clinicId);

  await validateUniqueFields(details, true, clinicId);
};

const handleClinicAssignmentValidation = async (
  tenantId,
  clinicId,
  details,
  assign
) => {
  // Validate required fields
  if (!tenantId) throw new CustomError("tenantId is required", 400);
  if (!clinicId) throw new CustomError("clinicId is required", 400);
  if (
    !details?.dentist_id ||
    !Array.isArray(details.dentist_id) ||
    details.dentist_id.length === 0
  ) {
    throw new CustomError("At least one dentistId is required", 400);
  }
  if (assign === undefined || assign === null)
    throw new CustomError("assign is required", 400);

  // Normalize assign to boolean
  const isAssignTrue = String(assign).toLowerCase() === "true";

  // Check if tenant, clinic, and all dentists exist
  const existenceChecks = [
    checkIfExists("tenant", "tenant_id", tenantId),
    checkIfExists("clinic", "clinic_id", clinicId),
    ...details.dentist_id.map((id) =>
      checkIfExists("dentist", "dentist_id", id)
    ),
  ];

  await Promise.all(existenceChecks);

  // If assigning, ensure dentist is NOT already assigned to this clinic
  if (isAssignTrue) {
    for (const id of details.dentist_id) {
      const exists =
        await checkDentistExistsUsingTenantIdAndClinicIdAnddentistId(
          id,
          tenantId,
          clinicId
        );
      if (exists) {
        throw new CustomError("Dentist Already Exists In This Clinic", 400);
      }
    }
  }
};

const checkClinicExistsByClinicIdValidation = async (tenantId, clinicId) => {
  await validateTenant(tenantId);
  const clinic = await clinicService.checkClinicExistsByTenantIdAndClinicId(
    tenantId,
    clinicId
  );
  if (!clinic) throw new CustomError("Clinic not found", 409);
};

const updateClinicSettingsValidation = async (tenantId, clinicId, details) => {
  await checkIfIdExists("tenant", "tenant_id", tenantId);
  await checkIfIdExists("clinic", "clinic_id", clinicId);
  if (!details.updated_by) throw new CustomError("Updated_by is required");
  if (
    details.clinic_name === undefined ||
    details.clinic_logo === undefined ||
    details.clinic_app_themes === undefined ||
    details.clinic_app_font === undefined
  )
    throw new CustomError(
      "Clinicname,cliniclogo,clinicthemes,clinicfont is required",
      400
    );
};

module.exports = {
  createClinicValidation,
  updateClinicValidation,
  checkClinicExistsByClinicIdValidation,
  handleClinicAssignmentValidation,
  updateClinicSettingsValidation,
};
