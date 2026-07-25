import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const THEMES = ["nature","beauty-color","calm-reflection","achievement-energy","relationships-care","sound-presence","comfort-routine","joy-optimism","creativity-curiosity"] as const;
const TAGS = ["family","friend","pet","home","food","weather","light","texture","music","work","school","movement","self-care"] as const;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

type Classification = { primaryThemeId: typeof THEMES[number]; secondaryTags: string[]; sensoryChannel: "visual"|"sound"|"touch"|"smell"|"taste"|"movement"|"general"; tone: "positive"|"neutral"; confidence: number; provenance: "prompt_rule"|"keyword_fallback"|"ai"; modelVersion: string };

const promptRules: Array<[RegExp, Classification["primaryThemeId"]]> = [
  [/color|caught your eye|patch of light/i,"beauty-color"], [/sound|made you pause/i,"sound-presence"],
  [/someone|grateful for/i,"relationships-care"], [/hobby|curious|learn/i,"creativity-curiosity"],
  [/space feel alive|physical environment/i,"nature"],
];
const keywordRules: Array<[Classification["primaryThemeId"], RegExp]> = [
  ["relationships-care",/friend|family|kind|help|together|pet|dog|cat/i], ["sound-presence",/sound|song|music|heard|voice|rain tapping/i],
  ["nature",/tree|leaf|flower|bird|sky|cloud|rain|weather|sun|outside/i], ["beauty-color",/color|light|bright|pink|blue|gold|texture|beautiful/i],
  ["achievement-energy",/finished|progress|worked|exercise|walk|run|accomplish|effort/i], ["comfort-routine",/home|coffee|tea|food|soup|routine|favorite|warm/i],
  ["calm-reflection",/quiet|calm|still|breath|grateful|peace/i], ["joy-optimism",/laugh|joy|delight|celebrat|excited|hope|happy/i],
  ["creativity-curiosity",/art|draw|sketch|idea|learn|wonder|create|recipe|pattern/i],
];

function fallback(prompt: string, body: string): Classification {
  const promptTheme = promptRules.find(([pattern]) => pattern.test(prompt))?.[1];
  const theme = promptTheme ?? keywordRules.find(([,pattern]) => pattern.test(`${prompt} ${body}`))?.[0] ?? "calm-reflection";
  const text = `${prompt} ${body}`.toLowerCase();
  const tags = TAGS.filter(tag => new RegExp(tag.replace("self-care","self|rest|mindful")).test(text));
  const sensoryChannel = /sound|heard|music|voice/.test(text) ? "sound" : /color|light|look|see/.test(text) ? "visual" : /touch|soft|texture/.test(text) ? "touch" : /smell|scent/.test(text) ? "smell" : /taste|food/.test(text) ? "taste" : /walk|run|move/.test(text) ? "movement" : "general";
  return { primaryThemeId: theme, secondaryTags: tags, sensoryChannel, tone: "positive", confidence: promptTheme ? .98 : .62, provenance: promptTheme ? "prompt_rule" : "keyword_fallback", modelVersion: "rules-v1" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return new Response("Unauthorized", { status: 401, headers: cors });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: cors });
    const { observationId } = await req.json();
    const result = await supabase.from("observations").select("id,prompt,body").eq("id", observationId).single();
    if (result.error) throw result.error;
    let classification = fallback(result.data.prompt, result.data.body);
    const key = Deno.env.get("GROQ_API_KEY");
    if (classification.provenance !== "prompt_rule" && key) {
      const model = Deno.env.get("GROQ_CLASSIFICATION_MODEL") || "qwen/qwen3.6-27b";
      const response = await fetch("https://api.groq.com/openai/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({
        model, reasoning: { effort: "none" }, input: [
          { role: "system", content: "Classify a gentle noticing. Do not diagnose the writer or infer sensitive traits. Return only the requested taxonomy labels." },
          { role: "user", content: `Prompt: ${result.data.prompt}\nObservation: ${result.data.body}` },
        ], text: { format: { type: "json_schema", name: "bean_observation_classification", strict: true, schema: { type: "object", additionalProperties: false, properties: {
          primaryThemeId: { type: "string", enum: THEMES }, secondaryTags: { type: "array", items: { type: "string", enum: TAGS }, maxItems: 5 },
          sensoryChannel: { type: "string", enum: ["visual","sound","touch","smell","taste","movement","general"] }, tone: { type: "string", enum: ["positive","neutral"] }, confidence: { type: "number", minimum: 0, maximum: 1 },
        }, required: ["primaryThemeId","secondaryTags","sensoryChannel","tone","confidence"] } } }, max_output_tokens: 300,
      }) });
      if (response.ok) {
        const payload = await response.json();
        const outputText = payload.output_text ?? payload.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === "output_text")?.text;
        if (outputText) {
          const ai = JSON.parse(outputText);
          if (ai.confidence >= .65 && THEMES.includes(ai.primaryThemeId)) classification = { ...ai, provenance: "ai", modelVersion: model };
        }
      }
    }
    const applied = await supabase.rpc("apply_observation_classification", { p_observation_id: observationId, p_primary_theme_id: classification.primaryThemeId, p_secondary_tags: classification.secondaryTags, p_sensory_channel: classification.sensoryChannel, p_tone: classification.tone, p_confidence: classification.confidence, p_provenance: classification.provenance, p_model_version: classification.modelVersion });
    if (applied.error) throw applied.error;
    return new Response(JSON.stringify({ classification: { ...classification, flowerSpeciesId: applied.data[0].flower_species_id } }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Classification failed" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
