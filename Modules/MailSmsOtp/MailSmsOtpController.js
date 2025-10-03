const { sendEmail, sendEmailWithAttachment, sendSMS, sendOTP, verifyOTP } = require("./MailSmsOtpService");

exports.sendEmailOrOtp = async (req, res) => {
  try {
    const { email, phone, sendVia = ["email", "sms"], otp = true, otpLength = 6, otpExpiryMinutes = 10, message, subject } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ message: "Email or phone is required" });
    }

    const via = Array.isArray(sendVia) ? sendVia : [sendVia];
    const result = {};

    if (via.includes("sms") && phone) {
      result.sms = otp
        ? await sendOTP({ to: phone, via: "sms", message, length: otpLength, expiryMinutes: otpExpiryMinutes })
        : await sendSMS({ to: phone, body: message || "Hello!" });
    }

    if (via.includes("email") && email) {
      result.email = otp
        ? await sendOTP({ to: email, via: "email", subject: subject || "Your OTP Code", message, length: otpLength, expiryMinutes: otpExpiryMinutes })
        : await sendEmail({ to: email, subject: subject || "Notification", text: message || "Hello!", html: `<p>${message || "Hello!"}</p>` });
    }

    res.status(200).json({ message: "Notifications sent successfully", data: result });
  } catch (err) {
    console.error("❌ Notification failed:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.sendEmailWithAttachmentController = async (req, res) => {
  try {
    const { email, subject, text, html } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const attachments = req.files.map(file => ({
      filename: file.originalname,
      path: file.path,
    }));

    const result = await sendEmailWithAttachment({ to: email, subject, text, html, attachments });
    res.status(200).json({ message: "Email with attachment sent", data: result });
  } catch (err) {
    console.error("❌ Email with attachment failed:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.sendSMSController = async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ message: "Phone number and message are required" });

    const result = await sendSMS({ to: phone, body: message });
    res.status(200).json({ message: "SMS sent successfully", data: result });
  } catch (err) {
    console.error("❌ SMS failed:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.sendOTPController = async (req, res) => {
  try {
    const { email, phone, sendVia = ["email", "sms"], otpLength = 6, otpExpiryMinutes = 10, message, subject } = req.body;
    if (!email && !phone) return res.status(400).json({ message: "Email or phone is required" });

    const via = Array.isArray(sendVia) ? sendVia : [sendVia];
    const result = {};

    if (via.includes("sms") && phone) {
      result.sms = await sendOTP({ to: phone, via: "sms", message, length: otpLength, expiryMinutes: otpExpiryMinutes });
    }

    if (via.includes("email") && email) {
      result.email = await sendOTP({ to: email, via: "email", subject: subject || "Your OTP Code", message, length: otpLength, expiryMinutes: otpExpiryMinutes });
    }

    res.status(200).json({ message: "OTP sent successfully", data: result });
  } catch (err) {
    console.error("❌ OTP send failed:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.verifyOTPController = (req, res) => {
  const { email, phone, otp } = req.body;
  if (!otp || (!email && !phone)) {
    return res.status(400).json({ message: "OTP and email or phone are required" });
  }

  const to = email || phone;
  const result = verifyOTP({ to, otp });

  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
};
