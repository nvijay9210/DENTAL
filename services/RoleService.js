const roleModel = require("../models/RoleModel");

const createRole = async (data) => {
  return await roleModel.createRole(data);
};

const getAllRoles = async () => {
  return await roleModel.getAllRoles();
};

const getRoleById = async (roleId) => {
  return await roleModel.getRoleById(roleId);
};

const getRoleByCode = async (roleCode) => {
  return await roleModel.getRoleByCode(roleCode);
};

const updateRole = async (roleId, data) => {
  return await roleModel.updateRole(roleId, data);
};

const updateRoleStatus = async (
  roleId,
  status,
  updatedBy
) => {
  return await roleModel.updateRoleStatus(
    roleId,
    status,
    updatedBy
  );
};

const deleteRole = async (roleId) => {
  return await roleModel.deleteRole(roleId);
};

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  getRoleByCode,
  updateRole,
  updateRoleStatus,
  deleteRole,
};