const { CustomError } = require("../middlewares/CustomeError");
const tenantService = require("../services/TenantService");
const { validateInput } = require("./InputValidation");

const createColumnConfig = [
  { columnname: "tenant_name", type: "varchar", size: 50, null: false },
  { columnname: "tenant_domain", type: "varchar", size: 255, null: false },
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  { columnname: "tenant_name", type: "varchar", size: 50, null: false },
  { columnname: "tenant_domain", type: "varchar", size: 255, null: false },
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

const createTenantValidation = async (details) => {
  await validateInput(details, createColumnConfig);
  const tenant =
    await tenantService.checkTenantExistsByTenantnameAndTenantdomain(
      details.tenant_name,
      details.tenant_domain
    );
  if (tenant) throw new CustomError("Tenant Already Exists", 409);
};

const checkTenantExistsByTenantIdValidation = async (tenantId) => {
  const tenant = await tenantService.checkTenantExistsByTenantId(tenantId);
  if (!tenant) throw new CustomError("Tenant Not Found", 400);
};

const updateTenantValidation = async (tenantId, details) => {
  await validateInput(details, updateColumnConfig);
  await checkTenantExistsByTenantIdValidation(tenantId);
  await createTenantValidation(details);
};

module.exports = {
  createTenantValidation,
  checkTenantExistsByTenantIdValidation,
  updateTenantValidation,
};
