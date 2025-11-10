require("dotenv").config();
const nodemailer = require("nodemailer");
const twilio = require("twilio");

// ======================
// EMAIL TRANSPORTER
// ======================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ======================
// TWILIO CLIENT
// ======================
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ======================
// OTP STORE (in-memory)
// ======================
const otpStore = {}; // key = email or phone

// ======================
// SEND EMAIL
// ======================
async function sendEmail({ to, subject, text, html }) {
  try {
    const recipients = Array.isArray(to) ? to.join(",") : to;
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipients,
      subject,
      text,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ======================
// SEND EMAIL WITH ATTACHMENT
// ======================
async function sendEmailWithAttachment({ to, subject, text, html, attachments = [] }) {
  try {
    const recipients = Array.isArray(to) ? to.join(",") : to;
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipients,
      subject,
      text,
      html,
      attachments,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ======================
// SEND SMS
// ======================
async function sendSMS({ to, body }) {
  try {
    const numbers = Array.isArray(to) ? to : [to];
    const results = [];
    for (const number of numbers) {
      const message = await twilioClient.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: number,
      });
      results.push({ number, sid: message.sid });
    }
    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ======================
// GENERATE OTP
// ======================
function generateOTP(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

// ======================
// SEND OTP (email or SMS)
// ======================
async function sendOTP({ to, via = "sms", subject, message, length = 6, expiryMinutes = 10, username, session }) {
  const otp = generateOTP(length);
  console.log("otp:", otp);
  const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const fullMessage = message ? `${message}: ${otp}` : `Your OTP code is ${otp}. Please enter it to continue.`;
  let result = {};

  // Save OTP in session if provided
  if (session) {
    if (!session.otps) session.otps = {};
  }

  session.otps[username] = { otp, expiry };

  // fallback in-memory store (optional)
  otpStore[username] = { otp, expiry };

  if (via === "sms") {
    result = await sendSMS({ to, body: fullMessage });
  } else if (via === "email") {
    result = await sendEmail({
      to,
      subject: subject || "Your OTP Code",
      text: fullMessage,
      html: `<p>${fullMessage}</p>`,
    });
  } else if (via === "whatsapp") {
    result = await sendWhatsApp({ to, body: fullMessage });
  } else {
    throw new Error("Invalid 'via' option. Use 'sms', 'email', or 'whatsapp'");
  }

  return { otp, expiry, result, via };
}


// ======================
// VERIFY OTP
// ======================
function verifyOTP({ to, otp, username, session }) {
  const key = username || to;
  const record = (session?.otps && session.otps[key]) || otpStore[key];

  if (!record) return { success: false, message: "No OTP sent to this user" };

  if (new Date() > record.expiry) {
    if (session?.otps) delete session.otps[key];
    delete otpStore[key];
    return { success: false, message: "OTP expired" };
  }

  if (record.otp !== otp) return { success: false, message: "Invalid OTP" };

  // OTP verified successfully, remove it
  if (session?.otps) delete session.otps[key];
  delete otpStore[key];

  return { success: true, message: "OTP verified successfully" };
}


// ======================
// SEND WHATSAPP MESSAGE
// ======================
async function sendWhatsApp({ to, body }) {
  try {
    const numbers = Array.isArray(to) ? to : [to];
    const results = [];

    for (const number of numbers) {
      const message = await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${number.replace(/^(\+)?/, "+")}`,
        body,
      });
      results.push({ number, sid: message.sid });
    }

    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ======================
// SEND WHATSAPP WITH ATTACHMENT
// ======================
async function sendWhatsAppWithAttachment({ to, body, mediaUrl }) {
  try {
    const numbers = Array.isArray(to) ? to : [to];
    const results = [];

    for (const number of numbers) {
      const message = await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${number.replace(/^(\+)?/, "+")}`,
        body,
        mediaUrl: Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl], // must be public URLs
      });
      results.push({ number, sid: message.sid });
    }

    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


// ======================
// EXPORT
// ======================
module.exports = { sendEmail, sendEmailWithAttachment, sendSMS, sendOTP, verifyOTP,sendWhatsApp,sendWhatsAppWithAttachment };
