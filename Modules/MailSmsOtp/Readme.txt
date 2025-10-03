Sure! Here are **5 route names** with **sample JSON bodies** you can use directly in **Postman** to test each one.

---

## ✅ 1️⃣ `POST /messaging/email-otp`

✅ Send OTP **or plain email** to email/phone

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

✅ To send a **normal email without OTP**:

```json
{
  "email": "testuser@example.com",
  "sendVia": ["email"],
  "otp": false,
  "subject": "Welcome Message",
  "message": "Hello, welcome to our app!"
}
```

✅ To send a **normal SMS without OTP**:

```json
{
  "phone": "+911234567890",
  "sendVia": ["sms"],
  "otp": false,
  "message": "This is a test SMS"
}
```

---

## ✅ 2️⃣ `POST /messaging/otp`

✅ Only send OTP (email or SMS)

```json
{
  "email": "testuser@example.com",
  "phone": "+911234567890",
  "sendVia": ["email", "sms"],
  "otpLength": 6,
  "otpExpiryMinutes": 5,
  "subject": "Your Login OTP",
  "message": "Use this code to verify"
}
```

✅ Only via phone:

```json
{
  "phone": "+911234567890",
  "sendVia": ["sms"],
  "message": "Your OTP is"
}
```

✅ Only via email:

```json
{
  "email": "testuser@example.com",
  "sendVia": ["email"],
  "subject": "OTP Verification",
  "message": "Your OTP code is"
}
```

---

## ✅ 3️⃣ `POST /messaging/email-attachment`

➡️ Set **Body → form-data**
✅ Keys:

| KEY         | TYPE | VALUE                                               |
| ----------- | ---- | --------------------------------------------------- |
| email       | text | [testuser@example.com](mailto:testuser@example.com) |
| subject     | text | Invoice                                             |
| text        | text | Please see attachment                               |
| attachments | file | (select any file)                                   |

Use form-data mode with at least one file under `attachments`.

---

## ✅ 4️⃣ `POST /messaging/sms`

✅ Send plain SMS

```json
{
  "phone": "+911234567890",
  "message": "Hello, this is a test SMS!"
}
```

✅ For multiple numbers:

```json
{
  "phone": ["+911234567890", "+919876543210"],
  "message": "Bulk SMS Test"
}
```

---

## ✅ 5️⃣ `POST /messaging/verify-otp`

✅ Verify email or SMS OTP

```json
{
  "email": "testuser@example.com",
  "otp": "123456"
}
```

✅ Using phone:

```json
{
  "phone": "+911234567890",
  "otp": "123456"
}
```

---

Let me know if you want `.env` sample or response examples too!
