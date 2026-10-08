const UserRoleService = require("../services/UserRoleService");

const UserRoleController = {

    create: async (req, res, next) => {
        try {

            const result =
                await UserRoleService.createUserRole(
                    req.body
                );

            return res.status(201).json({
                success: true,
                message: result.message,
                data: {
                    user_role_id: result.user_role_id
                }
            });

        } catch (error) {
            next(error);
        }
    },

    getAll: async (req, res, next) => {
        try {

            const result =
                await UserRoleService.getAllUserRoles();

            return res.status(200).json({
                success: true,
                message: "User roles fetched successfully",
                data: result
            });

        } catch (error) {
            next(error);
        }
    },

    getById: async (req, res, next) => {
        try {

            const { user_role_id } = req.params;

            const result =
                await UserRoleService.getUserRoleById(
                    user_role_id
                );

            return res.status(200).json({
                success: true,
                message: "User role fetched successfully",
                data: result
            });

        } catch (error) {
            next(error);
        }
    },

    getByUserId: async (req, res, next) => {
        try {

            const { user_id } = req.params;

            const result =
                await UserRoleService.getUserRolesByUserId(
                    user_id
                );

            return res.status(200).json({
                success: true,
                message: "User roles fetched successfully",
                data: result
            });

        } catch (error) {
            next(error);
        }
    },

    update: async (req, res, next) => {
        try {

            const { user_role_id } = req.params;

            const result =
                await UserRoleService.updateUserRole(
                    user_role_id,
                    req.body
                );

            return res.status(200).json({
                success: true,
                message: result.message
            });

        } catch (error) {
            next(error);
        }
    },

    updateStatus: async (req, res, next) => {
        try {

            const { user_role_id } = req.params;

            const {
                status,
                updated_by
            } = req.body;

            const result =
                await UserRoleService.updateUserRoleStatus(
                    user_role_id,
                    status,
                    updated_by
                );

            return res.status(200).json({
                success: true,
                message: result.message
            });

        } catch (error) {
            next(error);
        }
    },

    delete: async (req, res, next) => {
        try {

            const { user_role_id } = req.params;

            const result =
                await UserRoleService.deleteUserRole(
                    user_role_id
                );

            return res.status(200).json({
                success: true,
                message: result.message
            });

        } catch (error) {
            next(error);
        }
    }
};

module.exports = UserRoleController;
