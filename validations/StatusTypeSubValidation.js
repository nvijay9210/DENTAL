const { CustomError } = require("../middlewares/CustomeError");
const statusTypeSubService = require("../services/StatusTypeSubService");
const statusTypeSubModel = require("../models/StatusTypeSubModel");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");
const {
  checkIfIdExists,
  checkIfExists,
  checkIfExistsWithoutId,
} = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const createColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "status_type_sub", type: "varchar", size: 100, null: false },
  {
    columnname: "status_type_sub_ref",
    type: "varchar",
    size: 100,
    null: false,
  },
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];
const updateColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "status_type_sub", type: "varchar", size: 100, null: false },
  {
    columnname: "status_type_sub_ref",
    type: "varchar",
    size: 100,
    null: false,
  },
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

// Create StatusTypeSub Validation
const createStatusTypeSubValidation = async (details) => {
  console.log('details:',details)
  validateInput(details, createColumnConfig);

  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
  ]);

  const statusTypeSub =
    await statusTypeSubModel.checkStatusTypeSubRefExistsByStatusTypeIdAndStatusTypeSubAndStatusTypeSubRefAndTenantId(
      details.tenant_id,
      details.status_type_id,
      details.status_type_sub,
      details.status_type_sub_ref
    );
  if (statusTypeSub)
    throw new CustomError("StatusTypeSubject Already Exists", 404);
};

// Update StatusTypeSub Validation
const updateStatusTypeSubValidation = async (
  statusTypeSubId,
  details,
  tenantId
) => {
  validateInput(details, updateColumnConfig);

  const idExists=await checkIfExists('statustypesub','status_type_sub_id',statusTypeSubId,tenantId)

  if(!idExists) throw new CustomError('statusTypeSubId not exists')
  
    const statusTypeSubExists=await statusTypeSubModel.checkStatusTypeSubExistsByStatusTypeIdAndStatusTypeSubAndTenantId(tenantId,details.status_type_id,details.status_type_sub)
    if(statusTypeSubExists) throw new CustomError('statusTypeSubject Already exists',409)

  const statusTypeSubRefExists =
    await statusTypeSubModel.checkStatusTypeSubRefExistsByStatusTypeSubIdAndStatusTypeSubAndStatusTypeSubRefAndTenantId(
      tenantId,
      statusTypeSubId,
      details.status_type_sub,
      details.status_type_sub_ref
    );
  if (statusTypeSubRefExists) throw new CustomError("StatusTypeReference Already Exists", 409);
};

module.exports = {
  createStatusTypeSubValidation,
  updateStatusTypeSubValidation,
};
