const UserRoleModel = require("../models/UserRoleModel");
const CustomError = require("../middlewares/CustomeError");

const UserRoleService = {

    createUserRole: async (data) => {

        const {
            user_id,
            role_id,
            tenant_id,
            clinic_id,
            is_primary = 0,
            status = 1,
            created_by = "SYSTEM"
        } = data;

        // 1. User validation
        const user = await UserRoleModel.getUserById(user_id);

        if (!user) {
            throw new CustomError(
                "User not found",
                404
            );
        }

        if (Number(user.status) !== 1) {
            throw new CustomError(
                "Cannot assign role to inactive user",
                400
            );
        }

        // 2. Role validation
        const role = await UserRoleModel.getRoleById(role_id);

        if (!role) {
            throw new CustomError(
                "Role not found",
                404
            );
        }

        if (Number(role.status) !== 1) {
            throw new CustomError(
                "Cannot assign inactive role",
                400
            );
        }

        // 3. Tenant validation
        const tenant = await UserRoleModel.getTenantById(tenant_id);

        if (!tenant) {
            throw new CustomError(
                "Tenant not found",
                404
            );
        }

        // 4. Clinic validation
        const clinic = await UserRoleModel.getClinicById(clinic_id);

        if (!clinic) {
            throw new CustomError(
                "Clinic not found",
                404
            );
        }

        // 5. Clinic must belong to selected tenant
        if (Number(clinic.tenant_id) !== Number(tenant_id)) {
            throw new CustomError(
                "Selected clinic does not belong to selected tenant",
                400
            );
        }

        // 6. Duplicate assignment check
        const duplicate =
            await UserRoleModel.checkDuplicateAssignmentForCreate(
                user_id,
                role_id,
                tenant_id,
                clinic_id
            );

        if (duplicate) {
            throw new CustomError(
                "This user role assignment already exists",
                409
            );
        }

        // 7. Active assignment tenant validation
        const activeAssignments =
            await UserRoleModel.getActiveAssignmentsByUserId(user_id);

        /*
         * TENANT role:
         * Can access multiple tenants and clinics.
         *
         * Other roles:
         * Must stay inside one tenant.
         */

        if (role.role_code !== "TENANT") {

            const otherTenantAssignments =
                activeAssignments.filter(
                    (assignment) =>
                        Number(assignment.tenant_id) !== Number(tenant_id)
                );

            if (otherTenantAssignments.length > 0) {

                const existingTenants = [
                    ...new Set(
                        otherTenantAssignments.map(
                            (assignment) =>
                                Number(assignment.tenant_id)
                        )
                    )
                ];

                throw new CustomError(
                    `User already has role assignment in another tenant (${existingTenants.join(", ")}). Non-TENANT roles cannot cross tenants.`,
                    400
                );
            }
        }

        // 8. Primary validation
        const primary = Number(is_primary) === 1 ? 1 : 0;

        const result = await UserRoleModel.createUserRole({
            user_id,
            role_id,
            tenant_id,
            clinic_id,
            is_primary: primary,
            status: Number(status) === 1 ? 1 : 0,
            created_by,
            updated_by: created_by
        });

        return {
            user_role_id: result.insertId,
            message: "User role assigned successfully"
        };
    },

    getAllUserRoles: async () => {

        return await UserRoleModel.getAllUserRoles();
    },

    getUserRoleById: async (user_role_id) => {

        const userRole =
            await UserRoleModel.getUserRoleById(user_role_id);

        if (!userRole) {
            throw new CustomError(
                "User role assignment not found",
                404
            );
        }

        return userRole;
    },

    getUserRolesByUserId: async (user_id) => {

        const user =
            await UserRoleModel.getUserById(user_id);

        if (!user) {
            throw new CustomError(
                "User not found",
                404
            );
        }

        return await UserRoleModel.getUserRolesByUserId(
            user_id
        );
    },

    updateUserRole: async (
        user_role_id,
        data
    ) => {

        // 1. Existing assignment
        const existing =
            await UserRoleModel.getUserRoleForUpdate(
                user_role_id
            );

        if (!existing) {
            throw new CustomError(
                "User role assignment not found",
                404
            );
        }

        const user_id = existing.user_id;

        const {
            role_id,
            tenant_id,
            clinic_id,
            is_primary = 0,
            status = 1,
            updated_by = "SYSTEM"
        } = data;

        // 2. User validation
        const user =
            await UserRoleModel.getUserById(user_id);

        if (!user) {
            throw new CustomError(
                "User not found",
                404
            );
        }

        if (Number(user.status) !== 1) {
            throw new CustomError(
                "Cannot assign role to inactive user",
                400
            );
        }

        // 3. Role validation
        const role =
            await UserRoleModel.getRoleById(role_id);

        if (!role) {
            throw new CustomError(
                "Role not found",
                404
            );
        }

        if (Number(role.status) !== 1) {
            throw new CustomError(
                "Cannot assign inactive role",
                400
            );
        }

        // 4. Tenant validation
        const tenant =
            await UserRoleModel.getTenantById(tenant_id);

        if (!tenant) {
            throw new CustomError(
                "Tenant not found",
                404
            );
        }

        // 5. Clinic validation
        const clinic =
            await UserRoleModel.getClinicById(clinic_id);

        if (!clinic) {
            throw new CustomError(
                "Clinic not found",
                404
            );
        }

        // 6. Clinic belongs to tenant
        if (
            Number(clinic.tenant_id) !==
            Number(tenant_id)
        ) {
            throw new CustomError(
                "Selected clinic does not belong to selected tenant",
                400
            );
        }

        // 7. Duplicate assignment
        const duplicate =
            await UserRoleModel.checkDuplicateAssignment(
                user_id,
                role_id,
                tenant_id,
                clinic_id,
                user_role_id
            );

        if (duplicate) {
            throw new CustomError(
                "This user role assignment already exists",
                409
            );
        }

        // 8. Check all other active assignments
        const activeAssignments =
            await UserRoleModel.getActiveAssignmentsByUserId(
                user_id
            );

        const otherAssignments =
            activeAssignments.filter(
                (assignment) =>
                    Number(assignment.user_role_id) !==
                    Number(user_role_id)
            );

        /*
         * Non-TENANT roles cannot cross tenants.
         */
        if (role.role_code !== "TENANT") {

            const otherTenantAssignments =
                otherAssignments.filter(
                    (assignment) =>
                        Number(assignment.tenant_id) !==
                        Number(tenant_id)
                );

            if (otherTenantAssignments.length > 0) {

                const existingTenants = [
                    ...new Set(
                        otherTenantAssignments.map(
                            (assignment) =>
                                Number(assignment.tenant_id)
                        )
                    )
                ];

                throw new CustomError(
                    `User already has role assignment in another tenant (${existingTenants.join(", ")}). Non-TENANT roles cannot cross tenants.`,
                    400
                );
            }
        }

        const primary =
            Number(is_primary) === 1 ? 1 : 0;

        const result =
            await UserRoleModel.updateUserRole(
                user_role_id,
                {
                    user_id,
                    role_id,
                    tenant_id,
                    clinic_id,
                    is_primary: primary,
                    status: Number(status) === 1 ? 1 : 0,
                    updated_by
                }
            );

        if (result.affectedRows === 0) {
            throw new CustomError(
                "User role update failed",
                400
            );
        }

        return {
            message: "User role updated successfully"
        };
    },

    updateUserRoleStatus: async (
        user_role_id,
        status,
        updated_by = "SYSTEM"
    ) => {

        const existing =
            await UserRoleModel.getUserRoleForUpdate(
                user_role_id
            );

        if (!existing) {
            throw new CustomError(
                "User role assignment not found",
                404
            );
        }

        const newStatus =
            Number(status) === 1 ? 1 : 0;

        const result =
            await UserRoleModel.updateUserRoleStatus(
                user_role_id,
                newStatus,
                updated_by
            );

        if (result.affectedRows === 0) {
            throw new CustomError(
                "User role status update failed",
                400
            );
        }

        return {
            message: "User role status updated successfully"
        };
    },

    deleteUserRole: async (user_role_id) => {

        const existing =
            await UserRoleModel.getUserRoleById(
                user_role_id
            );

        if (!existing) {
            throw new CustomError(
                "User role assignment not found",
                404
            );
        }

        const result =
            await UserRoleModel.deleteUserRole(
                user_role_id
            );

        if (result.affectedRows === 0) {
            throw new CustomError(
                "User role deletion failed",
                400
            );
        }

        return {
            message: "User role deleted successfully"
        };
    }
};

module.exports = UserRoleService;
