# Bean development workflow

This workflow keeps the changing Figma UI, React implementation, Supabase backend, and iOS wrapper aligned without slowing down experiments.

## Sources of truth

- Figma is the visual source of truth for approved screens and artwork.
- React components and CSS are the interaction and responsive-layout source of truth.
- Supabase migrations and Edge Functions are the persistent-data and server-rule source of truth.
- Native Swift bridges are the source of truth for Calendar, HealthKit, and iOS notification behavior.
- `docs/product-decisions.md` records decisions that should survive design iterations.

## A small-change cycle

1. Write one acceptance sentence before editing, such as: “Tapping Bean opens the same share choices as a quest and saving creates one observation.”
2. Identify the affected visual frame, state, database operation, and native fallback.
3. Implement the smallest vertical slice rather than updating every screen at once.
4. Test narrow mobile, tall mobile, refresh/resume, empty state, loading, error, and completed state.
5. Run `npm run verify`.
6. Commit the coherent change with any required migration or documentation update.

## Updating UI from Figma

When a frame changes:

1. Provide the exact Figma node URL and name the states that changed.
2. Export only raster artwork that cannot remain an existing SVG/CSS asset. Keep asset names stable.
3. Compare the implementation at the Figma frame width first, then make it responsive without changing the approved composition.
4. Keep data and navigation logic outside large visual components where practical. Reuse shared Bean, navigation, media-input, catalog-card, and modal components.
5. Verify tap targets, text wrapping, safe areas, sticky navigation, scrolling, keyboard behavior, and reduced motion.

## Backend changes

- Never edit a migration that has already been applied remotely. Add a new timestamped migration.
- Keep balances, rewards, harvesting, and purchases server-authoritative and idempotent.
- Update generated types whenever the database schema changes.
- Add row-level security for every user-owned table before the feature is considered complete.
- Keep browser secrets out of `VITE_` variables. Only the Supabase URL and publishable key belong in the frontend environment.
- Deploy Edge Functions from version-controlled source and record any newly required secret in `.env.example` or the release checklist without adding its value.

## Verification commands

```bash
npm run dev
npm run verify
npm run test:backend
npm run ios:sync
npm run ios:open
```

`test:backend` requires configured Supabase test credentials. Native permissions and notifications must be checked on a physical iPhone.

## Git workflow

- `main` should always be a testable checkpoint.
- Use short-lived branches for larger work: `feature/capsule-media`, `fix/garden-harvest`, or `design/pod-backdrops`.
- Commit UI, schema, tests, and documentation for one behavior together.
- Do not commit `.env`, `.env.local`, generated `dist`, generated Capacitor web assets, caches, or tester media.
- Tag user-testing builds, for example `web-pilot-0.1` and `testflight-0.1`.

## Efficiency improvements

1. Break the largest screen logic into feature modules only when touching that area; avoid a risky all-at-once rewrite.
2. Centralize catalog metadata, observation input modes, Bean equipment slots, and route names so Store, Pod, Home, Quest, Garden, and Capsule cannot drift.
3. Add a seeded demo persona that is isolated from real accounts. It should create deterministic historical observations for testing streaks, capsules, flowers, and rewinds.
4. Add automated tests in this order: server reward/idempotency rules, daily-prompt selection, observation-to-flower mapping, then critical UI flows.
5. Maintain a one-page release checklist and decision log instead of relying on chat history.

## Definition of done for a user-facing feature

- Matches the approved Figma state at its reference size.
- Works with touch and keyboard and at supported mobile widths.
- Has empty, loading, error, and already-completed behavior.
- Persists or intentionally remains local, with that choice documented.
- Does not expose another user's data or a server secret.
- Passes the production web build.
- Has been exercised in Safari; native-only work has been exercised on a physical iPhone.
