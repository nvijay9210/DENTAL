const { CustomError } = require("../middlewares/CustomeError");
const tenantModel = require("../models/TenantModel");
const { validateInput } = require("./InputValidation");

const tenantColumnConfig = [
  { columnname: "tenant_name", type: "varchar", size: 50, null: false },
  { columnname: "tenant_domain", type: "varchar", size: 255, null: false },
  { columnname: "tenant_app_name", type: "varchar", size: 100, null: true },
  { columnname: "tenant_app_logo", type: "varchar", size: 255, null: true },
  { columnname: "tenant_app_themes", type: "varchar",size: 50, null: true },
  { columnname: "tenant_app_font", type: "varchar", size: 255, null: true },
];
const createColumnConfig = [
  ...tenantColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...tenantColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

const createTenantValidation = async (details) => {
  validateInput(details, createColumnConfig);
  const tenant = await tenantModel.checkTenantExistsByTenantnameAndTenantdomain(
    details.tenant_name,
    details.tenant_domain
  );
  if (tenant) throw new CustomError("Tenant Already Exists", 409);
};

const checkTenantExistsByTenantIdValidation = async (tenantId) => {
  const tenant = await tenantModel.checkTenantExistsByTenantId(tenantId);
  if (!tenant) throw new CustomError("Tenant Not Found", 400);
};

const updateTenantValidation = async (tenantId, details) => {
  validateInput(details, updateColumnConfig);
  await checkTenantExistsByTenantIdValidation(tenantId);
};

module.exports = {
  createTenantValidation,
  checkTenantExistsByTenantIdValidation,
  updateTenantValidation,
};
