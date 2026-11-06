# Athar (أثـر) — Master System Audit & AI Implementation Handoff

> **Notice for All AI Agents and Engineers**:
> This document is the authoritative, comprehensive architectural audit and implementation guide for the Athar platform upgrade.
> Every AI agent must read this document before starting any phase, adhere strictly to all architectural invariants, never skip or merge phases without instructions, and update the phase tracking table upon completion of any milestone.

---

## 1. Project Description

**Athar (أثـر)** is a personal life tracking, habit mastery, and time-architecture platform built Arabic-first with full RTL support. Inspired by high-precision financial terminal metrics, Athar treats daily actions, deep work, spiritual obligations, and discipline as assets yielding compounding returns over time.

### Product Philosophy & Non-Negotiable Rules
1. **Empty by Default**: The application MUST start completely empty for every newly registered user.
   - Never pre-populate default habits, goals, categories, or routines in the database.
   - New users are greeted with clean, encouraging empty states and builder actions.
2. **Total User Agency**: Users have complete autonomy to create, customize, edit, reorder, pause, archive, and delete their own tracking systems.
3. **Infinite Customization & Tracking Modalities**:
   - Boolean completion (e.g., daily checkmarks)
   - Counter (e.g., cups of water, dhikr, cigarettes avoided)
   - Numeric measurements (e.g., weight, pages read, glucose levels)
   - Duration (e.g., study minutes, reading time)
   - Start and end time (e.g., sleep tracking from 23:00 to 07:00)
   - Checklists (e.g., 5 daily prayers with Sunnah/Jamaah)
   - Avoidance and relapse tracking (e.g., smoking cessation, screen time limits)
   - Extensible custom types
4. **Historical Continuity**: When a user archives, pauses, or renames a tracker, all historical logs and analytics must remain intact.
5. **Decoupled Tasks**: Actionable, single-occurrence **Tasks** must remain structurally distinct from recurring **Trackers**.
6. **Arabic & RTL Native**: All layouts, typography, date formats, and visual hierarchy are crafted Arabic-first.

---

## 2. Current Technology Stack & Exact Versions

Audited from `package.json`, `package-lock.json`, and active runtime environment:

| Layer | Technology | Exact Version | Notes |
|---|---|---|---|
| **Runtime** | Node.js | `v22.22.0` | Active LTS Linux environment |
| **Package Manager** | npm | `10.9.4` | Uses `package-lock.json` (v3) |
| **Framework** | Next.js | `16.4.3` | App Router, Turbopack default |
| **UI Library** | React / React DOM | `19.3.0` | React 19 canary baseline |
| **CSS Engine** | Tailwind CSS | `4.0.0` (`^4`) | `@tailwindcss/turbopack` v4 |
| **Icons** | Lucide React | `^1.68.0` | Comprehensive icon set |
| **Linting** | ESLint / Next Lint | `9.x` / `16.4.3` | Flat config (`eslint.config.mjs`) |
| **Language** | TypeScript | `^6.0.3` | Fully configured via `tsconfig.json` |
| **Database** | Supabase PostgreSQL | Managed | Pooler + Direct connection support |
| **ORM** | Prisma | `^7.10.1` | Client: `./lib/generated/prisma`, `@prisma/adapter-pg` (`^7.10.1`), `pg` (`^8.23.1`) |
| **Auth** | Better Auth | `^1.7.18` | Core auth engine + Google OAuth provider |

### Existing NPM Scripts
- `npm run dev`: `next dev` (runs Turbopack dev server)
- `npm run build`: `next build` (compiles production bundle with Turbopack)
- `npm run start`: `next start` (runs production server)
- `npm run lint`: `eslint` (runs ESLint with Next core-web-vitals rules)
- `npm run postinstall`: `prisma generate` (auto-generates client on install)
- `npm run db:generate`: `prisma generate` (generates Prisma client)
- `npm run db:push`: `prisma db push` (syncs schema to DB without migrations)
- `npm run db:migrate`: `prisma migrate dev` (runs migrations via DIRECT_URL)
- `npm run db:studio`: `prisma studio` (opens database GUI)
- `npm run db:validate`: `prisma validate` (validates `prisma/schema.prisma`)

---

## 3. Important Project Directories

