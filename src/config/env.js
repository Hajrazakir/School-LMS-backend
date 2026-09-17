// Centralized environment configuration.
// Fails fast on boot if a required variable is missing, instead of
// crashing later with a confusing error mid-request.
require('dotenv').config();

const required = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'EMAIL_TOKEN_SECRET',
];

function assertRequiredEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[FATAL] Missing required environment variables: ${missing.join(', ')}\n` +
        'Copy .env.example to .env and fill in real values before starting the server.'
    );
    process.exit(1);
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mongoUri: process.env.MONGO_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    emailTokenSecret: process.env.EMAIL_TOKEN_SECRET,
  },

  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
  },

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'School LMS <no-reply@yourschool.edu>',
  },

  rateLimit: {
    authWindowMin: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MIN, 10) || 15,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
    paymentWindowMin: parseInt(process.env.PAYMENT_RATE_LIMIT_WINDOW_MIN, 10) || 15,
    paymentMax: parseInt(process.env.PAYMENT_RATE_LIMIT_MAX, 10) || 20,
  },

  login: {
    maxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5,
    lockoutMinutes: parseInt(process.env.LOGIN_LOCKOUT_MINUTES, 10) || 15,
  },

  biometric: {
    deviceApiKey: process.env.BIOMETRIC_DEVICE_API_KEY,
  },

  payments: {
    jazzcash: {
      merchantId: process.env.JAZZCASH_MERCHANT_ID,
      password: process.env.JAZZCASH_PASSWORD,
      integritySalt: process.env.JAZZCASH_INTEGRITY_SALT,
      returnUrl: process.env.JAZZCASH_RETURN_URL,
    },
    easypaisa: {
      storeId: process.env.EASYPAISA_STORE_ID,
      hashKey: process.env.EASYPAISA_HASH_KEY,
      returnUrl: process.env.EASYPAISA_RETURN_URL,
    },
    raast: {
      clientId: process.env.RAAST_PSP_CLIENT_ID,
      clientSecret: process.env.RAAST_PSP_CLIENT_SECRET,
      baseUrl: process.env.RAAST_PSP_BASE_URL,
    },
    card: {
      apiKey: process.env.CARD_GATEWAY_API_KEY,
      webhookSecret: process.env.CARD_GATEWAY_WEBHOOK_SECRET,
    },
  },
};

module.exports = { env, assertRequiredEnv };
