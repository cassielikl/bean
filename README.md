# Bean MVP

A mobile-first noticing and gratitude companion built from the supplied Figma prototype. Bean arrives on Earth, learns the user's name, offers tiny quests, turns observations into memory seeds, and gradually builds a garden and time capsule.

The same React application currently runs in two forms: as a mobile web prototype for fast user testing and inside a Capacitor iOS shell for later TestFlight testing.

## Included flows

- Three-stage pod arrival and Bean introduction
- User and Bean naming
- First quest with text, photo, and voice-note states
- Quest completion and memory-seed reward
- Guided Home tour
- Daily and bonus quests
- Bonus prompts and free-form noticings that award additional seeds
- Editable snap-to-spot garden with owned decorations
- Memory-flower collection with associated prompts, dates, and entries
- Token store and pod-based Bean home customization
- Functional Bean renaming and a data-driven Capsule calendar
- Browser-safe fallbacks plus native iOS bridges for Calendar, HealthKit, and notifications
- Contextual Bean encouragement previews
- Browser persistence and responsive phone scaling
- Optional email/phone account step between naming and the first quest
- Supabase-ready persistence with anonymous sessions and one-time local-data import
- Private observation media, server-authoritative rewards, inventory, and weekly capsules
- Memory seeds that sprout after 2 hours and bloom after 5 hours

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite. Progress is stored in the browser automatically.

Without Supabase environment values, the app stays in local preview mode. Account verification accepts any six-digit code in preview mode and no information is transmitted.

## Backend setup

1. Create a Supabase project or run Supabase locally.
2. Copy `.env.example` to `.env.local` and add the project URL and publishable key.
3. Apply all migrations in `supabase/migrations` in filename order through the Supabase CLI.
4. Deploy the Edge Functions in `supabase/functions`.
5. In Supabase Authentication, enable anonymous users, email OTP, and phone login.
6. Configure Twilio using its Account SID, Message Service SID, and Auth Token in the Supabase dashboard. Never place these values in a `VITE_` environment variable.

The hosted database defaults to production growth timing: sprout after 2 hours and bloom after 5 hours. `supabase/seed.sql` enables accelerated 10-second/30-second timing only in the local Supabase database.

Typical local backend commands, after installing the Supabase CLI:

```bash
supabase start
supabase db reset
supabase functions serve delete-account
```

Then restart `npm run dev` after changing `.env.local`.

## Build

```bash
npm run build
```

Run the complete web verification shortcut with `npm run verify`.

## iPhone shell

```bash
npm run ios:sync
npm run ios:open
```

The second command opens the Xcode project. A physical-device or TestFlight build also requires an Apple Developer team, signing configuration, and the Apple capabilities described in [the mobile release checklist](docs/mobile-backend-release.md).

## Project guides

- [User-testing roadmap](docs/user-testing-roadmap.md)
- [Development workflow](docs/development-workflow.md)
- [Product decision log](docs/product-decisions.md)
- [Mobile backend release checklist](docs/mobile-backend-release.md)
