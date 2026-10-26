# App Kaa Baap — MVP starter

A mobile-friendly app and digital-service discovery platform with natural-language search, country/price/platform filters, a starter catalogue, and live web discovery through a server-side Netlify Function.

## How discovery works

- The local catalogue provides initial candidates and useful metadata; it is not intended to be the limit of search.
- For a user query, the Netlify Function calls the OpenAI Responses API with web search enabled and required. It is instructed to discover relevant apps and services across the live web, including candidates not already in the local catalogue.
- Results are ranked for task fit and available evidence, and the function returns official product URLs and supporting source URLs when found.
- Country, price and platform filters are applied to the results. Availability and price can be uncertain, so users should confirm details with official providers.
- The local catalogue is useful for common searches, fast browsing and fallback context. It should not be treated as a complete directory of apps.

## Run locally

Open `index.html` in a browser to preview the interface. Live discovery requires the Netlify Functions runtime and the environment variable below.

## Deploy to Netlify

- Connect this GitHub repository to Netlify.
- Build command: leave blank.
- Publish directory: `.` (repository root).
- Functions directory: `netlify/functions` (configured in `netlify.toml`).
- In Netlify, open **Site configuration → Environment variables** and set `OPENAI_API_KEY` to the API key used by the discovery function.
- Trigger a new deploy after changing the environment variable or function code.
- Test a natural-language search, country/price/platform filters, result links and the developer form.

## Security and quality

- Never put `OPENAI_API_KEY` in `index.html`, `app.js`, or any browser-delivered file. Keep it only in Netlify environment variables.
- Live web discovery does not guarantee every app on the internet will be found. Search coverage depends on the search provider's index, query wording, tool limits and available sources.
- The catalogue is a curated starter set, not a complete or continuously verified global index.
- The developer form is a front-end demo only and does not submit or store data.
- Confirm app features, prices, platform support and regional availability on official sources before relying on them.
- Before public scaling, add rate limiting/abuse controls, monitoring, privacy disclosures, developer submission storage, and catalogue verification workflows.
