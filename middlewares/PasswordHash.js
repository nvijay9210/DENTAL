const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const secretKey = crypto.randomBytes(32); // Save this securely!
const iv = crypto.randomBytes(16);        // Initialization vector

// Encrypt
const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    content: encrypted
  };
};

// Decrypt
const decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    Buffer.from(hash.iv, 'hex')
  );
  let decrypted = decipher.update(hash.content, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
};

// Usage
// const original = "MySecretPassword";
// const encrypted = encrypt(original);
// const decrypted = decrypt(encrypted);

module.exports={encrypt,decrypt}
