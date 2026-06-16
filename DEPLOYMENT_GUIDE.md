# Curio — Deployment & Operations Guide

This guide details the steps required to deploy and configure the Curio Digital Curiosity Archive. Follow these instructions exactly to wire the database, authentication, and AI services.

---

## 1. Required Environment Variables

Configure these variables on your hosting environment. **Never expose the Service Role Key or Gemini API Key to the client.**

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Client & Server | The endpoint URL for your Supabase project (e.g. `https://xyz.supabase.co`). |
| `SUPABASE_ANON_KEY` | Client & Server | The public anonymous API key for Supabase browser operations. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | The secret database bypass key used by server functions to perform admin writes and bypass RLS. |
| `GEMINI_API_KEY` | Server-Only | Developer key used to call Gemini 2.5 Flash and text-embedding-004 models. |

---

## 2. Supabase Database Setup

Curio relies on Postgres schemas, RLS policies, indexes, and custom database functions. 

### Steps:
1. Create a new project in your **Supabase Dashboard**.
2. Go to the **SQL Editor** tab.
3. Paste and run the entire schema migration script located in the repository at:
   [`supabase/migrations/20260615000000_curio_core_schema.sql`](file:///c:/Users/aarag/Desktop/curio/supabase/migrations/20260615000000_curio_core_schema.sql)
4. Verify that the SQL runs successfully. This script:
   * Enables the `vector` (pgvector) and `uuid-ossp` extensions.
   * Creates the `profiles`, `specimens`, `nodes`, `edges`, `discovery_trails`, and `unexpected_connections` tables.
   * Configures foreign key relations with `ON DELETE CASCADE` to support clean cascades and atomic deletions.
   * Automatically sets up RLS policies protecting user ownership.
   * Establishes the `match_specimens` vector cosine similarity RPC function.
   * Installs the database trigger `on_auth_user_created` to sync new accounts from Auth to Public Profiles.

---

## 3. Google OAuth Configuration

Authentication in Curio uses Google OAuth provider via Supabase Auth.

### Steps:
1. Go to the **Google Cloud Console** -> **Credentials**.
2. Select **Create Credentials** -> **OAuth client ID**.
3. Choose **Web application** as the application type.
4. Set the **Authorized redirect URIs** to your Supabase project URL:
   `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback`
5. Click **Create** and copy the Client ID and Client Secret.
6. Open your **Supabase Dashboard** -> **Authentication** -> **Providers** -> **Google**.
7. Enable the provider, paste your Client ID and Client Secret, and save.

---

## 4. Gemini AI Configuration

The application uses Gemini endpoints without needing external SDKs.

* **API Endpoints**: Uses `https://generativelanguage.googleapis.com` beta models.
* **Extraction Model**: Calls `gemini-2.5-flash` with response schemas forced to strict JSON formats.
* **Vector Model**: Calls `text-embedding-004` to generate exactly **768-dimension floats** used for interdisciplinary connection evaluations.
* **Verification**: Ensure your `GEMINI_API_KEY` has active quotas for both models.

---

## 5. Build and Execution Commands

Curio is powered by the Vinxi bundler.

### Build the Production Application:
```bash
npm run build
```
This generates the standalone production build files inside the `.output/` and `.vinxi/` directories.

### Local Production Preview:
```bash
npm run start
```

### Standalone Server Start (Production VPS):
```bash
node .output/server/index.mjs
```

---

## 6. Railway Deployment (Recommended)

Railway is the most stable option for Curio because it runs a persistent Node.js server, preventing any cold starts or execution timeouts during vector similarity calculations.

### Steps:
1. Push your repository to **GitHub**.
2. Log into your **Railway Dashboard** and click **New Project** -> **Deploy from GitHub repo**.
3. Select the `curio` repository.
4. Go to **Variables** and add the 4 required environment variables:
   * `SUPABASE_URL`
   * `SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `GEMINI_API_KEY`
5. Go to **Settings** -> **Build & Deploy**:
   * **Build Command**: `npm run build`
   * **Start Command**: `node .output/server/index.mjs`
6. Click **Deploy**. Once completed, Railway will generate a public URL.

---

## 7. Vercel Deployment

Vercel hosts TanStack Start as serverless function handlers.

### Steps:
1. Log into your **Vercel Dashboard** -> **Add New** -> **Project**.
2. Import the `curio` repository from GitHub.
3. Under **Environment Variables**, configure the 4 keys:
   * `SUPABASE_URL`
   * `SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `GEMINI_API_KEY`
4. Click **Deploy**. Vercel will automatically detect TanStack Start / Vinxi configuration and deploy the handler handlers.
5. *Note*: Ensure your Vercel plan supports function execution durations exceeding 10 seconds, as the Connections Engine compares vector cosine limits synchronously during specimen saves.

---

## 8. Post-Deployment Verification Checklist

Complete these manual steps on the deployed website to verify full system integration:

* [ ] **Google Identity Connection**: Navigate to `/`, click **Identify via Google**, and complete the OAuth flow. Check that you are redirected back to the page and your email prefix appears on the log out button.
* [ ] **Profile Sync**: Access your Supabase Database and check that a corresponding entry has been written to `public.profiles` for your Auth User ID.
* [ ] **First Seed Analysis**: Enter a topic (e.g. `Quantum Mechanics`) on the Explore page and click Enter. The canvas loader should display for 2-4 seconds, and a force-directed graph should render.
* [ ] **Depth Tracking**: Click **Dig Deeper** on any satellite node. Verify that:
  * An "Expanding path..." overlay appears briefly.
  * 3 to 5 new satellites are added.
  * The **Rabbit-hole depth** dots in the nav bar increment.
* [ ] **Specimen Archiving**: Click **Archive in Cabinet** on the sidebar. Verify that a success card ("Specimen Vaulted") appears with calculated complexity/rarity indexes.
* [ ] **Cabinet Verification**: Navigate to `/cabinet`. Verify that the specimen you just saved is rendered as a card showing its summary, rarity, and max depth. Click the card to open the graph viewer overlay.
* [ ] **Atomicity Verification**: Temporarily disconnect Supabase access keys (or enter a dummy key) and save a specimen. Verify that no partial or orphaned rows are created in `nodes` or `edges` tables, and that the rollback cleans the DB cleanly.
* [ ] **Connections Discovery**: Save a second, conceptually distant specimen (e.g. `Naturalist Paintings`). Navigate to `/connections`. Verify that the connections worker has automatically generated and populated a Philosophical Bridge narrative card.
