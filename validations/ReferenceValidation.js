const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");

const referenceColumnConfig = [
    { columnname: "tenant_id", type: "bigint", size: null, null: false },
    { columnname: "clinic_id", type: "bigint", size: null, null: false },
    { columnname: "sender_name", type: "varchar", size: 255, null: false },
    { columnname: "receiver_name", type: "varchar", size: 255, null: false },
    { columnname: "sender_keycloak_id", type: "varchar", size: 255, null: false },
    { columnname: "receiver_phone", type: "varchar", size: 30, null: false },
    { columnname: "reference_message", type: "text", size: null, null: false }
  ];
  
// Reference Column Configuration for Validation
const createColumnConfig = [
  ...referenceColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...referenceColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

/**
 * Validate Create Reference Input with Tenant Scope
 */
const createReferenceValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfExists("clinic", "clinic_id", details.clinic_id, details.tenant_id),
    checkIfExists("dentist", "dentist_id", details.dentist_id, details.tenant_id),
    checkIfExists("patient", "patient_id", details.patient_id, details.tenant_id),
  ]);
};

/**
 * Validate Update Reference Input with Tenant Scope
 */
const updateReferenceValidation = async (referenceId, details) => {
  
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "reference",
    "reference_id",
    referenceId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Reference not found", 404);
  }
};

module.exports = {
  createReferenceValidation,
  updateReferenceValidation,
};
