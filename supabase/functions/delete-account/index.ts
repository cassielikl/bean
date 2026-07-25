import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (request) => {
  const authorization = request.headers.get("Authorization");
  if (!authorization) return new Response("Unauthorized", { status: 401 });

  const url = Deno.env.get("SUPABASE_URL")!;
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const admin = createClient(url, serviceKey);
  const bucket = admin.storage.from("observation-media");
  const { data: observationFolders } = await bucket.list(user.id, { limit: 1000 });
  for (const folder of observationFolders || []) {
    const prefix = `${user.id}/${folder.name}`;
    const { data: files } = await bucket.list(prefix, { limit: 1000 });
    if (files?.length) await bucket.remove(files.map((file) => `${prefix}/${file.name}`));
  }
  const deleted = await admin.auth.admin.deleteUser(user.id);
  if (deleted.error) return Response.json({ error: deleted.error.message }, { status: 500 });
  return Response.json({ deleted: true });
});
