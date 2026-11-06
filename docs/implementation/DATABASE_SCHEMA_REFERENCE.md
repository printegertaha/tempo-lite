# Athar (أثـر) — Database Schema & Data Dictionary Reference

> **Status**: VERIFIED & GENERATED  
> **Phase**: PHASE 3 DELIVERABLE  
> **Dialect**: PostgreSQL (Supabase)  
> **ORM**: Prisma 7.10.1 (`@prisma/adapter-pg`)  
> **Authentication**: Better Auth 1.7.18 (Google OAuth)  

---

## 1. Schema Overview & Architecture Map

Athar's PostgreSQL database is partitioned into two cooperating layers:
1. **Authentication Layer (Better Auth Managed)**: `user`, `session`, `account`, `verification`. Generated using official Better Auth specifications.
2. **Dynamic Application Domain Layer**:
   - User Configuration: `user_settings`
   - Categorization: `life_area`
   - Recurring Tracking Engine: `tracker`, `tracker_version`, `tracker_entry`
   - Decoupled Actionables: `task`

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BETTER AUTH DOMAIN                              │
│                                                                        │
│   ┌───────────────┐        ┌───────────────┐       ┌───────────────┐   │
│   │    Account    │◄───────┤     User      ├──────►│    Session    │   │
│   └───────────────┘        └───────┬───────┘       └───────────────┘   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
┌────────────────────────────────────┼───────────────────────────────────┐
│                        ATHAR DOMAIN LAYER                              │
│                                    │                                   │
│           ┌────────────────────────┼────────────────────────┐          │
│           │                        │                        │          │
│   ┌───────▼───────┐        ┌───────▼───────┐        ┌───────▼───────┐  │
│   │ UserSettings  │        │   LifeArea    │        │     Task      │  │
│   └───────────────┘        └───────┬───────┘        └───────────────┘  │
│                                    │ (SetNull on delete)               │
│                            ┌───────▼───────┐                           │
│                            │    Tracker    │                           │
│                            └───────┬───────┘                           │
│                                    │ (Cascade)                         │
│                    ┌───────────────┴───────────────┐                   │
│                    │                               │                   │
│            ┌───────▼───────┐               ┌───────▼───────┐           │
│            │TrackerVersion │               │ TrackerEntry  │           │
│            └───────────────┘               └───────────────┘           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Data Dictionary

### A. Authentication Models (Better Auth Standard)

#### 1. `User` (Table: `user`)
Primary identity entity for all accounts. Never seeded with mock data.
- `id` (TEXT, PK): Unique user identifier.
- `name` (TEXT, NOT NULL): User's full name from Google OAuth.
- `email` (TEXT, NOT NULL, UNIQUE): Unique email address.
- `emailVerified` (BOOLEAN, DEFAULT false): Verification flag.
- `image` (TEXT, NULLABLE): URL to avatar image from Google profile.
- `createdAt` (TIMESTAMPTZ, DEFAULT now()): Registration timestamp.
- `updatedAt` (TIMESTAMPTZ, AUTO): Last profile update.

#### 2. `Session` (Table: `session`)
Active server-side authentication sessions.
- `id` (TEXT, PK): Session ID.
- `expiresAt` (TIMESTAMPTZ, NOT NULL): Session expiration timestamp.
- `token` (TEXT, NOT NULL, UNIQUE): Cryptographic session token stored in client cookie.
- `ipAddress` (TEXT, NULLABLE): Client IP address for audit logging.
- `userAgent` (TEXT, NULLABLE): Client User-Agent.
- `userId` (TEXT, NOT NULL, FK -> `user.id` ON DELETE CASCADE).
- `createdAt` / `updatedAt` (TIMESTAMPTZ).

