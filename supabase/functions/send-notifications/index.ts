import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const encoder = new TextEncoder();
const b64url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

async function apnsJwt() {
  const pem = Deno.env.get("APNS_PRIVATE_KEY")!.replace(/\\n/g, "\n");
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, "")), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: Deno.env.get("APNS_KEY_ID") }));
  const claims = b64url(JSON.stringify({ iss: Deno.env.get("APNS_TEAM_ID"), iat: Math.floor(Date.now() / 1000) }));
  const input = `${header}.${claims}`;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(input)));
  return `${input}.${b64url(signature)}`;
}

function localParts(timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts().map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
const inQuietHours = (time: string, start: string, end: string) => start <= end ? time >= start && time < end : time >= start || time < end;

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("Unauthorized", { status: 401 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jwt = await apnsJwt();
  const host = Deno.env.get("APNS_ENV") === "production" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
  const bundle = Deno.env.get("APNS_BUNDLE_ID") || "com.bean.noticing";
  const { data: preferences, error } = await db.from("notification_preferences").select("*");
  if (error) throw error;
  let sent = 0;
  for (const pref of preferences || []) {
    const profileResult = await db.from("profiles").select("id,bean_name").eq("id", pref.user_id).single();
    const devicesResult = await db.from("device_installations").select("id,apns_token,enabled").eq("user_id", pref.user_id).eq("enabled", true);
    const profile: any = profileResult.data; const devices: any[] = devicesResult.data || [];
    if (!profile) continue;
    if (!devices.length) continue;
    const local = localParts(pref.timezone); const dayStart = `${local.date}T00:00:00Z`;
    if (inQuietHours(local.time, pref.quiet_hours_start.slice(0,5), pref.quiet_hours_end.slice(0,5))) continue;
    const delivered = await db.from("notification_deliveries").select("id", { count: "exact", head: true }).eq("user_id", profile.id).gte("created_at", dayStart).in("status", ["queued","sent","opened"]);
    if ((delivered.count || 0) >= 2) continue;
    const candidates: Array<{ kind: string; key: string; title: string; body: string }> = [];
    if (pref.daily_prompt_enabled && local.time >= pref.daily_window_start.slice(0,5) && local.time <= pref.daily_window_end.slice(0,5)) {
      candidates.push({ kind: "daily_prompt", key: `daily:${local.date}`, title: profile.bean_name || "Bean", body: "Want to show me one small thing from your world today?" });
    }
    if (pref.bloom_enabled) {
      const blooms = await db.from("memory_seeds").select("id").eq("user_id", profile.id).is("harvested_at", null).not("planted_at", "is", null).lte("planted_at", new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()).limit(1);
      if (blooms.data?.[0]) candidates.unshift({ kind: "bloom", key: `bloom:${blooms.data[0].id}`, title: profile.bean_name || "Bean", body: "A flower has bloomed in your garden!" });
    }
    for (const candidate of candidates.slice(0, Math.max(0, 2 - (delivered.count || 0)))) {
      const device = devices[0];
      const queued = await db.from("notification_deliveries").insert({ user_id: profile.id, device_id: device.id, kind: candidate.kind, idempotency_key: candidate.key, scheduled_for: new Date().toISOString() }).select("id").single();
      if (queued.error?.code === "23505") continue;
      if (queued.error) throw queued.error;
      const response = await fetch(`${host}/3/device/${device.apns_token}`, { method: "POST", headers: { authorization: `bearer ${jwt}`, "apns-topic": bundle, "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json" }, body: JSON.stringify({ aps: { alert: { title: candidate.title, body: candidate.body }, sound: "default" }, kind: candidate.kind }) });
      await db.from("notification_deliveries").update(response.ok ? { status: "sent", sent_at: new Date().toISOString() } : { status: "failed", error_code: `${response.status}` }).eq("id", queued.data.id);
      if (response.ok) sent++;
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
