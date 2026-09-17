const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const morgan = require('morgan');

const { env } = require('./config/env');
const { generalLimiter } = require('./middlewares/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const apiRoutes = require('./routes');

const app = express();

// Behind a reverse proxy/load balancer (Section 2.4) - needed for correct
// req.ip in rate limiting and audit logs, and for secure cookies over HTTPS.
app.set('trust proxy', 1);

// --- Security headers (FR-20.3) ---
app.use(helmet());

// --- CORS (FR-20.3) - restrictive: only the configured frontend origin, with credentials for cookies ---
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

// --- Body/cookie parsing ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// --- Input sanitization against NoSQL injection and XSS (FR-20.4) ---
app.use(mongoSanitize());
app.use(xss());

// --- Request logging ---
app.use(morgan(env.isProd ? 'combined' : 'dev'));

// --- General rate limiting (tighter limits applied per-route for auth/payments) ---
app.use(generalLimiter);

// --- Health check (for Railway/uptime monitors) ---
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

// --- API routes ---
app.use('/api/v1', apiRoutes);

// --- 404 + centralized error handling (FR-20.6) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
