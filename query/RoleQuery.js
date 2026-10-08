const roleQuery = {
  createRole: `
    INSERT INTO roles (
      role_code,
      role_name,
      status,
      created_by
    )
    VALUES (?, ?, ?, ?)
  `,

  getAllRoles: `
    SELECT
      role_id,
      role_code,
      role_name,
      status,
      created_by,
      created_time,
      updated_by,
      updated_time
    FROM roles
    ORDER BY role_id DESC
  `,

  getRoleById: `
    SELECT
      role_id,
      role_code,
      role_name,
      status,
      created_by,
      created_time,
      updated_by,
      updated_time
    FROM roles
    WHERE role_id = ?
    LIMIT 1
  `,

  getRoleByCode: `
    SELECT
      role_id,
      role_code,
      role_name,
      status,
      created_by,
      created_time,
      updated_by,
      updated_time
    FROM roles
    WHERE role_code = ?
    LIMIT 1
  `,

  checkRoleCodeExists: `
    SELECT 1
    FROM roles
    WHERE role_code = ?
    LIMIT 1
  `,

  checkRoleNameExists: `
    SELECT 1
    FROM roles
    WHERE role_name = ?
    LIMIT 1
  `,

  checkRoleNameExistsExcludeRole: `
    SELECT 1
    FROM roles
    WHERE role_name = ?
      AND role_id != ?
    LIMIT 1
  `,

  updateRole: `
    UPDATE roles
    SET
      role_name = ?,
      status = ?,
      updated_by = ?,
      updated_time = CURRENT_TIMESTAMP
    WHERE role_id = ?
  `,

  updateRoleStatus: `
    UPDATE roles
    SET
      status = ?,
      updated_by = ?,
      updated_time = CURRENT_TIMESTAMP
    WHERE role_id = ?
  `,

  deleteRole: `
    DELETE FROM roles
    WHERE role_id = ?
  `,
};

module.exports = {
  roleQuery,
};