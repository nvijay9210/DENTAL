const twilio = require("twilio");
const sgMail = require("@sendgrid/mail");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send Notification (SMS / WhatsApp / Email)
 * @param {Object} options
 * @param {"sms"|"whatsapp"|"email"} options.type
 * @param {string} options.to
 * @param {string} options.message
 */
const sendNotification = async ({ type, to, message }) => {
  try {
    if (type === "sms") {
      const res = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });
      return { success: true, sid: res.sid };
    }

    if (type === "whatsapp") {
      const res = await client.messages.create({
        body: message,
        from: "whatsapp:" + process.env.TWILIO_PHONE_NUMBER,
        to: "whatsapp:" + to,
      });
      return { success: true, sid: res.sid };
    }

    if (type === "email") {
      const msg = {
        to: to,
        from: process.env.EMAIL_FROM,
        subject: "Notification",
        text: message,
      };
      await sgMail.send(msg);
      return { success: true };
    }

    throw new Error("Invalid notification type");
  } catch (err) {
    console.error("❌ Notification Error:", err.message);
    return { success: false, error: err.message };
  }
};

module.exports = sendNotification;