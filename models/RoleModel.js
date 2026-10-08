const pool = require("../config/db");
const { roleQuery } = require("../query/RoleQuery");

const createRole = async (data) => {
  const conn = await pool.getConnection();

  try {
    const {
      role_code,
      role_name,
      status = 1,
      created_by = "SYSTEM",
    } = data;

    const [result] = await conn.query(roleQuery.createRole, [
      role_code,
      role_name,
      status,
      created_by,
    ]);

    return result.insertId;
  } finally {
    conn.release();
  }
};

const getAllRoles = async () => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(roleQuery.getAllRoles);
    return rows;
  } finally {
    conn.release();
  }
};

const getRoleById = async (roleId) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(roleQuery.getRoleById, [roleId]);
    return rows[0] || null;
  } finally {
    conn.release();
  }
};

const getRoleByCode = async (roleCode) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      roleQuery.getRoleByCode,
      [roleCode]
    );

    return rows[0] || null;
  } finally {
    conn.release();
  }
};

const checkRoleCodeExists = async (roleCode) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      roleQuery.checkRoleCodeExists,
      [roleCode]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

const checkRoleNameExists = async (roleName) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      roleQuery.checkRoleNameExists,
      [roleName]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

const checkRoleNameExistsExcludeRole = async (
  roleName,
  roleId
) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      roleQuery.checkRoleNameExistsExcludeRole,
      [roleName, roleId]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

const updateRole = async (roleId, data) => {
  const conn = await pool.getConnection();

  try {
    const {
      role_name,
      status = 1,
      updated_by = "SYSTEM",
    } = data;

    const [result] = await conn.query(roleQuery.updateRole, [
      role_name,
      status,
      updated_by,
      roleId,
    ]);

    return result.affectedRows;
  } finally {
    conn.release();
  }
};

const updateRoleStatus = async (
  roleId,
  status,
  updatedBy = "SYSTEM"
) => {
  const conn = await pool.getConnection();

  try {
    const [result] = await conn.query(
      roleQuery.updateRoleStatus,
      [status, updatedBy, roleId]
    );

    return result.affectedRows;
  } finally {
    conn.release();
  }
};

const deleteRole = async (roleId) => {
  const conn = await pool.getConnection();

  try {
    const [result] = await conn.query(
      roleQuery.deleteRole,
      [roleId]
    );

    return result.affectedRows;
  } finally {
    conn.release();
  }
};

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  getRoleByCode,
  checkRoleCodeExists,
  checkRoleNameExists,
  checkRoleNameExistsExcludeRole,
  updateRole,
  updateRoleStatus,
  deleteRole,
};