# Bean product decisions

This is a concise record of confirmed product decisions. Update it when a decision changes; do not use it as a backlog.

## Confirmed experience

- Bean is a gentle noticing companion, not a productivity tracker or health adviser.
- Core onboarding order: meet and name Bean, optional account, first quest, then feature onboarding.
- Feature onboarding introduces Home, Quest, Bean profile, Garden, Store, Pod, and Capsule.
- Tapping Bean on Home offers quick sharing through writing, speech, camera, or photo library.
- A quick share is stored as an unprompted observation and appears in Capsule like a quest response.
- Completed prompts remain accessible, show prior responses, and allow another response.
- Responses may be brief. The UI may invite specificity but must not require it.

## Garden and economy

- Every successful observation awards exactly one seed.
- Production growth stages use server time: sprout after two hours and bloom after five hours.
- Accelerated timing is allowed only in local development, automated tests, and the guided first seed.
- A mature flower waits for the user to tap it. Harvesting awards ten tokens once and preserves the flower's memory.
- Bean and owned decorations can be placed in predefined land slots; no slot may be in water.
- Store categories are wardrobe, garden decor, and backdrops. Treats and rooms are not part of the MVP.
- Bean may equip one head item and one face item. Equipped appearance is shared across screens.
- An equipped backdrop replaces the Home/Pod backdrop rather than overlaying it.

## Capsule and prompts

- Capsule's calendar uses the user's name and real current month/year.
- Any day with one or more observations is marked, regardless of observation type.
- Selecting a marked day reveals that day's responses and playable/viewable media.
- Streak is based on consecutive local calendar days with observations.
- Month Rewind is not live. Current-month access explains when to return; completed historical months may be viewed.
- Daily prompts are curated and selected without recent repetition. Known prompts map deterministically to themes.

## Classification and Bean state

- Nine primary themes deterministically map to nine flower species.
- Free-form text and transcripts may be classified server-side through Groq; private credentials never ship in the browser.
- Calendar and HealthKit raw data stay on-device. Only user-approved, short-lived derived context may be retained.
- Bean interests require repeated evidence. Personality changes gradually from behavior; mood is temporary and decays toward content.
- Bean responses use curated templates and do not generate medical or psychological advice.

## Account and privacy

- The app starts with an anonymous Supabase session and offers account creation after naming.
- “Not now” remains available; later verification must preserve anonymous progress.
- Observation media is private.
- Users can export their data and permanently delete their account and media.
- Calendar, HealthKit, and notifications are optional, explained before the system prompt, and revocable.

## Open decisions

- First public-test distribution: mobile web first, or mobile web and TestFlight in parallel.
- Production web host and domain.
- Transactional email provider for opted-in web reminders.
- Feedback and support channel for testers.
- Final Apple bundle identifier and developer team.
