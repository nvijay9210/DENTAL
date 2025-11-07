const {
  sendEmail,
  sendEmailWithAttachment,
  sendSMS,
  sendWhatsApp,
  sendWhatsAppWithAttachment,
  sendOTP,
  verifyOTP,
} = require("./MailSmsOtpService");

// ===================================
// 1️⃣ Send Email / SMS / WhatsApp (OTP or plain message)
// ===================================
exports.sendEmailOrOtp = async (req, res) => {
  try {
    const {
      email,
      phone,
      sendVia = ["email", "sms","whatsapp"],
      otp = true,
      otpLength = 6,
      otpExpiryMinutes = 10,
      message,
      subject,
    } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ message: "Email or phone is required" });
    }

    const via = Array.isArray(sendVia) ? sendVia : [sendVia];
    const result = {};

    // SMS
    if (via.includes("sms") && phone) {
      result.sms = otp
        ? await sendOTP({
            to: phone,
            via: "sms",
            message,
            length: otpLength,
            expiryMinutes: otpExpiryMinutes,
          })
        : await sendSMS({ to: phone, body: message || "Hello!" });
    }

    // Email
    if (via.includes("email") && email) {
      result.email = otp
        ? await sendOTP({
            to: email,
            via: "email",
            subject: subject || "Your OTP Code",
            message,
            length: otpLength,
            expiryMinutes: otpExpiryMinutes,
          })
        : await sendEmail({
            to: email,
            subject: subject || "Notification",
            text: message || "Hello!",
            html: `<p>${message || "Hello!"}</p>`,
          });
    }

    // WhatsApp
    if (via.includes("whatsapp") && phone) {
      result.whatsapp = otp
        ? await sendOTP({
            to: phone,
            via: "whatsapp",
            message,
            length: otpLength,
            expiryMinutes: otpExpiryMinutes,
          })
        : await sendWhatsApp({ to: phone, body: message || "Hello from WhatsApp!" });
    }

    res.status(200).json({ message: "Notifications sent successfully", data: result });
  } catch (err) {
    console.error("❌ Notification failed:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ===================================
// 2️⃣ Send Email with Attachment
// ===================================
exports.sendEmailWithAttachmentController = async (req, res) => {
  try {
    const { email, subject, text, html } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const attachments = req.files?.map((file) => ({
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

// ===================================
// 3️⃣ Send SMS (single or bulk)
// ===================================
exports.sendSMSController = async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message)
      return res.status(400).json({ message: "Phone number and message are required" });

    const result = await sendSMS({ to: phone, body: message });
    res.status(200).json({ message: "SMS sent successfully", data: result });
  } catch (err) {
    console.error("❌ SMS failed:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ===================================
// 4️⃣ Send WhatsApp message (plain text)
// ===================================
exports.sendWhatsAppController = async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message)
      return res.status(400).json({ message: "Phone number and message are required" });

    const result = await sendWhatsApp({ to: phone, body: message });
    res.status(200).json({ message: "WhatsApp message sent successfully", data: result });
  } catch (err) {
    console.error("❌ WhatsApp failed:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ===================================
// 5️⃣ Send WhatsApp with Attachment (PDF, Image, etc.)
// ===================================
exports.sendWhatsAppWithAttachmentController = async (req, res) => {
  try {
    const { phone, body, mediaUrl } = req.body;
    if (!phone || !mediaUrl)
      return res.status(400).json({ message: "Phone and mediaUrl are required" });

    const result = await sendWhatsAppWithAttachment({ to: phone, body, mediaUrl });
    res.status(200).json({ message: "WhatsApp attachment sent successfully", data: result });
  } catch (err) {
    console.error("❌ WhatsApp attachment failed:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ===================================
// 6️⃣ Send OTP (Email / SMS / WhatsApp)
// ===================================
exports.sendOTPController = async (req, res) => {
  try {
    const {
      email,
      phone,
      sendVia = ["email", "sms","whatsapp"],
      otpLength = 6,
      otpExpiryMinutes = 10,
      message,
      subject,
    } = req.body;

    if (!email && !phone)
      return res.status(400).json({ message: "Email or phone is required" });

    const via = Array.isArray(sendVia) ? sendVia : [sendVia];
    const result = {};

    if (via.includes("sms") && phone)
      result.sms = await sendOTP({
        to: `+${phone}`,
        via: "sms",
        message,
        length: otpLength,
        expiryMinutes: otpExpiryMinutes,
      });

    if (via.includes("email") && email)
      result.email = await sendOTP({
        to: email,
        via: "email",
        subject: subject || "Your OTP Code",
        message,
        length: otpLength,
        expiryMinutes: otpExpiryMinutes,
      });

    if (via.includes("whatsapp") && phone)
      result.whatsapp = await sendOTP({
        to: phone,
        via: "whatsapp",
        message,
        length: otpLength,
        expiryMinutes: otpExpiryMinutes,
      });

    res.status(200).json({ message: "OTP sent successfully", data: result });
  } catch (err) {
    console.error("❌ OTP send failed:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ===================================
// 7️⃣ Verify OTP
// ===================================
exports.verifyOTPController = (req, res) => {
  const { email, phone, otp,via } = req.body;
  if (!otp || (!email && !phone))
    return res.status(400).json({ message: "OTP and email or phone are required" });

  const to = via==='sms' ? `+${phone}` : email;
  const result = verifyOTP({ to, otp });

  if (result.success) res.status(200).json(result);
  else res.status(400).json(result);
};
