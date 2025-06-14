const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadFileMiddleware } = require("../utils/UploadFiles");

const receiptionController = require("../controllers/ReceiptionController");
const {
  ADD_RECEIPTION,
  GETALL_RECEIPTION_TENANT,
  GET_RECEIPTION_TENANT,
  UPDATE_RECEIPTION_TENANT,
  DELETE_RECEIPTION_TENANT,
} = require("./RouterPath");
const receiptionValidation = require("../validations/ReceiptionValidation");
const { multiTenantAuthMiddleware } = require("../middlewares/AuthToken");
const upload = multer({ storage: multer.memoryStorage() });

// router.use(multiTenantAuthMiddleware)

const receiptionFileMiddleware = uploadFileMiddleware({
    folderName: "Receiption",
    fileFields: [
      {
        fieldName: "profile_picture",
        subFolder: "Photos",
        maxSizeMB: 2,
        multiple: false,
      }
    ],
    createValidationFn: receiptionValidation.createPatientValidation,
    updateValidationFn: receiptionValidation.updatePatientValidation,
  });

// Create Receiption
router.post(
  ADD_RECEIPTION,
  upload.any(),
  receiptionFileMiddleware,
  receiptionController.createReceiption
);

// Get All Receiptions by Tenant ID with Pagination
router.get(GETALL_RECEIPTION_TENANT, receiptionController.getAllReceiptionsByTenantId);

// Get Single Receiption by Tenant ID & Receiption ID
router.get(GET_RECEIPTION_TENANT, receiptionController.getReceiptionByTenantIdAndReceiptionId);

// Update Receiption
router.put(
  UPDATE_RECEIPTION_TENANT,
  upload.any(),
  receiptionFileMiddleware,
  receiptionController.updateReceiption
);

// Delete Receiption
router.delete(
  DELETE_RECEIPTION_TENANT,
  receiptionController.deleteReceiptionByTenantIdAndReceiptionId
);

module.exports = router;
