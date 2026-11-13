# App Kaa Baap — MVP starter

A mobile-friendly app and digital-service discovery platform with natural-language search, country/price/platform filters, a starter catalogue, live web discovery, and optional Google sign-in.

## How discovery works

- The local catalogue provides initial candidates and useful metadata; it is not intended to be the limit of search.
- For a user query, the Netlify Function calls the OpenAI Responses API with web search enabled and required. It is instructed to discover relevant apps and services across the live web, including candidates not already in the local catalogue.
- Results are ranked for task fit and available evidence, and the function returns official product URLs and supporting source URLs when found.
- Country, price and platform filters are applied to the results. Availability and price can be uncertain, so users should confirm details with official providers.

## Google sign-in setup

Google sign-in uses Supabase Auth. Guest browsing remains available.

1. Create a Supabase project at https://supabase.com/ and open **Project Settings → API**.
2. Copy the Project URL and publishable/anon key into `auth-config.js`. These two values are intended for browser use; never place a Supabase `service_role` key or Google client secret in this file.
3. In Supabase, open **Authentication → Providers → Google** and enable Google.
4. Create a Google OAuth Client ID in Google Cloud Console. Add the Supabase callback URL shown in the Google provider setup screen to the Google OAuth client's authorized redirect URIs. Add your deployed Netlify site URL to the authorized JavaScript origins where requested.
5. Paste the Google OAuth Client ID and Client Secret into the Supabase Google provider settings, then save.
6. In Supabase **Authentication → URL Configuration**, set the Site URL to your Netlify domain and add any local test URL (for example `http://localhost:8888`) to the redirect allow list.
7. Run `supabase/profiles.sql` in the Supabase SQL Editor to create the optional user profile table with row-level security.
8. Deploy the site and test **Sign in → Continue with Google**. Use an HTTPS deployed URL or a local Netlify development server; opening the page directly as a `file://` URL is not a valid OAuth test.

The app requests the user's basic Google identity through Supabase. It does not ask for or store the user's Google password. Supabase manages the authentication session.

## Run locally

Use the Netlify CLI/local development server so the site runs on a valid localhost origin. Live discovery also requires the Netlify Functions runtime and the `OPENAI_API_KEY` environment variable.

## Deploy to Netlify

- Connect this GitHub repository to Netlify.
- Build command: leave blank.
- Publish directory: `.` (repository root).
- Functions directory: `netlify/functions` (configured in `netlify.toml`).
- In Netlify, open **Site configuration → Environment variables** and set `OPENAI_API_KEY` to the API key used by the discovery function.
- Trigger a new deploy after changing environment variables or function code.

## Security and quality

- Never put `OPENAI_API_KEY` in browser-delivered files. Keep it only in Netlify environment variables.
- Never put a Supabase `service_role` key or Google OAuth client secret in browser-delivered files.
- The Supabase publishable/anon key is designed to be public; protect data with Row Level Security policies.
- Live web discovery does not guarantee every app on the internet will be found. The catalogue is a curated starter set, not a complete or continuously verified global index.
- Confirm app features, prices, platform support and regional availability on official sources before relying on them.
- Before public scaling, add rate limiting/abuse controls, monitoring, privacy disclosures, developer submission storage, and catalogue verification workflows.
