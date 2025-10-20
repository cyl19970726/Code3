# Implementation Plan: User Authentication

**Branch**: `feat/001-user-auth` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)

## Summary
Implement secure user authentication system with email/password registration, email verification, password reset, and account protection features (rate limiting, account lockout). Focus on security best practices (bcrypt hashing, time-limited tokens) and async email delivery.

## Technical Context
**Language/Version**: Node.js 20+ with TypeScript 5.3+
**Primary Framework**: Express.js 4.18+ for REST API
**Database**: PostgreSQL 15+ with Prisma ORM 5.0+
**Email Service**: SendGrid API with async job queue (Bull + Redis)
**Testing**: Jest 29+ with Supertest for API testing
**Authentication**: JWT tokens (access + refresh) with httpOnly cookies
**Target Platform**: Linux containers (Docker) on AWS ECS
**Project Type**: Backend API service (REST)
**Performance Goals**:
- Password hashing: < 200ms (p95)
- Login endpoint: < 500ms (p95)
- Concurrent registrations: 1000+ users
**Constraints**:
- GDPR compliance (data retention, user deletion)
- Password storage: bcrypt only (no plain text, no MD5/SHA)
- Email delivery must not block API responses

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

**Simplicity**:
- Projects: 1 (backend API only)
- Status: ✅ PASS (within 3-project limit)

**Architecture**:
- Library-First: ✅ PASS (using Prisma ORM, Express, Bull, SendGrid SDK)
- Avoid custom frameworks: ✅ PASS (standard Express patterns)

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced: ✅ PASS
- TDD strict mode: ✅ PASS (tests before implementation)
- Test coverage target: 80%+ for critical paths (auth, password reset)

**Overall**: ✅ PASS - All constitutional requirements satisfied

---

## Phase 0: Research & Decisions

### Research Documents
See [research.md](./research.md) for detailed analysis.

### Key Decisions

**1. Password Hashing Algorithm**
- **Decision**: bcrypt with cost factor 12
- **Rationale**: Industry standard, adaptive cost factor allows future increases, resistant to rainbow table attacks. Cost 12 provides ~200ms hashing time (meets NFR-1).
- **Alternatives**:
  - Argon2 (winner of Password Hashing Competition, but less mature ecosystem)
  - PBKDF2 (older standard, less resistant to GPU attacks)
  - scrypt (memory-hard, but harder to tune)

**2. Token Storage & Format**
- **Decision**: JWT tokens (access: 15min, refresh: 7 days) stored in httpOnly cookies
- **Rationale**: httpOnly prevents XSS attacks, short access token lifetime limits damage from token leakage, refresh token allows long sessions without compromising security.
- **Alternatives**:
  - Opaque tokens with server-side storage (more secure but requires DB lookup per request)
  - LocalStorage JWT (vulnerable to XSS)
  - Session cookies only (requires sticky sessions, harder to scale)

**3. Email Delivery Architecture**
- **Decision**: Async job queue (Bull + Redis) with SendGrid API
- **Rationale**: Email delivery can take 500ms-2s, blocking API response is unacceptable. Job queue provides retry logic, monitoring, and backpressure control. Redis ensures job persistence.
- **Alternatives**:
  - Synchronous SendGrid API (blocks response, violates NFR-4)
  - AWS SES with Lambda (more complex, vendor lock-in)
  - SMTP directly (no retry logic, harder to monitor)

