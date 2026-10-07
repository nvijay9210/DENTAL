Perfect 👍 — based on your given **router file**, here’s a **Postman-style reference document** (just like your email/SMS version) but now **extended for WhatsApp messaging** — fully matching your structure and naming.

---

# 📱 **WhatsApp Messaging API — Postman Reference**

Base URL (example):

```
http://localhost:5173/messaging
```

---

## ✅ 1️⃣ `POST /messaging/whatsapp-otp`

✅ Send **WhatsApp OTP** to verify a user

```json
{
  "phone": "+911234567890",
  "sendVia": ["whatsapp"],
  "otp": true,
  "otpLength": 6,
  "otpExpiryMinutes": 10,
  "message": "Your WhatsApp verification code is"
}
```

✅ To send **normal WhatsApp message** without OTP:

```json
{
  "phone": "+911234567890",
  "sendVia": ["whatsapp"],
  "otp": false,
  "message": "Welcome to our service on WhatsApp!"
}
```

✅ For **multiple WhatsApp numbers** (bulk message):

```json
{
  "phone": ["+911234567890", "+919876543210"],
  "sendVia": ["whatsapp"],
  "otp": false,
  "message": "Hello! This is a broadcast message on WhatsApp."
}
```

---

## ✅ 2️⃣ `POST /messaging/whatsapp-attachment`

➡️ **Send file (PDF, image, etc.) via WhatsApp**

**Set Body → form-data**

| KEY         | TYPE | VALUE                 |
| ----------- | ---- | --------------------- |
| phone       | text | +911234567890         |
| message     | text | Please see attachment |
| attachments | file | (select any file)     |

✅ Example:

* `attachments` → choose a `.pdf`, `.jpg`, or `.png` file
* You can attach multiple files (if supported by your service)

---

## ✅ 3️⃣ `POST /messaging/email-otp`

(Same as existing)
✅ Send OTP or plain email

```json
{
  "email": "testuser@example.com",
  "phone": "+911234567890",
  "sendVia": ["email", "sms"],
  "otp": true,
  "otpLength": 6,
  "otpExpiryMinutes": 10,
  "subject": "Verification Code",
  "message": "Your OTP is"
}
```

---

## ✅ 4️⃣ `POST /messaging/sms`

✅ Send plain SMS

```json
{
  "phone": "+911234567890",
  "message": "Hello, this is a test SMS!"
}
```

---

## ✅ 5️⃣ `POST /messaging/verify-otp`

✅ Verify OTP for any channel (Email, SMS, or WhatsApp)

```json
{
  "phone": "+911234567890",
  "otp": "123456"
}
```

✅ Or via email:

```json
{
  "email": "testuser@example.com",
  "otp": "123456"
}
```

---

## 🧩 `.env` Sample for WhatsApp Integration

```bash
# WhatsApp API credentials
WHATSAPP_API_URL=https://graph.facebook.com/v17.0/<your_phone_number_id>/messages
WHATSAPP_ACCESS_TOKEN=<your_meta_access_token>
WHATSAPP_BUSINESS_ID=<your_business_id>
WHATSAPP_TEMPLATE_NAME=otp_template
```

---

## 📦 Expected Responses

✅ **OTP Sent / Message Sent**

```json
{
  "success": true,
  "channel": "whatsapp",
  "message": "WhatsApp OTP sent successfully",
  "otp": "123456",
  "expiresIn": "10 minutes"
}
```

❌ **Invalid OTP**

```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```
