# School LMS — Backend API

A REST API for a multi-role School Management System, built with **Node.js, Express, and MongoDB**. It supports admins, accountants, teachers, students, and parents, each with role-scoped access to their own data.

This project was built incrementally, module by module, with each one verified against a live MongoDB Atlas database before moving to the next.

## Tech Stack

- **Runtime:** Node.js, Express
- **Database:** MongoDB (Mongoose ODM)
- **Auth:** JWT (access + httpOnly refresh cookies), bcrypt password hashing
- **Validation:** Zod
- **Security:** Helmet, CORS (credentialed, single-origin), express-mongo-sanitize, xss-clean, rate limiting
## Architecture

src/
  config/        env.js (fails fast if secrets missing), db.js
  models/        one Mongoose schema per entity
  controllers/   business logic
  routes/        one file per module, mounted under /api/v1
  middlewares/   auth (JWT + RBAC), validation, error handling, rate limiting
  services/      audit logging
  utils/         ApiError, ApiResponse, asyncHandler, logger
  seed/          devSeed.js — local dev only, refuses to run in production
  app.js         Express app: security headers, CORS, sanitization, routes
  server.js      HTTP server bootstrap
  
Every module follows the same pattern: a **validator** (Zod schema) checks the request body, a **controller** contains the business logic and talks to MongoDB via Mongoose, and a thin **route** file wires them together behind `verifyJWT` + `authorizeRoles`. All data is scoped by `school` on every query, so the same codebase is ready to support multiple schools without extra rework.

## Modules

| Module | Endpoint prefix | Key features |
|---|---|---|
| Authentication | `/api/v1/auth` | JWT login/logout, 6 roles, account lockout |
| Admin — Teachers/Students/Classes/Parents/Users | `/api/v1/admin` | Registration creates a real login account; general user management (edit, reset password, activate/deactivate) |
| Attendance | `/api/v1/attendance/students`, `/api/v1/attendance/teachers` | Bulk "mark all" for a class, edit-with-audit-trail, manual teacher entry |
| Exams & Results | `/api/v1/exams` | Marks entry with **automatic percentage/grade/pass-fail calculation**, submit → approve → reject → publish workflow, class ranking |
| Fees | `/api/v1/fees` | Fee structures per class, single/batch challan generation, payment collection with a running ledger |
| Salary | `/api/v1/salaries` | **Automatic attendance-based deduction**, draft → approve → disburse workflow with a generated transaction reference |
| Timetable | `/api/v1/timetable` | **Automatic conflict detection** — prevents double-booking a teacher, class, or room |
| Assignments | `/api/v1/assignments` | Submissions with automatic late-detection, grading |
| Leave Management | `/api/v1/leaves` | Apply/approve/reject workflow |
| Parent-Teacher Chat | `/api/v1/chat` | Parents can only message their child's actual assigned class teacher; admin moderation (restrict/report) |
| Parent Portal | `/api/v1/parents` | Read-only self-service: a parent's own children's attendance, results, and fee status |
| Reports | `/api/v1/reports` | Date-range aggregations: attendance, fee collection, salary paid |
| Notifications | `/api/v1/notifications` | Personal inbox + admin broadcast to a role or specific users |
| Settings | `/api/v1/settings` | Per-school policy configuration (grading bands, deduction rules, working days) |
| Audit Logs | `/api/v1/audit-logs` | Read-only trail of security/financially relevant actions |
| Accountant Dashboard | `/api/v1/accountant` | At-a-glance summary: outstanding fees, pending salaries |

## Known gaps (honest, not hidden)

- **`/api/v1/students` and `/api/v1/teachers` self-service portals are not yet built** — a student/teacher currently cannot fetch their own profile/attendance/results directly; that data is only reachable through admin/parent-scoped routes.
- **Online payment gateways** (JazzCash, Easypaisa, Raast, card) are wired for manual recording only — real-time webhook verification needs live merchant credentials, which aren't configured.
- **Biometric device ingestion** is scaffolded but not implemented — it needs a separate device-side API-key auth scheme, distinct from normal user login.
- **WhatsApp/SMS sending** is not implemented — needs a third-party gateway (Twilio, Meta Business API, etc.).

## Setup

```bash
cp .env.example .env      # fill in real values (MONGO_URI, JWT secrets, etc.)
npm install
npm run seed:dev          # creates one dev School + Super Admin (blocked in production)
npm run dev                # nodemon, http://localhost:5000
```

## Database

Requires **MongoDB Atlas** (or any replica-set-enabled Mongo instance) — a bare single-node Mongo cannot run the multi-document transactions some fee/salary operations rely on.

## Security

- Helmet security headers, restrictive credentialed CORS (single frontend origin)
- express-mongo-sanitize + xss-clean on every request
- Rate limiting, tighter on `/auth/*`
- httpOnly + sameSite cookies for JWT tokens
- Centralized error handler — never leaks stack traces in production
- Every security/financially relevant action is written to an audit log
