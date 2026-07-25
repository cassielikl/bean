# Bean mobile backend release notes

This file is the setup checklist for turning the current web MVP into the first iPhone-ready Bean build.

## What is now supported

- Production seed growth is restored to the real cycle: sprout after 2 hours, bloom after 5 hours.
- Local development can still use the accelerated `supabase/seed.sql` timing for quick testing.
- Observations can be classified into Bean’s nine themes and mapped to flowers.
- Bean can store learned interest signals, personality movement, and current mood separately from raw user input.
- Calendar and HealthKit raw data stay on the iPhone. Bean only stores user-approved derived context such as `exam`, `deadline`, `sleep_trend`, or `activity_trend`.
- Notifications have user preferences, device registrations, delivery records, quiet hours, and a two-per-day cap.
- Capacitor/iOS is scaffolded so the React UI can run inside an iPhone app shell.

## Supabase secrets to configure

Set these before deploying the Edge Functions:

```bash
supabase secrets set GROQ_API_KEY=...
supabase secrets set GROQ_CLASSIFICATION_MODEL=qwen/qwen3.6-27b
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set CRON_SECRET=...
supabase secrets set APNS_TEAM_ID=...
supabase secrets set APNS_KEY_ID=...
supabase secrets set APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
supabase secrets set APNS_BUNDLE_ID=com.bean.noticing
supabase secrets set APNS_ENV=sandbox
```

Use `APNS_ENV=production` only for the App Store/TestFlight production push environment.

## Deploy steps

1. Apply migrations to the Supabase project.
2. Deploy the functions:

```bash
supabase functions deploy classify-observation
supabase functions deploy delete-account
supabase functions deploy send-notifications
```

3. Add a scheduled job that calls `send-notifications` every 5 minutes.
   - Method: `POST`
   - URL: `https://<project-ref>.supabase.co/functions/v1/send-notifications`
   - Header: `x-cron-secret: <CRON_SECRET>`

## iPhone build steps

1. Build the web app:

```bash
npm run build
```

2. Sync the web build into the iOS project:

```bash
npx cap sync ios
```

3. Open `ios/App/App.xcodeproj` in Xcode.
4. Set the Apple development team and final bundle identifier.
5. Enable these capabilities:
   - Push Notifications
   - HealthKit
6. Verify Info.plist permission copy for Calendar and Health.
7. Test on a real iPhone. HealthKit, APNs, and full notification behavior cannot be fully verified in the browser.

## Privacy rules

- Groq receives only the quest prompt and observation text for free-form classification.
- Names, Calendar data, HealthKit samples, event titles, notes, attendees, locations, and calendar identifiers are not sent to Groq.
- Calendar categories are derived on-device and expire automatically.
- HealthKit values are converted on-device into broad bands: `below_usual`, `usual`, or `above_usual`.
- Bean responses should stay gentle and authored; no medical, diagnostic, psychological, or calendar-specific advice should be generated freely.

## Local testing notes

- Browser development still works. Native integrations return safe fallback responses outside iOS.
- The “restart onboarding” Settings button clears observations, seeds, garden placements, capsules, tokens, inventory, classifications, interests, mood/personality history, device contexts, devices, and notification preferences.
- After backend migration, a reset user starts with:
  - 10 tokens
  - the meadow backdrop
  - Bean as garden decor
  - the starter hat
  - no default mushroom/lamp decor
