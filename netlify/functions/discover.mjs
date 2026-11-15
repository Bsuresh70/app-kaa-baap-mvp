const MODEL = "gpt-6-luna";
const MAX_QUERY_LENGTH = 500;
const MAX_APPS = 100;

const clean = (value, maxLength = 500) => String(value ?? "").replace(/[<>]/g, "").trim().slice(0, maxLength);

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  },
  body: JSON.stringify(body)
});

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(503, { error: "OpenAI search is not configured yet. Add OPENAI_API_KEY to Netlify and redeploy." });
  }

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Please send a valid search request." });
  }

  const body = input;
  const query = typeof input.query === "string" ? input.query.trim() : "";
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return json(400, { error: "Enter a search of 1–500 characters." });
  }

  const apps = Array.isArray(input.apps) ? input.apps.slice(0, MAX_APPS) : [];
  const safeApps = apps
    .filter(a => a && typeof a.id === "string" && typeof a.name === "string")
    .map(a => ({
      id: a.id.slice(0, 100),
      name: a.name.slice(0, 120),
      category: String(a.category || "").slice(0, 100),
      description: String(a.description || "").slice(0, 300),
      keywords: String(a.keywords || "").slice(0, 300),
      price: String(a.price || "").slice(0, 40),
      countries: Array.isArray(a.countries) ? a.countries.map(String).slice(0, 10) : [],
      platforms: Array.isArray(a.platforms) ? a.platforms.map(String).slice(0, 10) : []
    }));

  // Enforce explicit hard constraints before asking the model to rank candidates.
  // This prevents a freemium app from being returned for a "completely free" request.
  const q = query.toLowerCase();
  let eligibleApps = safeApps;
  if (/\b(completely free|totally free|100% free|entirely free|free only|no paid apps?|without paying|no subscription)\b/.test(q)) {
    eligibleApps = eligibleApps.filter(app => app.price.toLowerCase() === "free");
  }
  if (/\bandroid\b/.test(q)) eligibleApps = eligibleApps.filter(app => app.platforms.some(p => p.toLowerCase() === "android"));
  if (/\b(ios|iphone|ipad)\b/.test(q)) eligibleApps = eligibleApps.filter(app => app.platforms.some(p => p.toLowerCase() === "ios"));
  if (/\b(web app|web only|browser|online website)\b/.test(q)) eligibleApps = eligibleApps.filter(app => app.platforms.some(p => p.toLowerCase() === "web"));
  if (/\bin india\b|\bindian\b|\bfor india\b/.test(q)) eligibleApps = eligibleApps.filter(app => app.countries.some(c => c.toLowerCase() === "india"));
  if (/\bin the usa\b|\bin usa\b|\bin the united states\b|\bfor us users\b/.test(q)) eligibleApps = eligibleApps.filter(app => app.countries.some(c => c.toLowerCase() === "usa"));
  // Intent guardrail: digital certificates/marksheets should prioritize document credentials, not general government portals.
  const asksForDigitalCredentials = /\b(digital|online|electronic)?\s*(marksheets?|mark sheets?|certificates?|diplomas?|transcripts?)\b/.test(q) &&
    /\b(store|access|download|retrieve|manage|keep|save|fetch|find|share|verify|documents?|records?)\b/.test(q);
  if (asksForDigitalCredentials && !/\b(umang|government services|govt services|service portal)\b/.test(q)) {
    const credentialApps = eligibleApps.filter(app => /digilocker/i.test(app.name + " " + app.id));
    if (credentialApps.length) eligibleApps = credentialApps;
  }

  const prompt = [
    "You are App Kaa Baap, an independent, user-first app and digital-service discovery researcher.",
    "Search the live web for useful apps or digital services that solve the user's stated need. Do not restrict discovery to the supplied catalogue. Search broadly enough to find several meaningful options, then rank by task fit, usefulness, evidence quality, price fit and country/platform compatibility.",
    "Prioritize official product websites, official app-store listings, government websites and reputable documentation. Use official URLs when available. Do not invent products, links, features, prices, country availability or platform support. If price or availability is unclear, say Unknown rather than guessing.",
    "Never rank based on sponsorship, commission, popularity alone, or developer payments. Do not claim an app is safe, verified, best, or officially endorsed unless supported by sources.",
    "Use the catalogue as an initial candidate list, not a restriction. Include new discoveries found through web search when relevant. Deduplicate apps. Respect selected country, price and platform filters as hard constraints when evidence supports them; disclose uncertainty instead of making unsupported claims.",
    "For each result provide name, category, pricing label exactly one of Free, Freemium, Paid, Unknown, countries (array of India and/or USA only when supported), platforms (array from Web, Android, iOS when supported), a short factual description, the official product URL, a source URL used to support the listing, and a concise reason it fits. Include 5–8 strong results if available; fewer is better than padding.",
    "Use only valid JSON, no markdown, with this shape: " + JSON.stringify({summary:"one sentence",matches:[{id:"stable-short-id",name:"app name",category:"category",price:"Unknown",countries:["India"],platforms:["Web"],description:"factual description",url:"https://official.example",sourceUrl:"https://source.example",reason:"why it fits"}]}),
    "User request: " + JSON.stringify(query),
    "Selected filters: " + JSON.stringify({country: body.country || "All", price: body.price || "All", platform: body.platform || "All"}),
    "Current catalogue candidates: " + JSON.stringify(eligibleApps)
  ].join("\n\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: MODEL,
        tools: [{ type: "web_search", search_context_size: "medium" }],
        tool_choice: "required",
        input: prompt,
        max_output_tokens: 2200,
        reasoning: { effort: "low" },
      })
    });

    if (!response.ok) {
      const providerError = await response.text().catch(() => "");
      console.error("OpenAI live discovery failed:", response.status, providerError.slice(0, 1200));
      return json(response.status === 429 ? 429 : 502, {
        error: response.status === 429
          ? "Live search limit or available API credits may have been reached. Check API usage and billing."
          : "Live web discovery could not complete. Check the Netlify function logs."
      });
    }

    const payload = await response.json();
    const outputText = payload.output_text || (Array.isArray(payload.output) ? payload.output
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(part => part.type === "output_text")
      .map(part => part.text || "")
      .join("\n") : "");
    if (!outputText) return json(502, { error: "Live discovery returned no usable results. Please try again." });

    let parsed;
    try { parsed = JSON.parse(outputText); }
    catch {
      console.error("Live discovery returned invalid JSON:", outputText.slice(0, 800));
      return json(502, { error: "Live discovery returned an unreadable result. Please try again." });
    }

    const matches = (Array.isArray(parsed.matches) ? parsed.matches : [])
      .filter(m => m && typeof m.name === "string" && typeof m.url === "string" && /^https:\/\//i.test(m.url))
      .filter(m => {
        const p = String(m.price || "Unknown");
        if (body.price && body.price !== "All" && p.toLowerCase() !== String(body.price).toLowerCase()) return false;
        const selectedCountry = body.country && body.country !== "All" ? String(body.country) : "";
        if (selectedCountry && (!Array.isArray(m.countries) || !m.countries.includes(selectedCountry))) return false;
        const selectedPlatform = body.platform && body.platform !== "All" ? String(body.platform) : "";
        if (selectedPlatform && (!Array.isArray(m.platforms) || !m.platforms.includes(selectedPlatform))) return false;
        return true;
      })
      .slice(0, 8)
      .map((m, index) => ({
        id: clean(m.id, 100) || ("live-" + index),
        name: clean(m.name, 120),
        category: clean(m.category, 80) || "Digital service",
        price: ["Free","Freemium","Paid","Unknown"].includes(m.price) ? m.price : "Unknown",
        countries: Array.isArray(m.countries) ? m.countries.filter(c => ["India","USA"].includes(c)) : [],
        platforms: Array.isArray(m.platforms) ? m.platforms.filter(p => ["Web","Android","iOS"].includes(p)) : [],
        description: clean(m.description, 500),
        url: m.url,
        sourceUrl: typeof m.sourceUrl === "string" && /^https:\/\//i.test(m.sourceUrl) ? m.sourceUrl : "",
        reason: clean(m.reason, 240) || "Potentially relevant based on live web research.",
        evidenceStatus: "Web-discovered; review official details before relying on them."
      }));

    return json(200, {
      summary: clean(parsed.summary, 300) || "These options were discovered through live web search; confirm details on official sites.",
      searchMode: "live_web",
      matches
    });
  } catch (error) {
    console.error("Live discovery error:", error && error.message ? error.message : "Unknown error");
    return json(502, { error: "Live web discovery failed temporarily. Please try again." });
  }
}
