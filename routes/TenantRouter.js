const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/TenantController");
const routerPath = require("./RouterPath");

router.post(routerPath.ADD_TENANT, tenantController.addTenant);
router.get(routerPath.GETALL_TENTANT, tenantController.getAllTenant);
router.get(routerPath.GET_TENANT, tenantController.getTenantByTenantId);
router.put(routerPath.UPDATE_TENANT, tenantController.updateTenant);
router.delete(routerPath.DELETE_TENANT, tenantController.deleteTenant);

module.exports = router;