**4. Rate Limiting Strategy**
- **Decision**: Express-rate-limit with Redis store (10 req/min per IP for signup, 5 req/min for login)
- **Rationale**: Prevents brute force attacks, protects against credential stuffing. Redis provides distributed rate limiting across multiple servers.
- **Alternatives**:
  - In-memory rate limiting (doesn't work with multiple servers)
  - AWS WAF (more expensive, harder to customize)
  - No rate limiting (security risk)

**5. Database Schema Design**
- **Decision**: Separate tables for User, VerificationToken, LoginAttempt, Session with foreign keys
- **Rationale**: Normalized design, easy to query login history, supports token expiration cleanup, allows user deletion without orphaned data.
- **Alternatives**:
  - Embedded tokens in User table (harder to query, no history)
  - NoSQL document store (overkill for relational data, no ACID guarantees)

**6. Token Expiration Strategy**
- **Decision**: Verification: 24h, Password Reset: 1h, Sessions: 7d (remember me) / 24h (default)
- **Rationale**: Balance security and UX. Verification tokens are low-risk (24h OK). Password reset is high-risk (1h minimum). Sessions use refresh token rotation for security.
- **Alternatives**:
  - Shorter verification: 1h (too strict, users may miss email)
  - Longer password reset: 24h (security risk)
  - No session expiration (security risk)

**7. Error Handling & User Feedback**
- **Decision**: Generic error messages for security ("Invalid credentials"), detailed logs for debugging
- **Rationale**: Prevents user enumeration attacks (don't reveal "email exists" during login). Internal logs have full details for troubleshooting.
- **Alternatives**:
  - Specific error messages (security risk: reveals valid emails)
  - No logging (debugging nightmare)
  - Client-side only errors (no audit trail)

**Status**: ✅ Complete

---

## Phase 1: Design & Contracts

### Data Model
See [data-model.md](./data-model.md) for complete schema.

**Entities**: 4
- **User**: id (UUID), email (unique), passwordHash, emailVerified (bool), accountLocked (bool), lockReason, createdAt, lastLogin
- **VerificationToken**: id (UUID), token (unique), userId (FK), expiresAt, type (enum), used (bool), createdAt
- **LoginAttempt**: id (UUID), userId (FK), ipAddress, userAgent, success (bool), failureReason, createdAt
- **Session**: sessionId (UUID), userId (FK), accessToken, refreshToken, expiresAt, ipAddress, userAgent, createdAt

**Key Relationships**:
- User 1:N VerificationToken (a user can have multiple tokens)
- User 1:N LoginAttempt (track all login attempts)
- User 1:N Session (support multiple concurrent sessions)

### API Contracts
See [contracts/](./contracts/) for OpenAPI specs.

**Endpoints**: 8
- `POST /api/auth/register` — Create new user account, send verification email
- `POST /api/auth/verify-email` — Verify email with token from email link
- `POST /api/auth/login` — Login with email/password, return JWT tokens
- `POST /api/auth/logout` — Invalidate current session
- `POST /api/auth/refresh` — Get new access token using refresh token
- `POST /api/auth/forgot-password` — Send password reset email
- `POST /api/auth/reset-password` — Reset password with token from email
- `GET /api/auth/me` — Get current user info (requires authentication)

**Common Response Codes**:
- 200: Success
- 201: Created (register)
- 400: Bad request (invalid input)
- 401: Unauthorized (invalid credentials, expired token)
- 403: Forbidden (account locked)
- 429: Too many requests (rate limit exceeded)
- 500: Internal server error

### Quickstart Validation
See [quickstart.md](./quickstart.md) for test scenarios.

**Test Scenarios**: 6
1. Happy path: Register → Verify → Login → Access protected route → Logout
2. Password reset flow: Login fail → Request reset → Use token → Login success
3. Account lockout: 5 failed logins → account locked → unlock email → verify unlock
4. Concurrent registrations: 100 users register simultaneously (load test)
5. Email service failure: Registration succeeds even if email fails (async queue)
6. Token expiration: Verify with expired token → error, request new token

**Status**: ✅ Complete

---

## Phase 2: Task Planning Approach

**THIS PHASE IS EXECUTED BY /tasks COMMAND - NOT BY /plan**

### Task Generation Strategy
- Load data-model.md → generate Prisma schema task + migration tasks [P]
- Load contracts/ → generate contract test tasks for each endpoint [P]
- Load quickstart.md → generate integration test tasks for each scenario
- Apply TDD ordering: Tests → Core → Integration → Polish

### Estimated Tasks
- Setup: ~5 tasks (project init, Prisma setup, Redis setup, Docker, env config)
- Tests: ~12 tasks [P] (8 contract tests + 6 integration tests from quickstart)
- Core: ~15 tasks (User model, auth services, JWT utils, email queue, endpoints)
- Integration: ~8 tasks (middleware, error handlers, rate limiting, logging)
- Polish: ~6 tasks [P] (unit tests for utilities, performance tests, docs, security audit)

**Total Estimated**: ~46 tasks

### Parallel Execution Notes
- Contract tests [P]: Can run in parallel (different files, no shared state)
- Prisma migrations: Must run sequentially
- Service implementations: Some sequential (auth service depends on User model)
- Integration tests: Can run in parallel with test database isolation

---

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (7 tech decisions documented)
- [x] Phase 1: Design complete (data model, 8 API endpoints, 6 test scenarios)
- [ ] Phase 2: Task planning complete (/tasks command)
- [ ] Phase 3: Tasks generated
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (simplicity, architecture, testing requirements)
- [x] Post-Design Constitution Check: PASS (no architectural violations, test coverage plan OK)
- [x] All NEEDS CLARIFICATION resolved (spec.md has no markers)
- [x] Complexity deviations documented (none - staying within limits)

**Design Artifacts Generated**:
- [x] research.md (tech stack analysis, security considerations)
- [x] data-model.md (4 entities with TypeScript interfaces + Prisma schema)
- [x] contracts/ (8 OpenAPI endpoint specs with request/response schemas)
- [x] quickstart.md (6 integration test scenarios)

---

**Next Step**: Run `/tasks` to generate detailed task breakdown from this plan

---

## Instructions for LLM (This section should NOT appear in generated files)

**How to use this template**:

1. **Read this entire file** to understand the structure and format
2. **Create a NEW plan.md** based on the spec.md file
3. **Follow the same structure**:
   - Same section headings (## Technical Context, ## Phase 0, etc.)
   - Same format for tech decisions (numbered 1-7, with Decision/Rationale/Alternatives)
   - Same format for data model (list entities with attributes)
   - Same format for API contracts (list endpoints with descriptions)
4. **Replace ALL example content**:
   - "User Authentication" → actual feature name from spec.md
   - All tech decisions → actual decisions based on feature requirements
   - All entities → actual entities from spec.md Key Entities section
   - All endpoints → actual endpoints needed for the feature
   - All test scenarios → actual scenarios from spec.md
5. **Generate 7 tech decisions**:
   - Each decision must have: Decision, Rationale, Alternatives (at least 2)
   - Cover: tech stack, architecture patterns, data storage, external services, security, performance, deployment
   - Be specific with versions and configurations
6. **Important**:
   - DO NOT copy "User Authentication" content
   - DO NOT keep example decisions/entities/endpoints
   - DO use the same format and structure
   - DO read spec.md thoroughly before writing plan.md
   - DO ensure entities in plan match entities in spec.md
   - DO ensure tech decisions align with requirements in spec.md

**Common mistakes to avoid**:
- ❌ Keeping {{FEATURE_NAME}} or other placeholders
- ❌ Copying example content (User Authentication)
- ❌ Less than 7 tech decisions
- ❌ Tech decisions without Alternatives
- ❌ Entities that don't match spec.md
- ❌ Missing data types in entity attributes
- ❌ Vague tech stack (specify versions)
- ❌ Constitution Check that doesn't match project reality
