# App Kaa Baap — MVP starter

A mobile-friendly app-discovery prototype with country, price and platform filters, a starter catalogue, and Gemini-powered natural-language matching through a server-side Netlify Function.

## Run locally

Open `index.html` in a browser to preview the interface and keyword fallback. The Gemini function requires a Netlify Functions runtime and the environment variable described below.

## Deploy to Netlify

- Connect this GitHub repository to Netlify.
- Build command: leave blank.
- Publish directory: `.` (repository root).
- Functions directory: `netlify/functions` (configured in `netlify.toml`).
- In Netlify, open **Site configuration → Environment variables** and set `GEMINI_API_KEY` to your Google Gemini API key.
- Trigger a new deploy after adding or changing the environment variable.
- Test a natural-language search, the country/price/platform filters, official links, and the developer form.

## How AI discovery works

The browser sends the user's query and the currently filtered catalogue to `/.netlify/functions/discover`. The Netlify Function calls Gemini using the server-side `GEMINI_API_KEY`, validates that returned IDs belong to the submitted catalogue, and returns short match reasons. If AI discovery is unavailable, the interface falls back to basic keyword matching.

**Never put the Gemini API key in `index.html`, `app.js`, or any other browser-delivered file.** Keep it only in Netlify environment variables.

## Current limitations

- The catalogue is a starter sample, not a comprehensive or continuously verified global index.
- AI matching is limited to the catalogue supplied to the function; it does not yet search the live internet or a global app store index.
- The developer form is a front-end demo only and does not submit or store data.
- Confirm app features, prices, platform support and availability from official sources before production use.
- Before public scaling, add rate limiting/abuse controls, monitoring, privacy disclosures, developer submission storage, and catalogue verification workflows.
