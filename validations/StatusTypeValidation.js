const { CustomError } = require("../middlewares/CustomeError");
const statusTypeService = require("../services/StatusTypeService");
const statusTypeModel = require("../models/StatusTypeModel");
const { checkTenantExistsByTenantIdValidation } = require("./TenantValidation");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const createColumnConfig = [
    { columnname: "tenant_id", type: "int", size: 11, null: false },
    { columnname: "status_type", type: "varchar",size:100, null: false },
    { columnname: "created_by", type: "varchar", size: 30, null: false },
  ];
const updateColumnConfig = [
    { columnname: "tenant_id", type: "int", size: 11, null: false },
    { columnname: "status_type", type: "varchar",size:100, null: false },
    { columnname: "updated_by", type: "varchar", size: 30, null: false },
  ];

// Create StatusType Validation
const createStatusTypeValidation = async (details) => {
   validateInput(details, createColumnConfig);

  await Promise.all([
    checkIfIdExists('tenant','tenant_id', details.tenant_id),
  ]);
};

// Update StatusType Validation
const updateStatusTypeValidation = async (
statusTypeId,details,tenantId
) => {
   validateInput(details, updateColumnConfig);

    const statusType=await checkIfExists('statusType','statusType_id',statusTypeId,tenantId)
    if(!statusType) throw new CustomError('StatusType Not Exists',404)
};

module.exports = {
  createStatusTypeValidation,
  updateStatusTypeValidation,
};
