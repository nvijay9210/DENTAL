const pool = require("../config/db");
const userRoleQuery = require("../query/UserRoleQuery");

const UserRoleModel = {

    createUserRole: async (data) => {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            if (data.is_primary === 1) {
                await connection.query(
                    userRoleQuery.clearPrimaryByUserId,
                    [data.created_by || "SYSTEM", data.user_id]
                );
            }

            const [result] = await connection.query(
                userRoleQuery.createUserRole,
                [
                    data.user_id,
                    data.role_id,
                    data.tenant_id,
                    data.clinic_id,
                    data.is_primary ?? 0,
                    data.status ?? 1,
                    data.created_by || "SYSTEM",
                    data.updated_by || data.created_by || "SYSTEM"
                ]
            );

            await connection.commit();

            return result;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getAllUserRoles: async () => {
        const [rows] = await pool.query(
            userRoleQuery.getAllUserRoles
        );

        return rows;
    },

    getUserRoleById: async (user_role_id) => {
        const [rows] = await pool.query(
            userRoleQuery.getUserRoleById,
            [user_role_id]
        );

        return rows[0] || null;
    },

    getUserRolesByUserId: async (user_id) => {
        const [rows] = await pool.query(
            userRoleQuery.getUserRolesByUserId,
            [user_id]
        );

        return rows;
    },

    getUserById: async (user_id) => {
        const [rows] = await pool.query(
            userRoleQuery.getUserById,
            [user_id]
        );

        return rows[0] || null;
    },

    getRoleById: async (role_id) => {
        const [rows] = await pool.query(
            userRoleQuery.getRoleById,
            [role_id]
        );

        return rows[0] || null;
    },

    getTenantById: async (tenant_id) => {
        const [rows] = await pool.query(
            userRoleQuery.getTenantById,
            [tenant_id]
        );

        return rows[0] || null;
    },

    getClinicById: async (clinic_id) => {
        const [rows] = await pool.query(
            userRoleQuery.getClinicById,
            [clinic_id]
        );

        return rows[0] || null;
    },

    checkDuplicateAssignmentForCreate: async (
        user_id,
        role_id,
        tenant_id,
        clinic_id
    ) => {
        const [rows] = await pool.query(
            userRoleQuery.checkDuplicateAssignmentForCreate,
            [
                user_id,
                role_id,
                tenant_id,
                clinic_id
            ]
        );

        return rows[0] || null;
    },

    checkDuplicateAssignment: async (
        user_id,
        role_id,
        tenant_id,
        clinic_id,
        user_role_id
    ) => {
        const [rows] = await pool.query(
            userRoleQuery.checkDuplicateAssignment,
            [
                user_id,
                role_id,
                tenant_id,
                clinic_id,
                user_role_id
            ]
        );

        return rows[0] || null;
    },

    getActiveAssignmentsByUserId: async (user_id) => {
        const [rows] = await pool.query(
            userRoleQuery.getActiveAssignmentsByUserId,
            [user_id]
        );

        return rows;
    },

    getUserRoleForUpdate: async (user_role_id) => {
        const [rows] = await pool.query(
            userRoleQuery.getUserRoleForUpdate,
            [user_role_id]
        );

        return rows[0] || null;
    },

    updateUserRole: async (user_role_id, data) => {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            if (data.is_primary === 1) {
                await connection.query(
                    userRoleQuery.clearPrimaryByUserId,
                    [
                        data.updated_by || "SYSTEM",
                        data.user_id
                    ]
                );
            }

            const [result] = await connection.query(
                userRoleQuery.updateUserRole,
                [
                    data.role_id,
                    data.tenant_id,
                    data.clinic_id,
                    data.is_primary ?? 0,
                    data.status ?? 1,
                    data.updated_by || "SYSTEM",
                    user_role_id
                ]
            );

            await connection.commit();

            return result;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    updateUserRoleStatus: async (
        user_role_id,
        status,
        updated_by
    ) => {
        const [result] = await pool.query(
            userRoleQuery.updateUserRoleStatus,
            [
                status,
                updated_by || "SYSTEM",
                user_role_id
            ]
        );

        return result;
    },

    deleteUserRole: async (user_role_id) => {
        const [result] = await pool.query(
            userRoleQuery.deleteUserRole,
            [user_role_id]
        );

        return result;
    }
};

module.exports = UserRoleModel;