#### 3. `Account` (Table: `account`)
OAuth provider credentials and tokens.
- `id` (TEXT, PK): Account link identifier.
- `accountId` (TEXT, NOT NULL): External provider user ID (Google Sub ID).
- `providerId` (TEXT, NOT NULL): OAuth provider name (`"google"`).
- `userId` (TEXT, NOT NULL, FK -> `user.id` ON DELETE CASCADE).
- `accessToken` (TEXT, NULLABLE): Provider access token.
- `refreshToken` (TEXT, NULLABLE): Provider refresh token.
- `idToken` (TEXT, NULLABLE): OpenID Connect JWT token.
- `accessTokenExpiresAt` (TIMESTAMPTZ, NULLABLE).
- `refreshTokenExpiresAt` (TIMESTAMPTZ, NULLABLE).
- `scope` (TEXT, NULLABLE): Granted OAuth scopes (`openid email profile`).
- `password` (TEXT, NULLABLE): Kept null since Google OAuth is the only auth method.
- `createdAt` / `updatedAt` (TIMESTAMPTZ).
- *Unique Constraint*: `@@unique([providerId, accountId])`.

#### 4. `Verification` (Table: `verification`)
Temporary tokens for email and flow verifications.
- `id` (TEXT, PK): Record ID.
- `identifier` (TEXT, NOT NULL): Target email or session flow.
- `value` (TEXT, NOT NULL): Secure hashed verification value.
- `expiresAt` (TIMESTAMPTZ, NOT NULL): Expiration time.
- `createdAt` / `updatedAt` (TIMESTAMPTZ).
- *Unique Constraint*: `@@unique([identifier, value])`.

---

### B. User Preferences & Settings

#### 5. `UserSettings` (Table: `user_settings`)
1-to-1 extension table holding personalization and internationalization preferences.
- `id` (TEXT, PK).
- `userId` (TEXT, NOT NULL, UNIQUE, FK -> `user.id` ON DELETE CASCADE).
- `timezone` (TEXT, DEFAULT `'Asia/Riyadh'`): Canonical IANA timezone string used to compute local calendar date boundaries.
- `language` (TEXT, DEFAULT `'ar'`): Primary user interface language.
- `weekStartDay` (INTEGER, DEFAULT 6): First day of the week (6 = Saturday / السبت, 0 = Sunday / الأحد).
- `themeAccent` (TEXT, DEFAULT `'violet'`): Brand accent color token.
- `dashboardConfig` (JSONB, DEFAULT `'{}'`): Layout structure, enabled widgets, and ordering.
- `createdAt` / `updatedAt` (TIMESTAMPTZ).

---

### C. Life Organization & Categorization

#### 6. `LifeArea` (Table: `life_area`)
User-defined life domains/categories (e.g. "صحة", "روحانيات", "عمل").
- `id` (TEXT, PK).
- `userId` (TEXT, NOT NULL, FK -> `user.id` ON DELETE CASCADE).
- `name` (TEXT, NOT NULL): Display name in Arabic.
- `slug` (TEXT, NOT NULL): URL-safe identifier unique per user.
- `description` (TEXT, NULLABLE): Purpose or reflection notes.
- `icon` (TEXT, DEFAULT `'Sparkles'`): Lucide icon identifier.
- `color` (TEXT, DEFAULT `'violet'`): Tailwind accent token.
- `sortOrder` (INTEGER, DEFAULT 0): Custom ordering in UI filters.
- `isArchived` (BOOLEAN, DEFAULT false): Archived state.
- `archivedAt` (TIMESTAMPTZ, NULLABLE): Timestamp when archived.
- `createdAt` / `updatedAt` (TIMESTAMPTZ).
- *Unique Constraint*: `@@unique([userId, slug])`.
- *Index*: `@@index([userId, isArchived, sortOrder])`.

---

### D. Dynamic Tracker Engine

