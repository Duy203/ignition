# Ignition

A React Native (Expo) app that helps you stop stalling on tasks using the "5-4-3-2-1" countdown method.

## Tech stack

- **App:** React Native + Expo (SDK 54), Expo Router (file-based routing)
- **Backend:** Supabase (Postgres + anonymous auth, row-level security)
- **Notifications:** expo-notifications (local scheduled, no server push)
- **Analytics:** PostHog (posthog-react-native)
- **Language:** TypeScript

## Project structure

```
app/
  (tabs)/
    index.tsx        - main screen: task list, add/edit form, stats header
    _layout.tsx       - tab navigator config
  _layout.tsx          - root layout
components/
  CountdownConsole.tsx - the 5-4-3-2-1-GO modal, ring animation, phase logic
  OnboardingScreen.tsx  - first-launch 3-slide intro
lib/
  supabase.ts          - Supabase client init
  posthog.ts            - PostHog client init
utils/
  auth.ts                - anonymous auth (ensureAuthenticated)
  tasks.ts                - Supabase CRUD (fetch/insert/update/delete/setTaskStatus)
  notification.ts          - schedule/cancel local notifications
```

## Environment variables

Create a `.env` file in the project root (never committed — already in `.gitignore`):

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_POSTHOG_HOST=
```

Get Supabase values from Project Settings → API. Get PostHog values from the project's install snippet.

## Setup

```
npm install
npx expo start
```

Scan the QR code with Expo Go (SDK 54) on iOS, or press `a` for an Android emulator/device.

## Data model

`tasks` table in Supabase:

| column          | type        | notes                                                |
| --------------- | ----------- | ---------------------------------------------------- |
| id              | uuid        | primary key                                          |
| user_id         | uuid        | references auth.users, RLS-scoped                    |
| name            | text        |                                                      |
| time            | text        | `"HH:MM"` 24-hour, nullable                          |
| date            | date        | real calendar date, not a "today/tomorrow" label     |
| status          | text        | `"pending"` \| `"completed"`                         |
| notification_id | text        | expo-notifications id, used to cancel on edit/delete |
| completed_at    | timestamptz | drives streak calculation                            |
| created_at      | timestamptz | default now()                                        |

Row Level Security is enabled — every policy scopes to `auth.uid() = user_id`, so each anonymous identity only ever sees its own rows.

## Key logic

- **Streak** (`computeStreak` in `index.tsx`): counts consecutive calendar days with at least one `completed_at` timestamp, walking backward from today. A day with zero completions breaks the streak.
- **Today %** (`computeTodayPct`): completed / total tasks where `date === today`.
- **Notifications**: scheduled locally at task-creation time via `expo-notifications`; cancelled and rescheduled on edit; cancelled on delete. Tapping a notification opens the app directly into that task's countdown via a stored `taskId` in the notification payload.

## Known limitations (as of V1 build)

- Tested on iOS (Expo Go, SDK 54) only — Android untested.
- Local notifications only; no server-triggered push (not needed for V1's core loop).
- No retry/offline queue if a Supabase write fails mid-flight — errors are logged to console, not surfaced to the user.
- Anonymous auth only — no email login yet, so uninstalling the app loses access to that identity's data (a real login is a natural V1.1 addition before wider distribution).

## Analytics events (PostHog)

| event                          | fired when                         |
| ------------------------------ | ---------------------------------- |
| `task_created`                 | a task is saved for the first time |
| `countdown_started`            | user taps "I'm ready"              |
| `countdown_go_reached`         | ring hits GO                       |
| `one_more_time_used`           | user re-runs the countdown         |
| `task_completed_via_countdown` | "Mark complete" tapped             |
| `countdown_abandoned`          | "Not now" / "Stop" tapped          |

These map to the success criteria in the project charter: one-countdown completion rate, daily task completion %, and follow-through.

## Scripts

```
npx expo start          # dev server
eas build --profile development --platform ios   # dev client build (needed for anything beyond Expo Go)
```
