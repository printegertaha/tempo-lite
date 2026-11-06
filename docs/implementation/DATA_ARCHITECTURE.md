# Athar (أثـر) — System Data Architecture Specification

> **Status**: APPROVED ARCHITECTURE  
> **Phase**: PHASE 1 DELIVERABLE  
> **Target Engine**: Next.js 16 App Router · Supabase PostgreSQL · Prisma ORM · Better Auth · React 19  
> **Security Baseline**: Multi-Tenant Server Isolation · Zero Client Trust · Zero Mock Data  

---

## 1. Architectural Vision & Core Principles

Athar is engineered as a high-precision, multi-tenant lifestyle tracking platform designed Arabic-first. It replaces static prototypes with a fully dynamic, database-backed engine where **the application starts 100% empty for every user**.

### The 7 Invariant Principles

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           1. EMPTY CANVAS                              │
  │ Every user starts with 0 habits, 0 categories, and 0 pre-seeded tasks. │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼────────────────────────────────────┐
  │                        2. USER-OWNED DOMAINS                           │
  │ All Life Areas (Categories) and Trackers are user-defined and mutable. │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼────────────────────────────────────┐
  │                    3. POLYMORPHIC TRACKER ENGINE                       │
  │ Generic schema handles 7+ tracking modalities without table mutations. │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼────────────────────────────────────┐
  │                    4. ZERO-OVERWRITE IMMUTABILITY                      │
  │ Tracker adjustments never rewrite historical logs or past streak evaluations.
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼────────────────────────────────────┐
  │                     5. DUAL-AXIS TEMPORAL MODEL                        │
  │ Calendar date (localDate: YYYY-MM-DD) + True UTC timestamp (occurredAt).│
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼────────────────────────────────────┐
  │                      6. STRICT TASK DECOUPLING                         │
  │ Single-occurrence action items are structurally distinct from trackers.│
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼────────────────────────────────────┐
  │                     7. SERVER-DERIVED IDENTITY                         │
  │ userId is strictly derived from Better Auth session. Never trust clients.│
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Domain Model & Entities

### A. User & Authentication (Better Auth Domain)
- **Authority**: Better Auth owns users, accounts, sessions, and verification.
- **Provider**: Google OAuth is the exclusive authentication provider.
- **Tenant Isolation**: Every database row across all domain tables has a foreign key `userId` referencing `User(id)`.
- **User Settings**: 1-to-1 extension table (`UserSettings`) storing personal preferences:
  - `timezone`: IANA identifier (e.g. `Asia/Riyadh`, `Africa/Cairo`, `Asia/Dubai`).
  - `language`: Interface language (default `ar`).
  - `weekStartDay`: Integer (0 = Sunday, 6 = Saturday; default 6 for Arab world).
  - `themeAccent`: Primary accent (e.g. `violet`, `emerald`, `amber`).
  - `dashboardConfig`: JSON storing widget visibility and ordering.

### B. Life Areas / Categories (`LifeArea`)
- Users group trackers and tasks into optional, customizable life spheres (e.g. "روحانيات", "صحة ولياقة", "تطوير مهني", "علوم شرعية").
- **No Default Seeding**: Empty upon account creation.
- **Full Lifecycle**: Users can rename, reorder (`sortOrder`), recolor, pause, or archive life areas.
- **Non-Destructive Deletion**: Deleting or archiving a life area unlinks (`ON DELETE SET NULL`) associated trackers and tasks; it **never** cascades to delete historical tracker logs.

### C. Dynamic Trackers (`Tracker`)
A single, generalized entity capable of representing any recurring habit, metric, or discipline without requiring database migrations:

Supported `TrackerMetricType`:
1. `BOOLEAN`: Binary completion (e.g., read morning Adhkar).
2. `COUNTER`: Incremental integer/float count with step size (e.g., cups of water, dhikr count, cigarettes avoided).
3. `NUMBER`: Quantitative measurement with physical unit (e.g., body weight in kg, blood pressure, pages read).
4. `DURATION`: Elapsed focused time in seconds/minutes (e.g., deep programming session, study).
5. `TIME_RANGE`: Distinct start and end timestamps (e.g., sleep log from 23:15 to 07:30).
6. `CHECKLIST`: Ordered sub-items with boolean or multi-state values (e.g., 5 daily prayers with Sunnah/Jamaah options, routine checklist).
7. `AVOIDANCE`: Streak and abstinence tracker with urge/relapse logging (e.g., smoking cessation, sugar avoidance, screen time limits).

#### Tracker Attributes:
- **Identity & Presentation**: `name`, `slug` (unique per user), `description`, `icon` (Lucide icon identifier), `color` (Tailwind color token).
- **Organization**: `lifeAreaId` (optional FK), `priority` (integer), `sortOrder` (integer).
- **Metric Definition**: `metricType` (`TrackerMetricType`), `unit` (e.g. "دقيقة", "كوب", "صفحة", "كجم").
- **Target & Scheduling**:
  - `targetValue`: Float (optional baseline target per day/week).
  - `targetFrequency`: `DAILY`, `WEEKLY`, `CUSTOM`.
  - `scheduleConfig`: JSON storing active schedule (e.g. days of week `[0,1,2,3,4,5,6]`, prayer calculation preferences).
  - `trackerConfig`: JSON storing type-specific configuration (e.g. counter step sizes, checklist item definitions, avoidance relapse limits).
  - `displayPreferences`: JSON storing card presentation preferences.
- **Lifecycle & State**:
  - `isPaused`: Temporarily halted (not marked as failed in streaks).
  - `isArchived`: Removed from active daily view, but all historical entries remain visible in analytics and calendar.
  - `version`: Integer tracking configuration changes.