#### 7. `Tracker` (Table: `tracker`)
Generic, multi-modal tracking definition.
- `id` (TEXT, PK).
- `userId` (TEXT, NOT NULL, FK -> `user.id` ON DELETE CASCADE).
- `lifeAreaId` (TEXT, NULLABLE, FK -> `life_area.id` ON DELETE SET NULL).
- `name` (TEXT, NOT NULL): Name of tracker (e.g. "الصلوات الخمس", "البرمجة والعمل العميق").
- `slug` (TEXT, NOT NULL): URL-safe identifier unique per user.
- `description` (TEXT, NULLABLE): Tagline or explanation.
- `icon` (TEXT, DEFAULT `'Flame'`): Lucide icon identifier.
- `color` (TEXT, DEFAULT `'emerald'`): Tailwind theme token.
- `priority` (INTEGER, DEFAULT 1): Urgency / importance rank (1 to 10).
- `metricType` (`TrackerMetricType` ENUM, NOT NULL):
  - `BOOLEAN`: Binary completion checkmark.
  - `COUNTER`: Numeric increment tally with step sizes.
  - `NUMBER`: Arbitrary measurement with units (kg, pages, bpm).
  - `DURATION`: Elapsed focused time in seconds.
  - `TIME_RANGE`: Distinct start and end timestamps (e.g. sleep).
  - `CHECKLIST`: Multi-item checklist (e.g. 5 daily prayers).
  - `AVOIDANCE`: Streak and urge/relapse logging (e.g. smoking, screen time).
- `unit` (TEXT, NULLABLE): Physical unit string ("دقيقة", "كوب", "صفحة", "كم").
- `targetValue` (DOUBLE PRECISION, NULLABLE): Numerical goal per cycle.
- `targetFrequency` (`TargetFrequency` ENUM, DEFAULT `'DAILY'`): `DAILY`, `WEEKLY`, `CUSTOM`.
- `scheduleConfig` (JSONB, DEFAULT `'{}'`): Active days mask, recurrence rules, astronomical prayer preferences.
- `trackerConfig` (JSONB, DEFAULT `'{}'`): Modality-specific schema parameters.
- `displayPreferences` (JSONB, DEFAULT `'{}'`): UI card presentation options.
- `sortOrder` (INTEGER, DEFAULT 0): Manual reordering rank.
- `version` (INTEGER, DEFAULT 1): Increments whenever `targetValue`, `metricType`, `scheduleConfig`, or `trackerConfig` changes.
- `isPaused` (BOOLEAN, DEFAULT false): Halts streak calculation without marking failure.
- `isArchived` (BOOLEAN, DEFAULT false): Hides tracker from daily view while preserving all past logs.
- `archivedAt` (TIMESTAMPTZ, NULLABLE).
- `createdAt` / `updatedAt` (TIMESTAMPTZ).
- *Unique Constraint*: `@@unique([userId, slug])`.
- *Indexes*:
  - `@@index([userId, isArchived, isPaused, sortOrder])`
  - `@@index([userId, lifeAreaId])`

#### 8. `TrackerVersion` (Table: `tracker_version`)
Immutable audit snapshot preserving historical integrity when targets change.
- `id` (TEXT, PK).
- `trackerId` (TEXT, NOT NULL, FK -> `tracker.id` ON DELETE CASCADE).
- `userId` (TEXT, NOT NULL, FK -> `user.id` ON DELETE CASCADE).
- `versionNumber` (INTEGER, NOT NULL): Sequential version (1, 2, 3...).
- `name` (TEXT, NOT NULL): Name during this version window.
- `metricType` (`TrackerMetricType`, NOT NULL).
- `unit` (TEXT, NULLABLE).
- `targetValue` (DOUBLE PRECISION, NULLABLE).
- `targetFrequency` (`TargetFrequency`, NOT NULL).
- `trackerConfig` (JSONB, NOT NULL).
- `scheduleConfig` (JSONB, NOT NULL).
- `validFrom` (TIMESTAMPTZ, DEFAULT now()): Activation timestamp.
- `validTo` (TIMESTAMPTZ, NULLABLE): Superseded timestamp (null = currently active).
- `createdAt` (TIMESTAMPTZ, DEFAULT now()).
- *Unique Constraint*: `@@unique([trackerId, versionNumber])`.
- *Index*: `@@index([userId, trackerId, validFrom])`.

