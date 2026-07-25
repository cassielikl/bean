# Bean user-testing roadmap

This roadmap gets Bean in front of real users quickly without making the first test depend on App Store review, HealthKit, or push-notification setup.

## Recommended sequence

### Stage 0 — checkpoint and internal verification

Goal: preserve a stable baseline and make the core loop reliable before inviting testers.

- Keep `main` as the last known testable version.
- Run `npm run verify` before every checkpoint commit.
- Test onboarding reset, anonymous and email sign-in, quick sharing, quests, media, seed growth, harvest, Capsule history, store purchases, and account restoration.
- Confirm that one user cannot read another user's database rows or private media.
- Test on Safari and Chrome at narrow mobile widths, then on at least one real iPhone.

Exit criteria: the core loop can be completed twice without manual database repair and refreshing does not lose server-backed progress.

### Stage 1 — mobile web pilot

Goal: test the product loop with 5–10 invited users through an HTTPS link.

- Deploy the Vite build to a preview host such as Vercel, Netlify, or an equivalent static host.
- Connect the deployment to the existing Supabase project using only the public project URL and publishable key.
- Add the production URL to Supabase Auth redirect URLs.
- Keep Calendar and Health integrations labelled unavailable on web; do not simulate successful permission connections.
- Use email reminders for testers who opt in. The email job should use the same quiet-hour and frequency preferences planned for notifications.
- Add a lightweight feedback link in Settings rather than interrupting the noticing flow.

This stage validates onboarding comprehension, whether users return, prompt quality, media sharing, garden motivation, and Capsule usefulness. It does not validate HealthKit, EventKit, APNs, or App Store installation behavior.

Exit criteria: invited testers can open the link, create or skip an account, return on another day, and recover verified-account progress on another browser.

### Stage 2 — TestFlight pilot

Goal: validate the native experience with 5–15 iPhone users.

- Enrol in the Apple Developer Program and choose the final bundle identifier.
- Configure the Xcode development team, signing, HealthKit, and Push Notifications capabilities.
- Create the App Store Connect record, privacy answers, tester contact details, and beta review notes.
- Run `npm run ios:sync`, archive in Xcode, and upload the build to TestFlight.
- Test Calendar, HealthKit, local notifications, APNs, denied/revoked permissions, camera, photo library, microphone, background/resume behavior, and account restoration on physical iPhones.

Exit criteria: permissions are understandable and optional, sensitive raw data remains on-device, notifications respect preferences, and no native failure blocks the core noticing loop.

### Stage 3 — broader beta

Goal: evaluate retention and reliability with 25–50 users.

- Freeze schema changes during each one-week cohort unless fixing data loss or security issues.
- Version prompts, classification rules, and onboarding copy so results remain interpretable.
- Review aggregate product events rather than observation contents wherever possible.
- Publish a privacy policy, support route, export path, and account-deletion instructions before expansion.

## Minimum test matrix

| Area | Mobile web | TestFlight |
|---|---:|---:|
| Onboarding, account, quests, garden, store, Capsule | Required | Required |
| Text, photo, album, and voice observations | Required | Required |
| Cross-session and verified cross-device restoration | Required | Required |
| Calendar and HealthKit | Not available | Required on device |
| Email reminders | Recommended | Optional fallback |
| Local and push notifications | Browser-dependent; not a pilot requirement | Required |
| Permission denial and revocation | Media only | All native permissions |

## Pilot measurements

Use a small, purposeful set of measures:

- onboarding completion;
- first observation completion;
- next-day and seven-day return;
- observations per active day;
- seed harvest and store-use rates;
- percentage of responses using text, voice, and photos;
- usability problems reported per screen.

Do not optimize personality or health-derived messaging from a small pilot. First establish that users understand Bean, feel safe sharing, and want to return.

## Tester session script

1. Ask the tester to open Bean without explaining the interface.
2. Have them complete onboarding and share one real observation.
3. Ask them to find the observation in Capsule and describe what they expect the seed to do.
4. Ask them to return later without directing them to a specific button.
5. Interview them: What did Bean seem to want? What felt unclear? What felt rewarding? What would make them return? Was any permission or data use uncomfortable?

Record task success and hesitation separately from stated preference.

## Decisions needed before distribution

- Whether the first pilot should be mobile web only or mobile web followed immediately by TestFlight.
- Whether an Apple Developer membership is already available.
- Which hosting account and public domain will be used.
- Which transactional email provider will send opted-in reminders.
- Where tester feedback and bug reports should be collected.
