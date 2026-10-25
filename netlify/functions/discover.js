// Netlify Function: OpenAI-powered app discovery. API key stays server-side.

const MAX_QUERY_LENGTH = 500;
const MAX_APPS = 100;
const MODEL = "gpt-6-luna";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(503, {
      error: "OpenAI discovery is not configured yet. Please add OPENAI_API_KEY to Netlify and redeploy."
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Request body must be valid JSON." });
  }

  const query = typeof body.query === "string" ? body.query.trim().slice(0, MAX_QUERY_LENGTH) : "";
  const rawApps = Array.isArray(body.apps) ? body.apps.slice(0, MAX_APPS) : [];

  if (!query) return json(400, { error: "Please describe what you want to do." });

  // Accept only fields used by discovery; never trust model-generated URLs or display markup.
  const apps = rawApps.map((app) => ({
    id: clean(app && app.id, 100),
    name: clean(app && app.name, 120),
    category: clean(app && app.category, 100),
    description: clean(app && app.description, 500),
    keywords: clean(app && app.keywords, 500),
    price: clean(app && app.price, 40),
    countries: Array.isArray(app && app.countries) ? app.countries.slice(0, 20).map(x => clean(x, 50)) : [],
    platforms: Array.isArray(app && app.platforms) ? app.platforms.slice(0, 10).map(x => clean(x, 40)) : []
  })).filter(app => app.id && app.name);


  // Enforce explicit hard constraints before asking the model to rank candidates.
  // This prevents the model from returning a freemium app for a "completely free" request.
  const q = query.toLowerCase();
  let eligibleApps = apps;
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
};

function clean(value, maxLength) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength) : "";
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
}

function json(statusCode, payload) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(payload) };
}
