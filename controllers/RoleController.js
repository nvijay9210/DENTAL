const roleService = require("../services/RoleService");
const roleModel = require("../models/RoleModel");
const { CustomError } = require("../middlewares/CustomeError");

exports.createRole = async (req, res, next) => {
  try {
    const {
      role_code,
      role_name,
      status = 1,
    } = req.body;

    if (!role_code || !role_name) {
      throw new CustomError(
        "Role code and role name are required",
        400
      );
    }

    const codeExists =
      await roleModel.checkRoleCodeExists(role_code);

    if (codeExists) {
      throw new CustomError(
        "Role code already exists",
        409
      );
    }

    const nameExists =
      await roleModel.checkRoleNameExists(role_name);

    if (nameExists) {
      throw new CustomError(
        "Role name already exists",
        409
      );
    }

    const roleId = await roleService.createRole({
      role_code: role_code.toUpperCase(),
      role_name,
      status,
      created_by:
        req.user?.preferred_username || "SYSTEM",
    });

    res.status(201).json({
      message: "Role created successfully",
      role_id: roleId,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getAllRoles();

    res.status(200).json(roles);
  } catch (error) {
    next(error);
  }
};

exports.getRoleById = async (req, res, next) => {
  try {
    const { role_id } = req.params;

    const role =
      await roleService.getRoleById(role_id);

    if (!role) {
      throw new CustomError("Role not found", 404);
    }

    res.status(200).json(role);
  } catch (error) {
    next(error);
  }
};

exports.getRoleByCode = async (req, res, next) => {
  try {
    const { role_code } = req.params;

    const role =
      await roleService.getRoleByCode(role_code);

    if (!role) {
      throw new CustomError("Role not found", 404);
    }

    res.status(200).json(role);
  } catch (error) {
    next(error);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const { role_id } = req.params;
    const { role_name, status } = req.body;

    const role =
      await roleService.getRoleById(role_id);

    if (!role) {
      throw new CustomError("Role not found", 404);
    }

    if (!role_name) {
      throw new CustomError(
        "Role name is required",
        400
      );
    }

    const nameExists =
      await roleModel.checkRoleNameExistsExcludeRole(
        role_name,
        role_id
      );

    if (nameExists) {
      throw new CustomError(
        "Role name already exists",
        409
      );
    }

    await roleService.updateRole(role_id, {
      role_name,
      status:
        status !== undefined
          ? status
          : role.status,
      updated_by:
        req.user?.preferred_username || "SYSTEM",
    });

    res.status(200).json({
      message: "Role updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRoleStatus = async (
  req,
  res,
  next
) => {
  try {
    const { role_id } = req.params;
    const { status } = req.body;

    if (status !== 0 && status !== 1) {
      throw new CustomError(
        "Status must be 0 or 1",
        400
      );
    }

    const role =
      await roleService.getRoleById(role_id);

    if (!role) {
      throw new CustomError("Role not found", 404);
    }

    await roleService.updateRoleStatus(
      role_id,
      status,
      req.user?.preferred_username || "SYSTEM"
    );

    res.status(200).json({
      message: "Role status updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteRole = async (req, res, next) => {
  try {
    const { role_id } = req.params;

    const role =
      await roleService.getRoleById(role_id);

    if (!role) {
      throw new CustomError("Role not found", 404);
    }

    await roleService.deleteRole(role_id);

    res.status(200).json({
      message: "Role deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};