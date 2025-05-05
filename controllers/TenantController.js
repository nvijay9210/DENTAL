const tenantService = require("../services/TenantService");
const tenantValidation = require("../validations/TenantValidation");

exports.addTenant = async (req, res, next) => {
  try {

    await tenantValidation.createTenantValidation(req.body)
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
    const {tenant_id}=req.params
  try {
    await tenantValidation.checkTenantExistsByTenantIdValidation(tenant_id)
    const tenants = await tenantService.getTenantByTenantId(tenant_id);
    res.status(200).json(tenants);
  } catch (err) {
    next(err);
  }
};

exports.updateTenant = async (req, res, next) => {
  const tenantId=req.params.tenant_id
  try {

    await tenantValidation.updateTenantValidation(tenantId,req.body)

    await tenantService.updateTenant(tenantId, req.body);
    res.status(200).json({ message: "Tenant updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deleteTenant = async (req, res, next) => {
  const tenantId=req.params.tenant_id
  try {
    await tenantValidation.checkTenantExistsByTenantIdValidation(tenantId)
    
    await tenantService.deleteTenant(tenantId);
    res.status(200).json({ message: "Tenant deleted successfully" });
  } catch (err) {
    next(err);
  }
};

