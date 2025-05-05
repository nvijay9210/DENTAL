const tenantModel = require("../models/TenantModel");

// Create tenant service (calls the model function)
const createTenant = async (data) => {
  try {
    const utcNow = new Date().toISOString().replace('T', ' ').slice(0, 19);
    data['created_time']=utcNow
    const tenantId = await tenantModel.createTenant(data); // Call model function to insert tenant
    return tenantId;
  } catch (error) {
    throw new Error("Failed to create tenant: " + error.message);
  }
};

// Get all tenants service
const getTenants = async () => {
  try {
    const tenants = await tenantModel.getAllTenant(); // Call model function to get tenants
    return tenants;
  } catch (error) {
    throw new Error("Failed to get tenants: " + error.message);
  }
};

// Get tenant service
const getTenantByTenantId = async (tenantId) => {
  try {
    const tenants = await tenantModel.getTenantByTenantId(tenantId); // Call model function to get tenants
    return tenants;
  } catch (error) {
    throw new Error("Failed to get tenants: " + error.message);
  }
};

// Check if tenant exists by phone number service
const checkTenantExistsByTenantId = async (tenantId) => {
  try {
    const exists = await tenantModel.checkTenantExistsByTenantId(tenantId); // Call model function to check tenant by mobile
    return exists;
  } catch (error) {
    throw new Error("Failed to check tenant by phone number: " + error.message);
  }
};

const checkTenantExistsByTenantnameAndTenantdomain = async (tenantName,tenantDomain) => {
  try {
    const exists = await tenantModel.checkTenantExistsByTenantnameAndTenantdomain(tenantName,tenantDomain); // Call model function to check tenant by mobile
    return exists;
  } catch (error) {
    throw new Error("Failed to check tenant by tenantname and tenantdomain: " + error.message);
  }
};

// Update tenant service
const updateTenant = async (tenantId, data) => {
  try {
    const affectedRows = await tenantModel.updateTenant(tenantId, data);
    if (affectedRows === 0) {
      throw new Error("Tenant not found or no changes made.");
    }
    return affectedRows;
  } catch (error) {
    throw new Error("Failed to update tenant: " + error.message);
  }
};

// Delete tenant service
const deleteTenant = async (tenantId) => {
  try {
    const affectedRows = await tenantModel.deleteTenant(tenantId);
    if (affectedRows === 0) {
      throw new Error("Tenant not found.");
    }
    return affectedRows;
  } catch (error) {
    throw new Error("Failed to delete tenant: " + error.message);
  }
};

module.exports = {
  createTenant,
  getTenants,
  checkTenantExistsByTenantId,
  checkTenantExistsByTenantnameAndTenantdomain,
  getTenantByTenantId,
  updateTenant,
  deleteTenant,
};