### D. Historical Integrity & Versioning Engine (`TrackerVersion`)
**The Problem**: If a user sets a daily reading target of 30 minutes in January, succeeds for 3 months, and in April raises the target to 60 minutes, a naive system recalculates past days against the new 60-minute target and corrupts historical streaks.

**The Solution: Dual-Level Versioning Architecture**:
1. **Target & Config Snapshots (`TrackerVersion`)**:
   - Whenever a user modifies the `targetValue`, `metricType`, `trackerConfig`, or `scheduleConfig` of a tracker, a immutable snapshot is written to `TrackerVersion`.
   - Stores: `trackerId`, `versionNumber`, `name`, `targetValue`, `trackerConfig`, `scheduleConfig`, `validFrom`, `validTo`.
   - The main `Tracker` increments its `version` counter.
2. **Entry-Level Linkage (`TrackerEntry.trackerVersion`)**:
   - Every logged entry records the `trackerVersion` active at the moment of recording.
   - When generating historical charts or streak reports for a past date, the engine joins with the exact `TrackerVersion` active during that time window.
   - Archiving a tracker retains all versions and all entries completely untouched.

### E. Tracker Entries (`TrackerEntry`)
Supports recording single or multiple events per day (e.g., 4 distinct coffee logs, 2 separate gym sessions, 5 prayer marks throughout the day).

- **Multi-Entry Flexibility**: Multiple rows with the same `(trackerId, localDate)` are natively supported.
- **Polymorphic Storage Strategy**:
  - `valueBoolean`: Boolean? (for binary habits).
  - `valueNumeric`: Float? (for counter / number / measurements).
  - `valueDuration`: Integer? (duration in seconds).
  - `timeRangeStart`: DateTime? (for time-range trackers).
  - `timeRangeEnd`: DateTime? (for time-range trackers).
  - `entryPayload`: JSON? (validated structured payload for complex types like checklist states, workout sets, relapse details).
  - `notes`: Text? (user comments or reflection).

---

## 3. Date, Time & Timezone Architecture

Lifestyle tracking across global timezones requires a strict distinction between physical time and calendar buckets:

```
Physical Event in Tokyo (UTC+9): 2026-11-06 06:30 JST
  │
  ├── Physical Timestamp (UTC): 2026-11-05T21:30:00.000Z  -> Stored in `occurredAt`
  │
  └── User Calendar Day:        "2026-11-06"              -> Stored in `localDate`
```

### The Dual-Axis Temporal Strategy:
1. **`localDate` (String: `YYYY-MM-DD`)**:
   - Derived on the server using the authenticated user's IANA timezone (`UserSettings.timezone`).
   - Represents the local 24-hour day bucket the user experiences.
   - Indexed heavily for daily dashboards, calendar aggregations, and streak calculations.
   - Prevents timezone drift where night owls logging at 01:00 AM get logged to the wrong calendar day.
2. **`occurredAt` (DateTime / TIMESTAMPTZ in UTC)**:
   - Stores the true physical point in time when the action occurred.
   - Used for chronological ordering on the daily timeline (`TodayTimeline`), calculating rest intervals, and live timer drift prevention.

---

## 4. Decoupled Tasks Architecture (`Task`)

Single-occurrence to-dos must not be modeled as trackers:

| Dimension | Dynamic Tracker (`Tracker`) | One-Time Task (`Task`) |
|---|---|---|
| **Nature** | Recurring habit, ongoing discipline, or continuous metric. | Discrete, actionable deliverable. |
| **Lifecycle** | Continuous (daily, weekly), paused, or archived. | `TODO` -> `IN_PROGRESS` -> `COMPLETED` / `CANCELLED`. |
| **History** | Endless time-series of `TrackerEntry` points. | Single lifecycle record with `completedAt`. |
| **Overdue Behavior** | Resets every day/schedule cycle; streaks update. | **Never automatically rolls over**. Stays linked to original `dueDate` or backlog. |
| **Categorization** | Optionally linked to `LifeArea`. | Optionally linked to `LifeArea`. |

---

## 5. Runtime Validation Architecture (Zod Schemas)

Arbitrary JSON is strictly prohibited from entering PostgreSQL. All `trackerConfig`, `scheduleConfig`, and `entryPayload` fields are validated at runtime before reaching Prisma:

```
Client Request
      │
      ▼
Server Action / API Route (derives authenticated userId)
      │
      ▼
Zod Validator (Dispatched by tracker.metricType)
  ├── BooleanEntrySchema
  ├── CounterEntrySchema
  ├── NumberEntrySchema
  ├── DurationEntrySchema
  ├── TimeRangeEntrySchema
  ├── ChecklistEntrySchema
  └── AvoidanceEntrySchema
      │
      ▼ (Valid data only)
Prisma ORM Mutation -> Supabase PostgreSQL
```

---

## 6. Multi-Tenant Security & Access Control

1. **Server-Side Session Ownership**:
   - `userId` is obtained exclusively via `auth.api.getSession({ headers: await headers() })`.
   - Never accept `userId` from client request bodies or query parameters.
2. **Tenant Boundary Enforcement**:
   - Every Prisma query includes `where: { userId: session.user.id }`.
   - Unique constraints on scoped fields always include `userId` (e.g., `@@unique([userId, slug])`).
3. **Database Credentials Isolation**:
   - Direct database connection strings (`DATABASE_URL`, `DIRECT_URL`) remain exclusively server-side.
   - Supabase Row Level Security (RLS) can be enabled as a defense-in-depth barrier if direct PostgreSQL access is ever granted.

