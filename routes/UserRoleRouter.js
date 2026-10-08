const express = require("express");
const router = express.Router();

const userRoleController = require("../controllers/UserRoleController");
const routerPath = require("./RouterPath");

const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");


// Create user role
router.post(
  routerPath.ADD_USER_ROLE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  userRoleController.create
);


// Get all user roles
router.get(
  routerPath.GETALL_USER_ROLE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  userRoleController.getAll
);


// Get user role by ID
router.get(
  routerPath.GET_USER_ROLE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  userRoleController.getById
);


// Get all roles by user ID
router.get(
  routerPath.GET_USER_ROLES_BY_USER,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  userRoleController.getByUserId
);


// Update user role
router.put(
  routerPath.UPDATE_USER_ROLE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  userRoleController.update
);


// Update user role status
router.patch(
  routerPath.UPDATE_USER_ROLE_STATUS,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  userRoleController.updateStatus
);


// Delete user role
router.delete(
  routerPath.DELETE_USER_ROLE,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  userRoleController.delete
);


module.exports = router;
