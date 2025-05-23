const { CustomError } = require("../middlewares/CustomeError");
const treatmentService = require("../services/TreatmentService");
const treatmentModel = require("../models/TreatmentModel");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const treatmentColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "patient_id", type: "int", size: 11, null: false },
  { columnname: "dentist_id", type: "int", size: 11, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "diagnosis", type: "text", null: true },
  { columnname: "treatment_procedure", type: "text", null: true },
  {
    columnname: "treatment_type",
    type: "enum",
    enum_values: [
      "general",
      "cosmetic",
      "orthodontic",
      "surgical",
      "emergency",
    ],
    null: false,
  },
  {
    columnname: "treatment_status",
    type: "enum",
    enum_values: ["planned", "ongoing", "completed", "cancelled"],
    null: false,
  },
  { columnname: "treatment_date", type: "date", null: false },
  { columnname: "cost", type: "decimal", size: "10,2", null: false },
  { columnname: "duration", type: "time", size: 50, null: false },
  { columnname: "teeth_involved", type: "varchar", size: 255, null: false },
  { columnname: "complications", type: "text", null: true },
  {
    columnname: "follow_up_required",
    type: "boolean",
    null: false,
    default: false,
  },
  { columnname: "follow_up_date", type: "date", null: true },
  { columnname: "follow_up_notes", type: "text", null: true },
  {
    columnname: "anesthesia_used",
    type: "boolean",
    null: false,
    default: false,
  },
  { columnname: "anesthesia_type", type: "varchar", size: 100, null: true },
  { columnname: "technician_assisted", type: "varchar", size: 255, null: true },
  { columnname: "treatment_images", type: "text", null: true },
  { columnname: "notes", type: "text", null: true },
];

const createColumnConfig = [
  ...treatmentColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...treatmentColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

// Create Treatment Validation
const createTreatmentValidation = async (details) => {
  await validateInput(details, createColumnConfig);

  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
    checkIfIdExists("patient", "patient_id", details.patient_id),
    checkIfIdExists("dentist", "dentist_id", details.dentist_id),
  ]);
};

// Update Treatment Validation
const updateTreatmentValidation = async (treatmentId, details, tenantId) => {
  validateInput(details, updateColumnConfig);

  const treatment = await checkIfExists(
    "treatment",
    "treatment_id",
    treatmentId,
    tenantId
  );
  if (!treatment) throw new CustomError("Treatment Not Exists", 404);
};

module.exports = {
  createTreatmentValidation,
  updateTreatmentValidation,
};
