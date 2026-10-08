const express = require("express");
const router = express.Router();

const roleController = require("../controllers/RoleController");
const routerPath = require("./RouterPath");

const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

router.post(
  routerPath.ADD_ROLE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  roleController.createRole
);

router.get(
  routerPath.GETALL_ROLE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  roleController.getAllRoles
);

router.get(
  routerPath.GET_ROLE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  roleController.getRoleById
);

router.get(
  routerPath.GET_ROLE_CODE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  roleController.getRoleByCode
);

router.put(
  routerPath.UPDATE_ROLE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  roleController.updateRole
);

router.patch(
  routerPath.UPDATE_ROLE_STATUS,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  roleController.updateRoleStatus
);

router.delete(
  routerPath.DELETE_ROLE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  roleController.deleteRole
);

module.exports = router;