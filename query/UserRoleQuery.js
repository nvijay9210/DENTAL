const pool = require("../config/db");

const userRoleQuery = {

    createUserRole: `
        INSERT INTO user_roles
        (
            user_id,
            role_id,
            tenant_id,
            clinic_id,
            is_primary,
            status,
            created_by,
            updated_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,

    getAllUserRoles: `
        SELECT
            ur.user_role_id,
            ur.user_id,
            ur.role_id,
            ur.tenant_id,
            ur.clinic_id,
            ur.is_primary,
            ur.status,
            ur.created_at,
            ur.created_by,
            ur.updated_at,
            ur.updated_by,

            u.username,
            u.email,
            u.status AS user_status,

            r.role_code,
            r.role_name,
            r.status AS role_status

        FROM user_roles ur

        INNER JOIN users u
            ON u.user_id = ur.user_id

        INNER JOIN roles r
            ON r.role_id = ur.role_id

        ORDER BY ur.user_role_id DESC
    `,

    getUserRoleById: `
        SELECT
            ur.user_role_id,
            ur.user_id,
            ur.role_id,
            ur.tenant_id,
            ur.clinic_id,
            ur.is_primary,
            ur.status,
            ur.created_at,
            ur.created_by,
            ur.updated_at,
            ur.updated_by,

            u.username,
            u.email,
            u.status AS user_status,

            r.role_code,
            r.role_name,
            r.status AS role_status

        FROM user_roles ur

        INNER JOIN users u
            ON u.user_id = ur.user_id

        INNER JOIN roles r
            ON r.role_id = ur.role_id

        WHERE ur.user_role_id = ?
        LIMIT 1
    `,

    getUserRolesByUserId: `
        SELECT
            ur.user_role_id,
            ur.user_id,
            ur.role_id,
            ur.tenant_id,
            ur.clinic_id,
            ur.is_primary,
            ur.status,
            ur.created_at,
            ur.created_by,
            ur.updated_at,
            ur.updated_by,

            r.role_code,
            r.role_name,
            r.status AS role_status

        FROM user_roles ur

        INNER JOIN roles r
            ON r.role_id = ur.role_id

        WHERE ur.user_id = ?

        ORDER BY
            ur.is_primary DESC,
            ur.user_role_id DESC
    `,

    getUserById: `
        SELECT
            user_id,
            keycloak_id,
            username,
            email,
            status
        FROM users
        WHERE user_id = ?
        LIMIT 1
    `,

    getRoleById: `
        SELECT
            role_id,
            role_code,
            role_name,
            status
        FROM roles
        WHERE role_id = ?
        LIMIT 1
    `,

    getTenantById: `
        SELECT
            tenant_id
        FROM tenant
        WHERE tenant_id = ?
        LIMIT 1
    `,

    getClinicById: `
        SELECT
            clinic_id,
            tenant_id
        FROM clinic
        WHERE clinic_id = ?
        LIMIT 1
    `,

    checkDuplicateAssignment: `
        SELECT
            user_role_id
        FROM user_roles
        WHERE
            user_id = ?
            AND role_id = ?
            AND tenant_id = ?
            AND clinic_id = ?
            AND user_role_id != ?
        LIMIT 1
    `,

    checkDuplicateAssignmentForCreate: `
        SELECT
            user_role_id
        FROM user_roles
        WHERE
            user_id = ?
            AND role_id = ?
            AND tenant_id = ?
            AND clinic_id = ?
        LIMIT 1
    `,

    getActiveAssignmentsByUserId: `
        SELECT
            ur.user_role_id,
            ur.role_id,
            ur.tenant_id,
            ur.clinic_id,
            r.role_code
        FROM user_roles ur
        INNER JOIN roles r
            ON r.role_id = ur.role_id
        WHERE
            ur.user_id = ?
            AND ur.status = 1
        ORDER BY ur.user_role_id
    `,

    getUserRoleForUpdate: `
        SELECT
            ur.user_role_id,
            ur.user_id,
            ur.role_id,
            ur.tenant_id,
            ur.clinic_id,
            ur.is_primary,
            ur.status,
            r.role_code
        FROM user_roles ur
        INNER JOIN roles r
            ON r.role_id = ur.role_id
        WHERE ur.user_role_id = ?
        LIMIT 1
    `,

    clearPrimaryByUserId: `
        UPDATE user_roles
        SET
            is_primary = 0,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE user_id = ?
          AND is_primary = 1
    `,

    updateUserRole: `
        UPDATE user_roles
        SET
            role_id = ?,
            tenant_id = ?,
            clinic_id = ?,
            is_primary = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE user_role_id = ?
    `,

    updateUserRoleStatus: `
        UPDATE user_roles
        SET
            status = ?,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE user_role_id = ?
    `,

    deleteUserRole: `
        DELETE FROM user_roles
        WHERE user_role_id = ?
    `
};

module.exports = userRoleQuery;
