const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const {
  sendEmailOrOtp,
  sendEmailWithAttachmentController,
  sendSMSController,
  sendOTPController,
  verifyOTPController,
  sendWhatsAppWithAttachmentController,
  sendWhatsAppController,
} = require("./MailSmsOtpController");

router.post("/email-otp", sendEmailOrOtp);
router.post(
  "/email-attachment",
  upload.array("attachments"),
  sendEmailWithAttachmentController
);
router.post("/sms", sendSMSController);
router.post("/otp", sendOTPController);
router.post("/verify-otp", verifyOTPController);
router.post("/whatsapp-otp", sendWhatsAppController);
router.post(
  "/whatsapp-attachment",
  upload.array("attachments"),
  sendWhatsAppWithAttachmentController
);

module.exports = router;
