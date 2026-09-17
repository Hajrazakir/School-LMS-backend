# School LMS Backend

Node.js / Express / MongoDB backend for the School LMS, built against the SRS v1.0
you provided. This is a **real, production-oriented skeleton** — not a demo/expo
project. No dummy accounts, no fake payment/biometric flows: integration points
are wired for the real services (JazzCash, Easypaisa, Raast, a card gateway, a
physical biometric device) and simply require your real credentials to go live.

## Architecture

```
src/
  config/        env.js (fails fast if secrets missing), db.js, cloudinary.js
  models/        one Mongoose schema per SRS entity (Section 6.1)
  controllers/   business logic (auth is fully implemented; others are stubs)
  routes/        one file per SRS module, mounted under /api/v1
  middlewares/   auth (JWT+RBAC), error handling, rate limiting, validation, uploads
  services/      email, audit logging
  utils/         ApiError, ApiResponse, asyncHandler, tokens, logger, cloudinary upload
  sockets/       Socket.IO auth + room handling for chat/notifications
  seed/          devSeed.js — LOCAL DEV ONLY, refuses to run in production
  app.js         Express app: security headers, CORS, sanitization, routes
  server.js      HTTP + Socket.IO server bootstrap
```

MVC-style separation (Section 2.5): routes → middleware → controller → model.

## What's fully implemented vs. scaffolded

**Fully implemented: Section 3.1 Authentication & User Management (FR-1.1–FR-1.9)**
- JWT access + refresh tokens, silent refresh, logout / logout-all-devices
- Admin-only account creation (no public self-registration)
- bcrypt password hashing, email verification, password reset (30-min, single-use)
- Account activation/deactivation (revokes sessions immediately)
- Profile update + Cloudinary profile image upload
- Account lockout after repeated failed logins (NFR-7)
- RBAC middleware usable by every other module
- Audit logging wired into every auth action (FR-20.1)

**Scaffolded (model + route file exist, endpoints return `501 Not Implemented`):**
All other 19 modules — Admin Portal, Student/Teacher/Parent Portals, Attendance
(manual + biometric), Examinations, Fees, Online Payments, Accountant Portal,
Salary, Chat, Notifications, Timetable, Assignments, Leave, Reports, Settings,
Audit Logs. Every Mongoose model for these already exists in `src/models/` with
fields matching the SRS field lists, so building out each controller is mostly
querying/writing to schemas that are already correct — not redesigning data.

This was a deliberate choice: 20 modules built shallowly in one pass would mean
payment/salary/biometric logic — the parts that touch real money and real
hardware — done carelessly. Auth is the one every other module depends on
(RBAC, audit logs, sessions), so it's the one built to production quality first.

## Setup

```bash
cp .env.example .env      # fill in real values
npm install
npm run seed:dev          # creates one dev School + Super Admin (blocked in production)
npm run dev                # nodemon, http://localhost:5000
```

Health check: `GET /health`

## Database: MongoDB Atlas (not Railway's Mongo plugin)

Use **MongoDB Atlas**, not Railway's built-in MongoDB plugin, for this project:
- Fee/Salary operations use multi-document **transactions** (NFR-12), which
  require a replica set. Atlas gives you one by default; a bare single-node
  Mongo instance cannot run transactions at all.
- Atlas gives proper automated backups (Section 6.3) and network-level access
  control, which matters here because this database holds financial records,
  biometric attendance data, and minors' personal information (NFR-19).

Steps: create a free/shared Atlas cluster → add your Railway service's
outbound IP (or `0.0.0.0/0` if Railway's IPs aren't static on your plan, then
tighten later) → copy the connection string into `MONGO_URI`.

## Deploying to Railway

1. Push this repo to GitHub, connect it to a new Railway project.
2. Railway will detect `Dockerfile` and `railway.json` automatically.
3. Set every variable from `.env.example` in Railway's Variables tab —
   **never commit `.env`**.
4. Set `MONGO_URI` to your Atlas connection string.
5. Set `COOKIE_SECURE=true` in production (Railway serves over HTTPS).
6. Railway will health-check `/health` per `railway.json`.
7. Run the one-time admin setup (see below) once, against production — do
   **not** run `npm run seed:dev` against production; it refuses to run
   when `NODE_ENV=production` by design (Section 6.2).

### Production admin provisioning (Section 6.2)

The SRS requires exactly one Super Admin/School Admin created via a secure,
one-time setup — no pre-populated demo accounts. `devSeed.js` is explicitly
blocked in production. Before going live, add a proper one-time setup route
or CLI command that:
- only runs once (checks no admin exists yet, same guard as devSeed),
- requires a secret bootstrap key from the environment, not a public URL,
- is removed/disabled immediately after first use.

## Real integrations — what you still need to supply

Nothing here is simulated, but nothing can go live without your real credentials:

| Integration | What you need | Where it plugs in |
|---|---|---|
| JazzCash | Merchant ID, password, integrity salt | `.env` → `JAZZCASH_*`, `payment.routes.js` |
| Easypaisa | Store ID, hash key | `.env` → `EASYPAISA_*` |
| Raast | PSP client ID/secret, base URL | `.env` → `RAAST_PSP_*` |
| Card gateway | API key, webhook secret (PCI-DSS hosted checkout) | `.env` → `CARD_GATEWAY_*` |
| Biometric device | Vendor SDK/API + a device-gateway microservice that pushes events to `POST /api/v1/attendance/teachers/device-events` with `BIOMETRIC_DEVICE_API_KEY` | `.env` → `BIOMETRIC_DEVICE_API_KEY` |
| Email | SMTP host/port/user/pass (or a provider API) | `.env` → `SMTP_*` |
| Cloudinary | Cloud name, API key, API secret | `.env` → `CLOUDINARY_*` |

All four webhook endpoints (`/api/v1/payments/webhook/*`) and the biometric
ingestion endpoint are deliberately **not** behind user JWT auth — the caller
is a machine, not a logged-in person. Each must verify the provider's
signature/shared-secret before touching any data (FR-9.5, FR-6.1). That
verification logic is the first thing to implement inside each controller.

## Security already wired in (Section 3.20 / NFR-4–7)

- Helmet security headers, restrictive CORS (credentialed, single origin)
- express-mongo-sanitize + xss-clean on every request
- Rate limiting: tighter on `/auth/*` and `/payments/*`, general limit elsewhere
- httpOnly + sameSite cookies for tokens; `COOKIE_SECURE` toggle for HTTPS
- Centralized error handler — never leaks stack traces when `NODE_ENV=production`
- Audit log service (`recordAudit`) ready to call from every future controller

## Next steps, in build order

1. School Admin Portal (Section 3.2) — CRUD for Student/Teacher/Parent/Accountant,
   since almost every other module depends on these existing.
2. Class/Subject/Timetable setup (needed before attendance/exams make sense).
3. Student Attendance → Fee Management → Online Payments (in that order — fee
   challans reference the fee structure, payments reference challans).
4. Biometric Attendance → Salary (salary deductions are derived from attendance).
5. Everything else (chat, notifications, reports) layers on top of the above.

Each new controller should follow the pattern in `auth.controller.js`:
`asyncHandler` wrapper, `ApiError`/`ApiResponse` for consistent shape, and a
`recordAudit(...)` call for anything security- or money-relevant.