#### 9. `TrackerEntry` (Table: `tracker_entry`)
Polymorphic time-series log entries. Multiple entries per day are supported.
- `id` (TEXT, PK).
- `trackerId` (TEXT, NOT NULL, FK -> `tracker.id` ON DELETE CASCADE).
- `userId` (TEXT, NOT NULL, FK -> `user.id` ON DELETE CASCADE).
- `localDate` (TEXT, NOT NULL): String formatted `YYYY-MM-DD` representing the user's local calendar day.
- `occurredAt` (TIMESTAMPTZ, DEFAULT now()): True physical UTC timestamp.
- `valueBoolean` (BOOLEAN, NULLABLE): Populated for `BOOLEAN` metric.
- `valueNumeric` (DOUBLE PRECISION, NULLABLE): Populated for `COUNTER`, `NUMBER`, `CHECKLIST` score, or `AVOIDANCE` count.
- `valueDuration` (INTEGER, NULLABLE): Elapsed duration in seconds for `DURATION` / `TIME_RANGE`.
- `timeRangeStart` (TIMESTAMPTZ, NULLABLE): Range start for `TIME_RANGE`.
- `timeRangeEnd` (TIMESTAMPTZ, NULLABLE): Range end for `TIME_RANGE`.
- `entryPayload` (JSONB, NULLABLE): Validated runtime metadata (e.g. gym workout sets, prayer sub-item marks, running distance/pace, relapse trigger tags).
- `notes` (TEXT, NULLABLE): User reflection notes.
- `trackerVersion` (INTEGER, DEFAULT 1): Active `TrackerVersion` number at entry creation time.
- `createdAt` / `updatedAt` (TIMESTAMPTZ).
- *Performance Indexes*:
  - `@@index([userId, localDate])`: Instant retrieval of all logs for any given day.
  - `@@index([trackerId, localDate])`: Sequential chronological streak scans.
  - `@@index([userId, trackerId, occurredAt])`: Range and time-series aggregation.

---

### E. Decoupled One-Time Tasks

#### 10. `Task` (Table: `task`)
Single-occurrence actionable tasks. Never confused with recurring habit trackers.
- `id` (TEXT, PK).
- `userId` (TEXT, NOT NULL, FK -> `user.id` ON DELETE CASCADE).
- `lifeAreaId` (TEXT, NULLABLE, FK -> `life_area.id` ON DELETE SET NULL).
- `title` (TEXT, NOT NULL): Task headline.
- `description` (TEXT, NULLABLE): Extended details or instructions.
- `dueDate` (TEXT, NULLABLE): Local calendar target date `YYYY-MM-DD`. **Never automatically rolls over to tomorrow if uncompleted.**
- `priority` (`TaskPriority` ENUM, DEFAULT `'MEDIUM'`): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- `status` (`TaskStatus` ENUM, DEFAULT `'TODO'`): `TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- `completedAt` (TIMESTAMPTZ, NULLABLE): Timestamp of completion.
- `tags` (JSONB, DEFAULT `'[]'`): String array of tag labels.
- `sortOrder` (INTEGER, DEFAULT 0): Custom manual order in backlog.
- `createdAt` / `updatedAt` (TIMESTAMPTZ).
- *Indexes*:
  - `@@index([userId, status, dueDate])`: Instant filtering of pending vs completed tasks.
  - `@@index([userId, lifeAreaId])`: Life area task filtering.

---

## 3. Migration File & Safe Application Policy

- Initial migration created at:
  [`prisma/migrations/20261105000000_init/migration.sql`](file:///home/taha/next-projects/athar/prisma/migrations/20261105000000_init/migration.sql)
- Migration Lockfile:
  [`prisma/migrations/migration_lock.toml`](file:///home/taha/next-projects/athar/prisma/migrations/migration_lock.toml)

### Safe Deployment Rules
1. **Zero Database Resets**: Never execute `prisma migrate reset` on production or Supabase.
2. **Apply Migrations**: Execute `npm run db:migrate` or `prisma migrate deploy` using `DIRECT_URL`.
3. **No Forced Defaults**: All tables begin 100% empty; user onboardings are handled by interactive UI dialogs.

