# Twilio phone login setup

Bean uses Supabase Auth to issue six-digit phone verification codes. Supabase sends the SMS through Twilio; the Twilio secret values stay in the Supabase dashboard and must never be added to this repository or to `VITE_` environment variables.

## One-time setup

1. Create or sign in to a Twilio account and complete its required account verification.
2. In Twilio, buy an SMS-capable phone number **or** create a Messaging Service and add an SMS-capable sender to it. For a small user test, a Messaging Service is the cleaner option.
3. Copy these values from Twilio:
   - Account SID
   - Auth Token
   - Messaging Service SID (recommended) or the sender phone number
4. In the Supabase project dashboard, open **Authentication → Providers → Phone** and enable Phone sign-ins.
5. Choose Twilio as the SMS provider and paste the values there. Save.
6. Set the message template to: `Your Bean verification code is {{ .Code }}`.
7. In **Authentication → URL Configuration**, add the deployed URLs:
   - `https://bean.cassieliportfolio.com/**`
   - `https://bean-app.pages.dev/**`
   - `http://localhost:5173/**`
8. For email codes, in **Authentication → Email Templates**, change the “Confirm email change” template to display `{{ .Token }}` as a six-digit code. The Bean screen verifies this code rather than a confirmation link.

## Test checklist

1. Open the deployed Bean site in a private/incognito browser.
2. Finish naming, choose **Phone**, enter an E.164 number such as `+14155550123`, then choose **Send my code**.
3. Confirm the SMS arrives and verify its six digits.
4. Repeat with **Email** and verify the six-digit email code.
5. Use **Already have an account? Sign in** to make sure an existing user can return without losing their anonymous progress.

## Safety notes

- Twilio trial accounts can send only to verified destination numbers until the account is upgraded.
- SMS costs money and delivery may vary by country. Restrict test participants to countries you have enabled in Twilio.
- Do not paste Twilio credentials into chat, GitHub, `.env.local`, or Cloudflare environment variables for this app. Supabase stores them in its Auth provider configuration.