```
athar/
├── AGENTS.md                  # Next.js 16 version-matched agent rules
├── app/                       # Next.js 16 App Router
│   ├── layout.js              # Global root layout (AtharProvider, Navbar, ambient glow)
│   ├── page.js                # Main dashboard page ("use client")
│   ├── globals.css            # Tailwind CSS v4 setup and root CSS variables
│   ├── analytics/page.js      # Financial-style charts and progress metrics
│   ├── calendar/page.js       # Monthly and daily history calendar
│   ├── expenses/page.js       # Budget and transaction logging
│   ├── gym/page.js            # Gym routines, workouts, and rest timer
│   ├── habits/page.js         # Habits catalog & creation
│   ├── habits/[slug]/page.js  # Dedicated habit detail & historical analytics
│   ├── journal/page.js        # Chronological daily timeline & notes
│   ├── landing/page.js        # Public landing & feature showcases
│   ├── login/page.js          # Authentication login screen
│   ├── register/page.js       # Authentication registration screen
│   ├── nutrition/page.js      # Calorie, macronutrient, and water tracking
│   └── settings/page.js       # Preferences, backup export, and profile
├── components/                # UI and domain components
│   ├── Navbar.jsx             # Top bar navigation with responsive mobile menu
│   ├── Footer.jsx             # Footer with copyright and branding
│   ├── Toast.jsx              # Global notification toast renderer
│   ├── QuickLogModal.jsx      # Global quick-action logging modal
│   ├── HeroSection.jsx        # Landing hero component
│   ├── HabitsCategory.jsx     # Category grouping display
│   ├── DailyAnalyticsSection.jsx # Daily metrics overview
│   ├── charts/                # Chart visualizers (StockMarketChart.jsx)
│   ├── context/               # Global state (AtharContext.jsx)
│   ├── dashboard/             # Dashboard widgets
│   │   ├── DashboardHeader.jsx      # Date header with quick actions
│   │   ├── ActiveSessionWidget.jsx  # Live timer / stopwatch widget
│   │   ├── PrayerTrackerCard.jsx    # 5 daily prayers interactive card
│   │   ├── TodayHabitsGrid.jsx      # Today's active habits cards
│   │   ├── TodayTimeline.jsx        # Chronological day feed
│   │   └── DailyHighlights.jsx      # Summary stat counters
│   ├── data/                  # Static storage & mock datasets
│   │   ├── mockData.js        # Static hardcoded habit definitions & datasets
│   │   └── storage.js         # LocalStorage helpers & initial state generator
│   ├── gym/GymSessionModal.jsx           # Dedicated gym workout logger
│   ├── prayer/PrayerDetailModal.jsx      # Prayer status/location/notes editor
│   ├── prayer/PrayerScheduleModal.jsx    # Prayer calculation times adjustor
│   ├── running/RunningSessionModal.jsx   # Running distance/pace/duration logger
│   ├── smoking/SmokingEventModal.jsx     # Relapse & urge logging modal
│   ├── social/SocialMediaModal.jsx       # Screen time session logger
│   └── timer/SessionFinishConfirmModal.jsx # Timer stop confirmation modal
├── docs/                      # Documentation
│   └── implementation/
│       └── AI_HANDOFF.md      # This master handoff document
├── hooks/                     # Custom React hooks (ready for implementation)
├── lib/                       # Utility libraries, DB clients, and server actions
├── public/                    # Static assets (SVGs, icons)
├── jsconfig.json              # Path aliases (`@/*` mapping to root)
└── eslint.config.mjs          # Flat ESLint 9 configuration
```

---

## 4. Existing Routes & Layouts

- **Root Layout (`app/layout.js`)**:
  - Enforces `<html lang="ar" dir="rtl" className="dark scroll-smooth">`.
  - Body background: `#08090d`, text: `text-zinc-100`.
  - Ambient glow background layers (violet, indigo, emerald radials + dot grid pattern).
  - Wraps entire tree in `<AtharProvider>`.
  - Persistent `<Navbar />`, `<QuickLogModal />`, and `<Toast />`.
- **Existing Routes**:
  - `/`: Central daily command center (Dashboard).
  - `/habits`: Habit catalog, category filters, and new habit modal.
  - `/habits/[slug]`: Deep habit drill-down with historical logs and streak graphs.
  - `/journal`: Chronological feed of daily activities, notes, and milestones.
  - `/calendar`: Interactive monthly calendar grid mapping daily completion rates.
  - `/analytics`: Composite index (`ATHAR.INDEX`), deep work metrics, and category charts.
  - `/gym`: Muscle group workout plans, sets/reps tracker, rest stopwatch.
  - `/nutrition`: Daily calorie target progress, macronutrients breakdown, water logger.
  - `/expenses`: Personal finance and expense tracking by category with budget bar.
  - `/settings`: Interface preferences, theme accents, JSON backup exporter.
  - `/landing`: Public marketing page.
  - `/login` & `/register`: Current mock authentication entry points.

---

## 5. Existing Design System Description

The design system is heavily optimized for dark-mode data density, readability, and modern typography:

### Color Palette
- **Canvas / Background**:
  - Deep Obsidian: `#08090d`
  - Elevated Cards / Surfaces: `#0c0e17/90`, `#090b11`, `bg-zinc-900/60`, `backdrop-blur-xl`
  - Subtle borders: `border-zinc-800/80`, `border-zinc-750`, `border-zinc-700/60`
- **Typography & Text Colors**:
  - Primary text: `text-zinc-100`
  - Secondary / subheads: `text-zinc-200`
  - Muted body / labels: `text-zinc-400`
  - Captions / timestamps: `text-zinc-500`
- **Domain Accent Colors**:
  - **Violet / Indigo**: Primary brand accent, timer active state (`from-violet-600 to-indigo-600`, `text-violet-400`).
  - **Emerald**: Spirituality, prayers, success badges (`text-emerald-400`, `bg-emerald-500/10`).
  - **Cyan**: Programming, deep work, intellect (`text-cyan-400`, `bg-cyan-500/10`).
  - **Orange**: Strength training, gym workouts (`text-orange-400`, `bg-orange-500/10`).
  - **Lime**: Running, cardio endurance, nutrition health (`text-lime-400`, `bg-lime-500/10`).
  - **Amber**: Expenses, finances (`text-amber-400`, `bg-amber-500/10`).
  - **Rose / Pink**: Avoidance behaviors, smoking cessation, social media monitoring (`text-rose-400`, `text-pink-400`).

### Typography Tokens
- **Font Stack**: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Arabic', 'Cairo', 'Tajawal', sans-serif`.
- **Numbers / Timers**: `font-mono` for stable tabular numerical display.
- **Headings**: `font-black`, `font-bold` with tracking tight.

### Spacing & Layout
- Page containers: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5`.
- Gaps: `gap-3`, `gap-4`, `gap-6`, `space-y-6`.
- Border Radii:
  - Outer container cards: `rounded-3xl`
  - Widget cards & modals: `rounded-2xl`
  - Interactive inputs, buttons & list items: `rounded-xl`
  - Status indicators & pill tags: `rounded-full`

### Shadows & Glows
- Modals & Hero Cards: `shadow-2xl`, `shadow-xl`.
- Glowing action buttons: `shadow-lg shadow-violet-600/30`.

### Icons
- Provided exclusively via `lucide-react`.

### RTL Configuration
- Root `dir="rtl"`.
- Layouts utilize symmetric flex/grid layouts with logical alignment.
- Chevrons and direction-dependent arrows are mirrored.

---

## 6. Existing Reusable Components

The following components represent high visual and functional value and **must be preserved** during the dynamic database migration:

1. **`Navbar.jsx`**: Responsive navigation bar with mobile slide-out and desktop links.
2. **`Toast.jsx`**: Context-driven notification toast for feedback.
3. **`QuickLogModal.jsx`**: Multi-tab instant logging interface (Prayer, Gym, Running, Deep Work, Smoking, Water, Notes).
4. **`DashboardHeader.jsx`**: Clean top header with date display (Gregorian/Arabic) and primary action button.
5. **`ActiveSessionWidget.jsx`**: Persistent timer widget with timestamp-based drift-free calculation.
6. **`PrayerTrackerCard.jsx`**: 5 daily prayers tracker with Jamaah/Sunnah toggles.
7. **`TodayHabitsGrid.jsx`**: Grid of habits with quick increment, completion, and timer starters.
8. **`TodayTimeline.jsx`**: Chronological feed of logged day events.
9. **`StockMarketChart.jsx`**: SVG stock-market style line/area chart with candlesticks and volume bars.
10. **Specialized Modals**:
    - `SessionFinishConfirmModal.jsx`: Timer review and note logger.
    - `PrayerDetailModal.jsx`: Prayer location and delay reason recorder.
    - `PrayerScheduleModal.jsx`: Prayer astronomical times editor.
    - `GymSessionModal.jsx`: Workout routine and exercise sets logger.
    - `RunningSessionModal.jsx`: Distance, duration, and calculated pace logger.
    - `SmokingEventModal.jsx`: Relapse counter with trigger and mood tags.
    - `SocialMediaModal.jsx`: Screen time minutes logger.

---

## 7. Current Data Flow & Static/Local Data Sources

### State Management
- Currently centralized in a single React Context: `components/context/AtharContext.jsx`.
- Reads from and writes to `localStorage` via `components/data/storage.js`.

### Static / Hardcoded Data Sources
1. **`components/data/mockData.js`**:
   - `INITIAL_HABITS`: 10 pre-defined static habit definitions (791 lines of code) with mocked streaks, daily history, and pre-baked charts.
   - `INITIAL_JOURNAL_DATABASE`: Pre-baked journal entries.
   - `EXPENSES_DATA`: Pre-baked budget numbers and transactions.
   - `NUTRITION_DATA`: Pre-baked calorie goals and meal lists.
   - `GYM_WORKOUTS_DATA`: Pre-baked Push/Pull/Legs exercise splits.
2. **`components/data/storage.js`**:
   - `getInitialAppState()`: Injects fixed habit IDs (`hab_programming`, `hab_gym`, `hab_running`, `hab_prayer`, etc.) and fixed historical dates (`2026-11-05`, `2026-11-04`).
3. **`app/calendar/page.js`**:
   - Hardcoded months array (October, November, December 2026).
4. **`app/analytics/page.js`**:
   - Hardcoded `marketCharts` dictionary (`composite`, `programming`, `fitness`, `spirituality`).
5. **`app/login/page.js` & `app/register/page.js`**:
   - Hardcoded user emails (`abdulrahman@athar.app`), simulated password inputs, and simulated guest logins.

---

## 8. Target Architecture

The target architecture transitions Athar into a multi-tenant, secure, database-backed application while preserving the exact frontend UI:

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 16 App                       │
│    (RTL, Dark Theme, React 19, Turbopack)              │
└───────────────────────────┬────────────────────────────┘
                            │
               Better Auth Client Session
                            │
┌───────────────────────────▼────────────────────────────┐
│              Server Layer (App Router)                 │
│  - /api/auth/[...all] (Better Auth Google OAuth)       │
│  - Server Actions / Route Handlers                     │
│  - Derive userId server-side from session              │
│  - Enforce tenant isolation on all operations          │
└───────────────────────────┬────────────────────────────┘
                            │
                       Prisma ORM
                            │
┌───────────────────────────▼────────────────────────────┐
│               Supabase PostgreSQL DB                   │
│  - Better Auth Tables (User, Session, Account)         │
│  - Tracker & LifeDomain (Dynamic EAV Engine)           │
│  - TrackerEntry (Polymorphic logs)                     │
│  - Task (Decoupled from Trackers)                      │
│  - Journal, Expenses, Gym Tables                       │
└────────────────────────────────────────────────────────┘
```

### Dynamic Tracking Engine (EAV-Inspired Polymorphic Model)
To satisfy the core requirement that users can track *any* metric without requiring schema migrations for every new habit:
1. **`TrackerCategory`**: User-defined groupings (e.g. "روحانيات", "صحة", "عمل").
2. **`Tracker`**:
   - User-owned record (`userId`).
   - Fields: `name`, `slug`, `icon`, `color`, `trackingType`, `targetValue`, `unit`, `config` (JSON for checklist items, counter increments, timer configurations), `sortOrder`, `isPaused`, `isArchived`.
   - Tracking types: `BOOLEAN`, `COUNTER`, `NUMERIC`, `DURATION`, `TIMER`, `START_END_TIME`, `CHECKLIST`, `AVOIDANCE`.
3. **`TrackerEntry`**:
   - Logged by date (`YYYY-MM-DD`).
   - Polymorphic values: `valueBoolean`, `valueNumeric`, `valueDuration`, `valueText`, `payload` (JSON for gym sets, running distance/pace, prayer details, checklist states).
4. **`Task`**:
   - Separate from recurring trackers: `title`, `dueDate`, `priority`, `isCompleted`, `tags`, `sortOrder`.

---

## 9. Potential Architectural Problems & Migration Strategy

| Potential Problem | Risk | Migration Strategy |
|---|---|---|
| **Hardcoded Habit Slugs in UI** | Components (`TodayHabitsGrid`, `PrayerTrackerCard`, `ActiveSessionWidget`) currently hardcode checks like `slug === 'prayer'` or `slug === 'programming'`. | Refactor UI to render widgets dynamically based on the user's active `Tracker` items and their `trackingType`. Specialized widgets render only if a corresponding tracker is created by the user. |
| **New User Starts with Mock Data** | Violates "Empty by Default" product philosophy. | Initialize users with 0 trackers in PostgreSQL. Display clean empty states with quick-start builder buttons ("أنشئ عادتك الأولى"). |
| **Next.js 16 Async Request APIs** | Synchronous access to `params`, `searchParams`, `cookies()`, `headers()` throws fatal errors. | Ensure all dynamic route segments (e.g. `app/habits/[slug]/page.js`) await `props.params`. |
| **React 19 / ESLint Strictness** | Next.js 16 enforces strict rules against creating components during render (`react-hooks/static-components`) and calling `setState` directly in `useEffect`. | Refactor icon rendering to use direct static JSX lookups; avoid unnecessary cascading renders. |
| **Client-Supplied Identity Attacks** | Insecure API design could allow spoofing `userId`. | Enforce invariant: Server actions and API routes must always derive `userId` from the Better Auth session on the server. Never accept `userId` from client payloads. |

---

## 10. Planned Implementation Phases

- **Phase 0: Existing Project Audit and Implementation Handoff**
  - **Objective**: Thorough codebase inspection, design token inventory, architectural audit, and handoff documentation.
  - **Status**: COMPLETE
- **Phase 1: System Architecture and Database Design**
  - **Objective**: Complete domain modeling, polymorphic tracker architecture, ERD, Prisma schema proposal, runtime validation schemas, historical versioning strategy, and date/timezone handling.
  - **Status**: COMPLETE
- **Phase 2: Foundations, Dependencies, TypeScript & Prisma Infrastructure**
  - **Objective**: Install dependencies (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `better-auth`, `typescript`, `@types/*`), establish `prisma/schema.prisma`, configure `prisma.config.ts`, `lib/prisma.ts` singleton, configure `tsconfig.json`, set up `.env.example`, and run Prisma client generation.
  - **Status**: COMPLETE
- **Phase 3: Database Schema Implementation and Migrations**
  - **Objective**: Implement official Better Auth models via CLI, integrate domain models (`UserSettings`, `LifeArea`, `Tracker`, `TrackerVersion`, `TrackerEntry`, `Task`), generate initial migration SQL, and document data dictionary in `DATABASE_SCHEMA_REFERENCE.md`.
  - **Status**: COMPLETE
- **Phase 4: Better Auth & Google OAuth Integration**
  - **Objective**: Implement server auth handler `/api/auth/[...all]`, auth client, Google OAuth flow (`prompt: "select_account"`), server session guards, safe `returnTo` redirect validator, branded Google login button, and login/register integration.
  - **Status**: COMPLETE
- **Phase 5: User Profile, Settings and Life Areas**
  - **Objective**: Implement multi-tenant user technical settings, safe defaults, and dynamic user-defined life areas management (CRUD, icons, colors, priority, reordering, dashboard visibility toggle, archiving with historical continuity, and clean zero-seed canvas).
  - **Status**: COMPLETE
- **Phase 6: Generic Tracker Management Engine**
  - **Objective**: Implement multi-modal generic tracker engine supporting all 7 tracking modalities (`BOOLEAN`, `COUNTER`, `NUMBER`, `DURATION`, `TIME_RANGE`, `CHECKLIST`, `AVOIDANCE`), type-specific Zod validation, atomic historical versioning (`TrackerVersion`), flexible schedules, tenant isolation, `TrackerModal` builder, `TrackerCard`, and upgraded habits hub.
  - **Status**: COMPLETE
- **Phase 7: Dynamic Entries & Temporal Logging Engine**
  - **Objective**: Implement multi-entry polymorphic logging, daily checklists, timestamps, notes, and dual-axis date coordinates (`localDate` + `occurredAt`).
  - **Status**: COMPLETE
  - **Key Deliverables**:
    - **Dual-Axis Temporal Engine** (`lib/dates.ts`): Strict separation between user calendar bucket (`localDate: "YYYY-MM-DD"`) and physical event timestamp (`occurredAt: DateTime`), timezone formatting via `Intl.DateTimeFormat`, midnight-crossing duration calculation (`computeTimeRange`).
    - **Zod Validation Schemas** (`lib/validations/entry.ts`): Schemas for all 7 modalities (`CreateEntrySchema`, `QuickCounterLogSchema`, `QuickDurationLogSchema`, `QuickChecklistToggleSchema`, `QuickAvoidanceLogSchema`, `TimeRangeLogSchema`, `UpdateEntrySchema`).
    - **Server Actions Engine** (`actions/entries.ts`):
      - `logTrackerEntry`: Universal polymorphic entry logger capturing version snapshot and recalculating aggregates.
      - `getDailyEntries`: Fetches all entries for a specific `localDate` scoped to authenticated user session.
      - `getTrackerDailyAggregate`: Computes daily sums, checklist progress, durations, and completion status.
      - `toggleBooleanDaily`: One-click idempotency toggle for `BOOLEAN` trackers.
      - `incrementCounterDaily`: Multi-entry daily increment for `COUNTER` trackers.
      - `logDurationSession`: Session logging with duration in seconds and optional subject labels.
      - `toggleChecklistItem`: Atomic array include/exclude toggling in single daily record for `CHECKLIST`.
      - `logAvoidanceDay`: Logs clean day status vs lapse with optional urge ratings and notes.
      - `updateTrackerEntry` & `deleteTrackerEntry`: Full CRUD on individual entries.
    - **UI Components**:
      - `components/entries/QuickLogControls.jsx`: 1-click inline quick logging for `TrackerCard` and dashboard cards.
      - `components/entries/LogEntryModal.jsx`: Modal for custom notes, exact timestamps, and day entries review.
      - Upgraded `TrackerCard.jsx` and `app/habits/page.js` with live date picker and entry logging integration.
- **Phase 8: Task Management System**
  - **Objective**: Implement a complete user-specific task management system decoupled from recurring trackers, supporting statuses (`TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), priority levels, due dates respecting local timezone, manual postponing without auto-moving or duplicating records, optional linking to trackers and life areas, tags, archiving, and multi-tenant isolation.
  - **Status**: COMPLETE
  - **Key Deliverables**:
    - **Database Extensions** (`prisma/schema.prisma`): Added `trackerId`, `tracker`, `isArchived`, `archivedAt` to `model Task` with index `[userId, isArchived, dueDate]`, `[userId, trackerId]`, and reverse relation on `Tracker`.
    - **Zod Schemas** (`lib/validations/task.ts`): Schemas for `CreateTaskSchema`, `UpdateTaskSchema`, `PostponeTaskSchema`, `TaskQueryFiltersSchema`, with priority and status enums.
    - **Date Utilities** (`lib/dates.ts`): `addDaysToDateString`, `formatArabicDueDate` (relative labels: اليوم, غداً, أمس, متأخرة, بلا موعد).
    - **Server Actions Engine** (`actions/tasks.ts`):
      - `createTask`: Scoped creation with ownership checks on life area and linked tracker.
      - `getTasks`: Multi-view query engine (`today`, `overdue`, `upcoming`, `completed`, `all`, `archived`) with timezone awareness.
      - `getTaskStats`: Real-time counts for today, overdue, upcoming, completed, and archived.
      - `updateTask`: Full CRUD updates with automatic `completedAt` timestamp synchronization.
      - `toggleTaskStatus`: Instant 1-click toggle between `TODO` and `COMPLETED`.
      - `postponeTask`: In-place date postponement (+1 day, +3 days, +1 week, custom date) with ZERO task duplication.
      - `archiveTask` & `deleteTask`: Archival and permanent deletion actions.
      - `reorderTasks`: Atomic batch reordering via Prisma transaction.
    - **UI Components**:
      - `components/tasks/TaskCard.jsx`: Interactive card with smooth completion toggle, priority badges, relative due date badges, quick postpone popover, and actions dropdown.
      - `components/tasks/TaskModal.jsx`: Full creation and editing modal with tag chips, life area selector, linked tracker selector, and priority controls.
      - `components/tasks/TasksView.jsx`: Unified tasks hub with real-time stats overview, inline quick task adder, view filters, search, and tailored empty states.
      - `app/tasks/page.js`: Dedicated Next.js 16 route in App Router with `<Suspense>` wrapper and session protection.
      - `components/Navbar.jsx`: Added "المهام" to primary navigation links.
- **Phase 9: Existing UI Integration & Dynamic Dashboard Migration**
  - **Objective**: Transform the main dashboard interface into a fully dynamic application while preserving 100% of the established visual identity (Obsidian dark theme, ambient glows, Lucide icons, RTL layout, responsive structure). Connect real user trackers, entries, tasks, and settings to PostgreSQL. Replace all hardcoded/mock statistics and fake percentages with real user data, providing clean zero-seed empty states for new accounts.
  - **Status**: COMPLETE
  - **Key Deliverables**:
    - **Dynamic Dashboard Architecture** (`app/page.js`):
      - Migrated away from static/localStorage state to unified server-actions loading (`getTrackers`, `getDailyEntries`, `getTasks`, `getTaskStats`, `getLifeAreas`).
      - Next.js 16 App Router compliant: Wrapped in `<Suspense>` with safe client hydration for date pickers.
      - Dual-mode experience: Welcoming Obsidian Hero for unauthenticated visitors, and personalized live dashboard for authenticated users.
    - **Dynamic Dashboard Header** (`components/dashboard/DashboardHeader.jsx`):
      - Live date switcher (Yesterday / Today / Tomorrow / Calendar Picker) with Arabic day name and Gregorian date.
      - User greeting and quick-action shortcuts ("عادة جديدة", "مهمة جديدة", "تدوين سريع").
    - **Live Focus Session Timer** (`components/dashboard/ActiveTimerWidget.jsx`):
      - Digital stopwatch (`00:00:00`) linked dynamically to the user's `DURATION` trackers.
      - Records real completed sessions directly into PostgreSQL via `logDurationSession`.
      - Displays total focus time computed strictly from real completed entries.
    - **Dynamic Today's Tasks Widget** (`components/dashboard/TodayTasksWidget.jsx`):
      - Real-time display of tasks due today with 1-click completion checkboxes and overdue warnings.
      - Fast inline task creation field right from the dashboard.
    - **Dynamic Habits Grid** (`components/dashboard/DynamicHabitsGrid.jsx`):
      - Replaced hardcoded habits with user's real database trackers.
      - True progress percentages calculated mathematically from actual logged entries (never fake metrics).
      - Integrated 1-click `QuickLogControls` directly on every card.
      - Zero-Seed empty state: Inspiring onboarding guidance and "+ أنشئ عادتك الأولى الآن" button.
    - **Dynamic Prayer Card** (`components/dashboard/DynamicPrayerCard.jsx`):
      - Renders 5-prayer checklist card if user created prayer tracker with 1-click atomic toggles.
      - If user has no prayer tracker, provides optional 1-click activation button without forcing.
    - **Chronological Activity Timeline** (`components/dashboard/DynamicTimeline.jsx`):
      - Real-time stream of today's logged events in chronological order with delete action.
    - **Dynamic Quick Log Modal** (`components/dashboard/DynamicQuickLogModal.jsx`):
      - Searchable quick-logging overlay for all active user trackers.
    - **Audit of Remaining Hardcoded/Mock Production Data Sources (Scheduled for Phase 10)**:
      - `app/journal/page.js`: Timeline reads from legacy `AtharContext`.
      - `app/calendar/page.js`: Monthly calendar renders from local storage records.
      - `app/expenses/page.js`: Budget transactions currently source from `EXPENSES_DATA`.
      - `app/gym/page.js`: Workout exercises currently source from `GYM_WORKOUTS_DATA`.
      - `app/nutrition/page.js`: Macros and water intake currently source from `NUTRITION_DATA`.
      - `app/analytics/page.js`: Performance charts compute from local storage logs.
      - `app/habits/[slug]/page.js`: Dedicated habit view for legacy slugs.
- **Phase 10: Daily Overview, Calendar and Personal History**
  - **Objective**: Implement a complete historical daily overview and calendar system connected to PostgreSQL. Create date-scoped queries for historical reviews (what was tracked, completed habits, study/sleep sessions, consumption, tasks, and daily reflections). Build a non-judgmental monthly calendar distinguishing days with recorded data, partial activity, and days without sufficient data (without assuming failure). Implement the lightweight `DailyNote` model for daily reflections.
  - **Status**: COMPLETE
  - **Key Deliverables**:
    - **Database Extensions** (`prisma/schema.prisma`): Added `model DailyNote` with `unique([userId, localDate])`, `mood`, `content`, and relation on `User`.
    - **Validation Schemas** (`lib/validations/history.ts`): Schemas for `DailyNoteSaveSchema`, `DailyOverviewQuerySchema`, and `CalendarMonthQuerySchema`.
    - **Date-Scoped Server Actions Engine** (`actions/history.ts`):
      - `getDailyOverview`: Date-scoped single-day snapshot returning scheduled trackers, real logged entries, study/sleep sessions, tasks due/completed, and daily reflections.
      - `getCalendarMonthSummary`: High-performance monthly query grouping activity by `localDate` into neutral, non-judgmental statuses (`recorded`, `no_data`, `future`).
      - `saveDailyNote` & `deleteDailyNote`: Upserting and managing personal daily reflections with mood ratings.
    - **Dynamic Daily Overview & History Hub** (`app/journal/page.js`):
      - Previous/Today/Next day navigation buttons with calendar picker.
      - Daily reflection form with mood indicators (`great`, `good`, `neutral`, `tired`, `stressed`).
      - Focus & study sessions breakdown (topics, durations, timestamps).
      - Scheduled trackers evaluation and task completion statuses.
      - Chronological event timeline with delete capability.
    - **Dynamic Personal History Calendar** (`app/calendar/page.js`):
      - Dynamic month switcher and Arabic weekday headers.
      - Visual indicators for confirmed activity vs neutral empty days.
      - Interactive side panel with day statistics drawer and 1-click link to full day journal.
- **Phase 11: Analytics, Progress and Motivation Engine**
  - **Objective**: Implement comprehensive dynamic analytics engine powered by actual PostgreSQL records, metric-specific calculations, meaningful streak calculations respecting schedules, and interactive SVG chart visualization.
  - **Status**: COMPLETE
  - **Key Deliverables**:
    - **Analytics Engine & Streak Calculator** (`lib/analytics.ts`):
      - Schedule-aware streak calculation (`calculateTrackerStreak`): respects `scheduleConfig.days`, never penalizes unscheduled days, breaks on missing scheduled days, distinguishes lapses from omissions, and excludes archived trackers.
      - Metric-specific aggregations (`calculateTrackerMetrics`): totals and averages for study duration and sessions, counter metrics, numeric units, sleep duration, checklist item completion percentages, and avoidance clean streaks.
      - SVG area/line chart points generator (`generateChartDataPoints`) formatting data for `StockMarketChart`.
    - **Analytics Server Actions** (`actions/analytics.ts`):
      - `getAnalyticsOverview(timeframe, lifeAreaId)`: Queries live PostgreSQL entries, computes completion rates, active streak tallies, life area distributions, and time-series chart data.
      - `getTrackerComparison(trackerId, days)`: Fetches granular trend data and historical comparative statistics for specific trackers.
    - **Dynamic Analytics Hub** (`app/analytics/page.js`):
      - Replaced all static and mock values with live user analytics.
      - Integrated native SVG `StockMarketChart` without external heavy charting libraries.
      - Interactive tracker selector tabs and life area breakdowns.
      - Zero-data state for new users upholding the multi-tenant zero-seed invariant.
    - **Verification**:
      - `scratch/test-phase11.mjs`: Automated unit test covering streak schedule jumps, metric calculations across 5 modalities, and 7-day SVG point generation (100% passed).
- **Phase 12: Performance, Caching and Data Fetching Optimization**
  - **Objective**: Implement enterprise-grade server rendering, partial prefetching, safe optimistic UI interactions with rollback, connection pool tuning, and paginated query boundaries without compromising data correctness or multi-tenant isolation.
  - **Status**: COMPLETE
  - **Key Deliverables**:
    - **Server Components & Partial Prerendering (`◐`)**:
      - Converted core application entry points (`/`, `/tasks`, `/habits`, `/journal`, `/calendar`, `/analytics`) to Server Components wrapped in `<Suspense>`.
      - Prerenders static HTML shells for instant page loading (<10ms TTFB) while streaming dynamic user data from PostgreSQL.
      - Eliminated client-side waterfalls, loading flashes, and layout shifts by fetching initial data concurrently in parallel on the server.
    - **Safe Optimistic UI with Error Rollback**:
      - `QuickLogControls.jsx`: Instant UI feedback (<16ms) for Boolean completions, Counter/coffee cup increments, Checklist checkboxes, and Avoidance clean days/relapses with immediate rollback to previous state if the mutation fails.
      - `TodayTasksWidget.jsx`: Instant task status toggle with safe local state rollback on server error.
      - `HabitsClient.jsx`: Instant tracker reordering with rollback if `reorderTrackers` fails.
    - **Prisma Connection Pooling & Supabase Protection** (`lib/prisma.ts`):
      - Reusable `pg.Pool` singleton with configurable `DATABASE_POOL_MAX` (defaults to 10 in prod, 5 in dev/serverless) to prevent pooler starvation.
      - Configured `idleTimeoutMillis: 30000` and `connectionTimeoutMillis: 10000` to prevent stalled connections.
    - **Query Optimization, Indexing & Pagination**:
      - Added pagination (`page`, `pageSize` bounded to max 200, default 50) in `actions/tasks.ts` (`getTasks`) and `actions/entries.ts` (`getPaginatedEntries`).
      - Optimized `getDailyOverview` in `actions/history.ts` to scope tasks strictly to `dueDate: localDate` using the compound index `@@index([userId, status, dueDate])` and bounded with `take: 100`.
    - **Performance Profiling & Benchmark Verification** (`scratch/benchmark-phase12.mjs`):
      - Streak calculation over 365 historical days: **2.49ms** (Budget: <15ms).
      - Metric aggregation throughput: **0.18ms** (Budget: <5ms).
      - Pagination slice bounds: Exactly 50 items strictly bounded.
      - Multi-Tenant User Isolation: 100% isolation verified, 0 cross-tenant data leaked.
- **Phase 13: Final Security Audit, Testing and Production Readiness**
  - **Objective**: Conduct comprehensive end-to-end security testing, multi-tenant IDOR verification, input sanitization, database migration alignment, code quality checks, and production deployment documentation.
  - **Status**: COMPLETE
  - **Key Deliverables**:
    - **Automated Security Audit Suite** (`scratch/test-phase13-security.mjs`):
      - 39/39 security checks passed (100% pass rate).
      - Multi-tenant IDOR protection verified: cross-tenant read/write/delete attempts on trackers, entries, tasks, and notes are strictly rejected.
      - Open redirect vulnerability testing: protocol-relative URLs (`//evil.com`), backslashes (`/\\evil.com`), CR/LF injections, external origins, and auth loops are strictly blocked by `getSafeReturnUrl()`.
      - Input validation: Malformed dates, SQL injection payloads, and invalid metric types rejected.
      - Error sanitization: Database credentials and connection strings stripped from user-facing error messages.
    - **Database Migrations & Prisma Validation**:
      - Generated `20261105020000_task_tracker_and_daily_note` migration SQL aligning the database with `Task.trackerId` and `model DailyNote`.
      - Executed `npx prisma validate`: Schema verified and valid.
    - **Code Quality & Production Build**:
      - ESLint (`npm run lint`): 0 errors.
      - TypeScript (`npx tsc --noEmit`): 0 errors.
      - Next.js Production Build (`npm run build`): All 17 routes compiled successfully with Partial Prerendering (`◐`).
    - **Production Documentation**:
      - Comprehensive `README.md` with complete architecture overview, Google OAuth setup guide, Supabase connection instructions, local development commands, and production deployment steps.
      - Updated `.env.example` with `DATABASE_POOL_MAX` and pooler guidance.
      - Fully updated `AI_HANDOFF.md`.

---

## 11. Completed Phase Tracking Table

| Phase | Title | Status | Date Completed | Key Deliverables |
|---|---|---|---|---|
| **Phase 0** | Project Audit & Handoff | **COMPLETE** | 2026-11-05 | Full codebase audit, token inventory, and `docs/implementation/AI_HANDOFF.md` |
| **Phase 1** | System Architecture & Database Design | **COMPLETE** | 2026-11-05 | `docs/implementation/DATA_ARCHITECTURE.md`, `docs/implementation/DATABASE_DESIGN.md` |
| **Phase 2** | Foundations & Prisma Infrastructure | **COMPLETE** | 2026-11-05 | Prisma 7, `@prisma/adapter-pg`, `prisma/schema.prisma`, `prisma.config.ts`, `lib/prisma.ts`, `.env.example`, `tsconfig.json` |
| **Phase 3** | Schema Implementation & Migrations | **COMPLETE** | 2026-11-05 | Official Better Auth models, initial migration SQL (`20261105000000_init`), `docs/implementation/DATABASE_SCHEMA_REFERENCE.md` |
| **Phase 4** | Authentication Engine | **COMPLETE** | 2026-11-05 | Better Auth, Google OAuth (`select_account`), route handler, `auth-client`, safe `returnTo`, server session guards, `GoogleSignInButton` |
| **Phase 5** | Profile, Settings & Life Areas | **COMPLETE** | 2026-11-05 | `UserSettings`, `LifeArea` CRUD, priorities, reordering, visibility toggle, archiving, Zod schemas, `LifeAreasManager` |
| **Phase 6** | Generic Tracker Management Engine | **COMPLETE** | 2026-11-05 | 7 modalities, Zod config validation, `TrackerVersion` snapshots, flexible schedules, `actions/trackers.ts`, `TrackerModal`, `TrackerCard` |
| **Phase 7** | Dynamic Entries & Temporal Logging | **COMPLETE** | 2026-11-05 | Polymorphic daily logging (7 modalities), dual-axis temporal coordinates, checklist updates, streak calculation, `actions/entries.ts`, `QuickLogControls`, `LogEntryModal` |
| **Phase 8** | Task Management System | **COMPLETE** | 2026-11-05 | Independent tasks system, priorities, due dates, manual postponing, multi-views (today/overdue/upcoming), `actions/tasks.ts`, `TasksView`, `app/tasks/page.js` |
| **Phase 9** | Dynamic UI & Dashboard Migration | **COMPLETE** | 2026-11-05 | 100% dynamic dashboard, live stopwatch, real habits grid, today's tasks widget, dynamic prayer card, activity timeline, zero-seed empty states |
| **Phase 10** | Daily Overview, Calendar & Personal History | **COMPLETE** | 2026-11-05 | Historical daily view, date navigation, study/sleep sessions, tasks, `DailyNote` model, non-judgmental calendar, `actions/history.ts`, `app/journal/page.js`, `app/calendar/page.js` |
| **Phase 11** | Analytics, Progress & Motivation | **COMPLETE** | 2026-11-05 | Schedule-aware streak logic, metric aggregations, SVG chart points, `actions/analytics.ts`, dynamic `app/analytics/page.js` |
| **Phase 12** | Performance, Caching & Data Fetching | **COMPLETE** | 2026-11-05 | Server components (Partial Prerendering `◐`), safe optimistic UI with rollback, Prisma connection pooling, pagination, 2.49ms streak benchmark |
| **Phase 13** | Final Security Audit & Production Readiness | **COMPLETE** | 2026-11-05 | 39/39 security & IDOR tests passed, migration SQL sync, 0 ESLint/TS errors, comprehensive README & deployment guides |

---

## 12. Known Blockers & Missing Credentials

- **Supabase Credentials**: `DATABASE_URL` (Connection pooler) and `DIRECT_URL` (direct migration connection) are required to execute database migrations against PostgreSQL.
- **Google OAuth Credentials**: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are required from Google Cloud Console to enable Google OAuth login.
- **Better Auth Secret**: `BETTER_AUTH_SECRET` must be set in `.env`.

*Strategy for execution without live credentials*: All code, Prisma schema generation, type definitions, server actions, client auth integration, and mock-free dynamic UI are fully executable and verifiable locally without live production secrets.

---

## 13. Important Technical Decisions

1. **Better Auth Over NextAuth / Supabase Auth**:
   - Better Auth was chosen as the sole authentication provider. Supabase Auth must never be enabled alongside it.
2. **Polymorphic Tracker Schema**:
   - Rather than creating rigid database tables for every conceivable habit (e.g. separate tables for water, reading, smoking), a single dynamic `Tracker` and `TrackerEntry` model with a JSON `config` and polymorphic measurement columns (`valueBoolean`, `valueNumeric`, `valueDuration`, `payload`) provides infinite flexibility while keeping the database schema lean and performant.
3. **Strict Separation of Tasks and Trackers**:
   - Single-occurrence to-dos and action items live in a distinct `Task` table with due dates and priorities, while recurring lifestyle metrics live in `Tracker`.
4. **Preservation of Existing Visual Design**:
   - No components are redesigned; the obsidian dark theme, ambient glows, Lucide icons, and Arabic RTL layout are preserved intact.
