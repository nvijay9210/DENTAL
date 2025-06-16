const { CustomError } = require("../middlewares/CustomeError");
const tenantService = require("../services/TenantService");
const tenantValidation = require("../validations/TenantValidation");

exports.addTenant = async (req, res, next) => {
  try {
    await tenantValidation.createTenantValidation(req.body);
    // Create a new tenant
    const id = await tenantService.createTenant(req.body);
    res.status(201).json({ message: "Tenant created", id });
  } catch (err) {
    next(err);
  }
};

exports.getAllTenant = async (req, res, next) => {
  try {
    const tenants = await tenantService.getTenants();
    res.status(200).json(tenants);
  } catch (err) {
    next(err);
  }
};

exports.getTenantByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  try {
    await tenantValidation.checkTenantExistsByTenantIdValidation(tenant_id);
    const tenants = await tenantService.getTenantByTenantId(tenant_id);
    res.status(200).json(tenants);
  } catch (err) {
    next(err);
  }
};

exports.getTenantByTenantNameAndTenantDomain = async (req, res, next) => {
  const { tenant_name, tenant_domain } = req.params;
  let access_token = req.headers["authorization"];
  if (access_token && access_token.startsWith("Bearer ")) {
    access_token = access_token.split(" ")[1];
  }

  try {
    if (!tenant_name || !tenant_domain)
      throw new CustomError("Tenantname and domain is requried", 400);
    const tenants = await tenantService.getTenantByTenantNameAndTenantDomain(
      tenant_name,
      tenant_domain
    );
    res.cookie("access_token", access_token, {
      httpOnly: true, // Prevents JS access on client side (recommended for security)
      secure: true, // Set to true if using HTTPS
      sameSite: "strict", // Helps prevent CSRF
      maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
    });
    res.status(200).json(tenants);
  } catch (err) {
    next(err);
  }
};

exports.updateTenant = async (req, res, next) => {
  const tenantId = req.params.tenant_id;
  try {
    await tenantValidation.updateTenantValidation(tenantId, req.body);

    await tenantService.updateTenant(tenantId, req.body);
    res.status(200).json({ message: "Tenant updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deleteTenant = async (req, res, next) => {
  const tenantId = req.params.tenant_id;
  try {
    await tenantValidation.checkTenantExistsByTenantIdValidation(tenantId);

    await tenantService.deleteTenant(tenantId);
    res.status(200).json({ message: "Tenant deleted successfully" });
  } catch (err) {
    next(err);
  }
};
