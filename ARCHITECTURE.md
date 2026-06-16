# Curio Architecture v1.2 — Digital Curiosity Archive

Curio is a digital curiosity archive designed to help users explore intellectual pathways, save unique concepts as specimens, and discover unexpected bridges between disparate topics. 

Curio is **NOT** a productivity app, a note-taking tool, or a research workspace. It is a space for collecting and displaying intellectual curiosities.

---

## 1. Project Goal & Mental Model

The Curio experience is designed around a three-stage core journey:
1. **Explore**: Enter a seed topic or URL, generate an interactive knowledge graph, track the user's "rabbit hole" journey, and visualize discovery trails.
2. **Save**: Archive explorations as "Specimens" inside a personal Cabinet.
3. **Connect**: Unearth hidden, AI-discovered connections between archived specimens.

```
 [ Explore ] ───(Rabbit-Hole Trail)───► [ Save ] ───(Cabinet Specimen)───► [ Connect ] ───(AI Bridges)
```

---

## 2. Complete Folder Structure (React 19 + TanStack Start)

The codebase is organized into modular directories reflecting the Cabinet, Museum, and Explorer pages.

```
curio/
├── app/
│   ├── components/            # Interface & Visualization components
│   │   ├── ui/                # Base shadcn/ui components (archival theme)
│   │   ├── graph/             # Knowledge Graph components
│   │   │   ├── Canvas.tsx          # SVG/Canvas rendering manager
│   │   │   ├── GraphNode.tsx       # Specimen/Node rendering (catalog box styles)
│   │   │   ├── GraphEdge.tsx       # SVG ink connection lines
│   │   │   └── TrailVisualizer.tsx # Discovery trail step-tracker UI
│   │   ├── layout/            # Site frame components
│   │   │   ├── Navbar.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── cabinet/           # Cabinet UI components
│   │   │   ├── SpecimenCard.tsx    # Card displaying specimen details
│   │   │   └── SpecimenFilter.tsx  # Cabinet search & tag filtering
│   │   ├── board/             # Investigation Board UI components
│   │   │   ├── StickyNoteCard.tsx  # Interactive sticky notes
│   │   │   └── ThreadLine.tsx      # SVG connection threads between notes
│   │   └── museum/            # Museum Analytics components
│   │       ├── AnalyticsChart.tsx  # Domain distribution visualizer (Strata)
│   │       └── InsightCard.tsx     # AI curiosity insights display
│   ├── hooks/                 # Custom state & layout hooks
│   │   ├── useGraphLayout.ts  # Runs D3 force physics simulation
│   │   ├── useTrailTracker.ts # Tracks current explorer trail/depth
│   │   └── useCanvasGestures.ts # Coordinates zooming and panning on boards
│   ├── lib/                   # SDK & Client Initializations
│   │   ├── gemini.ts          # Google Gen AI client configuration
│   │   └── supabase.ts        # Supabase database & auth client
│   ├── routes/                # File-Based TanStack Router
│   │   ├── __root.tsx         # Global frame, providers & shell
│   │   ├── index.tsx          # Landing / Entry gate
│   │   ├── explore.tsx        # Explorer canvas (graph, depth, trails)
│   │   ├── cabinet.tsx        # Cabinet view (specimen vault)
│   │   ├── museum.tsx         # Museum view (analytics, domain graphs)
│   │   ├── investigation.tsx  # Infinite Investigation Board Canvas
│   │   └── connections.tsx    # Unexpected Connections hub
│   ├── server/                # TanStack Start Server Functions
│   │   ├── functions/
│   │   │   ├── analyze.ts     # Seed analysis & node generation
│   │   │   ├── connections.ts # pgvector query & AI bridge generation
│   │   │   ├── board.ts       # Board actions (save/load sticky notes & threads)
│   │   │   └── db.ts          # CRUD for specimens, trails, and insights
│   │   └── schema.ts          # Zod query & payload validators
│   ├── styles/
│   │   └── globals.css        # Tailwind variables and CSS styles
│   ├── client.tsx             # Entry script (client-side hydration)
│   ├── routeTree.gen.ts       # Generated routes mapping file
│   ├── router.tsx             # Router setup
│   └── ssr.tsx                # Server-side renderer entry
├── supabase/
│   ├── migrations/            # SQL database schemas
│   │   └── 20260615000000_curio_core_schema.sql
│   └── config.toml
├── public/                    # Audio, video, vector assets
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── ARCHITECTURE.md            # Local copy of architecture specification
```

---

## 3. Data Structures & Metadata Models

### A. Discovery Trail & Rabbit-Hole Depth
Every explore session maintains a path state describing how deep the user dug:
```typescript
interface TrailStep {
  stepNumber: number;
  nodeLabel: string;
  depth: number;       // The distance from the seed node (0 = seed)
  timestamp: string;   // ISO String
}

interface DiscoveryTrail {
  id: string;
  specimenId?: string;
  steps: TrailStep[];
  totalSteps: number;
  maxDepth: number;    // Maximum rabbit-hole depth reached
}
```

### B. Domain Distribution (Cabinet & Museum Taxonomy)
Every specimen belongs to multiple domains dynamically identified by the AI (limited strictly to Technology, History, Science, or Culture):
```typescript
interface DomainDistribution {
  Technology?: number; // Percentage float (e.g. 0.6)
  History?: number;
  Science?: number;
  Culture?: number;
}
```

### C. Specimen Card Model
The UI requires metadata to display specimens as "collected items" with sharp borders and domain color indicators:
```typescript
interface SpecimenMetadata {
  rarityScore: number;       // AI-calculated uniqueness (1-100) based on domain overlap
  complexityScore: number;   // Computed from number of nodes & edges (1-100)
  domainDistribution: DomainDistribution;
  originSource: 'topic' | 'url';
  originValue: string;       // URL string or seed query
}
```

### D. Sticky Note (Investigation Board)
```typescript
interface StickyNote {
  id: string;
  investigationId: string;
  kind: 'Concept' | 'Insight' | 'Scrap';
  title: string;
  body: string;
  x: number;       // Position in 3200px width canvas
  y: number;       // Position in 2200px height canvas
  w: number;       // Note width (usually 280px)
  rotate: number;  // Tilt angle in degrees (-8 to 8)
  sticker?: string; // Optional sticker emoji/icon
  formattedDate: string;
  meta: string;    // Citation source or path details
}
```

### E. Board Thread (SVG Connection)
```typescript
interface BoardThread {
  id: string;
  investigationId: string;
  sourceNoteId: string;
  targetNoteId: string;
  topic: string; // Text shown at midpoint of curve
}
```

---

## 4. Database Schema (Supabase & PostgreSQL)

The database utilizes PostgreSQL's `pgvector` to store semantic embeddings representing the intellectual footprint of saved specimens.

```sql
-- Enable Extensions
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Specimens table (Representing saved explorations - Private by Default)
create table public.specimens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  summary text not null,
  embedding vector(768) not null, -- text-embedding-004 output length
  origin_source text not null,    -- "topic" or "url"
  origin_value text not null,     -- Seed word or URL string
  rarity_score integer not null check (rarity_score between 1 and 100),
  complexity_score integer not null check (complexity_score between 1 and 100),
  domain_distribution jsonb not null, -- JSON map: { "Technology" | "History" | "Science" | "Culture": float }
  max_depth integer default 0 not null,
  is_public boolean default false not null, -- Private by default for archival concept
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Active Exploration Sessions (For tracking rabbit holes before saving)
create table public.exploration_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  seed_concept text not null,
  trail_history jsonb not null, -- Array of TrailStep JSON logs
  current_depth integer default 0 not null,
  is_archived boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cache Table for Gemini Graph Expansions (To minimize token usage)
create table public.concept_cache (
  id uuid default gen_random_uuid() primary key,
  concept_key text unique not null, -- Lowercased/trimmed key topic or URL hash
  generated_graph jsonb not null,   -- Nodes & Edges structure
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Nodes table
create table public.nodes (
  id uuid default gen_random_uuid() primary key,
  specimen_id uuid references public.specimens(id) on delete cascade not null,
  label text not null,
  node_type text not null, -- e.g., "Concept", "Entity", "Idea"
  description text not null
);

-- Edges table
create table public.edges (
  id uuid default gen_random_uuid() primary key,
  specimen_id uuid references public.specimens(id) on delete cascade not null,
  source_node_id uuid references public.nodes(id) on delete cascade not null,
  target_node_id uuid references public.nodes(id) on delete cascade not null,
  connection_type text not null,
  description text not null
);

-- Discovery Trails table (Active steps taken during exploration)
create table public.discovery_trails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  specimen_id uuid references public.specimens(id) on delete cascade not null,
  steps jsonb not null, -- Array of TrailStep items
  total_steps integer not null,
  max_depth integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Curiosity Insights table (Museum analysis reports)
create table public.curiosity_insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  insight_text text not null, -- Rich Markdown text containing AI observations
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Unexpected Connections table (Links between specimens)
create table public.unexpected_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  specimen_a_id uuid references public.specimens(id) on delete cascade not null,
  specimen_b_id uuid references public.specimens(id) on delete cascade not null,
  bridge_title text not null,
  bridge_explanation text not null, -- Gemini-generated explanation narrative
  similarity_score float not null,  -- Cosine distance score
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Investigation Boards Table
create table public.investigations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sticky Notes Table (Infinite Canvas Cards)
create table public.sticky_notes (
  id uuid default gen_random_uuid() primary key,
  investigation_id uuid references public.investigations(id) on delete cascade not null,
  kind text not null check (kind in ('Concept', 'Insight', 'Scrap')),
  title text not null,
  body text not null,
  x integer not null,
  y integer not null,
  w integer default 280 not null,
  rotate numeric(4, 2) not null,
  sticker text,
  meta text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Board Threads Table (Canvas Connections)
create table public.threads (
  id uuid default gen_random_uuid() primary key,
  investigation_id uuid references public.investigations(id) on delete cascade not null,
  source_note_id uuid references public.sticky_notes(id) on delete cascade not null,
  target_note_id uuid references public.sticky_notes(id) on delete cascade not null,
  topic text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for vector similarity search acceleration
create index on public.specimens using hnsw (embedding vector_cosine_ops);
create index on public.concept_cache (concept_key);

-- RLS Configurations
alter table public.profiles enable row level security;
alter table public.specimens enable row level security;
alter table public.nodes enable row level security;
alter table public.edges enable row level security;
alter table public.discovery_trails enable row level security;
alter table public.curiosity_insights enable row level security;
alter table public.unexpected_connections enable row level security;
alter table public.investigations enable row level security;
alter table public.sticky_notes enable row level security;
alter table public.threads enable row level security;
alter table public.exploration_sessions enable row level security;

-- Policies
create policy "Specimens are readable if public or owned by user" 
  on public.specimens for select using (is_public = true or auth.uid() = user_id);
create policy "Owners can manage specimens" 
  on public.specimens for all using (auth.uid() = user_id);

create policy "Nodes are readable if parent specimen is accessible" 
  on public.nodes for select using (
    exists (select 1 from public.specimens where specimens.id = nodes.specimen_id and (specimens.is_public = true or specimens.user_id = auth.uid()))
  );
create policy "Owners can manage nodes" 
  on public.nodes for all using (
    exists (select 1 from public.specimens where specimens.id = nodes.specimen_id and specimens.user_id = auth.uid())
  );

create policy "Edges are readable if parent specimen is accessible" 
  on public.edges for select using (
    exists (select 1 from public.specimens where specimens.id = edges.specimen_id and (specimens.is_public = true or specimens.user_id = auth.uid()))
  );
create policy "Owners can manage edges" 
  on public.edges for all using (
    exists (select 1 from public.specimens where specimens.id = edges.specimen_id and specimens.user_id = auth.uid())
  );

create policy "Users can read own trails" 
  on public.discovery_trails for select using (auth.uid() = user_id);
create policy "Users can manage own trails" 
  on public.discovery_trails for all using (auth.uid() = user_id);

create policy "Users can read own insights" 
  on public.curiosity_insights for select using (auth.uid() = user_id);
create policy "Users can manage own insights" 
  on public.curiosity_insights for all using (auth.uid() = user_id);

create policy "Users can read own connections" 
  on public.unexpected_connections for select using (auth.uid() = user_id);
create policy "Users can manage own connections" 
  on public.unexpected_connections for all using (auth.uid() = user_id);

create policy "Users can manage their own investigations" 
  on public.investigations for all using (auth.uid() = user_id);

create policy "Users can manage sticky notes on their investigations" 
  on public.sticky_notes for all using (
    exists (select 1 from public.investigations where investigations.id = sticky_notes.investigation_id and investigations.user_id = auth.uid())
  );

create policy "Users can manage threads on their investigations" 
  on public.threads for all using (
    exists (select 1 from public.investigations where investigations.id = threads.investigation_id and investigations.user_id = auth.uid())
  );

create policy "Users can manage their own exploration sessions"
  on public.exploration_sessions for all using (auth.uid() = user_id);
```

---

## 5. Unified System APIs (TanStack Start Server Functions)

### A. Graph & Exploration APIs
#### 1. `generateGraphFn`
- **Type**: POST
- **Input**: `{ inputSource: string, type: 'topic' | 'url' }`
- **Output**: 
  ```typescript
  interface GraphResponse {
    title: string;
    summary: string;
    nodes: Array<{ id: string; label: string; type: string; description: string }>;
    edges: Array<{ source: string; target: string; connection_type: string; description: string }>;
    domainDistribution: DomainDistribution;
    rarityScore: number;
    complexityScore: number;
  }
  ```

#### 2. `digDeeperFn`
- **Type**: POST
- **Input**: `{ selectedNodeLabel: string, currentGraph: GraphResponse, trail: TrailStep[] }`
- **Output**: `{ updatedGraph: GraphResponse, updatedTrail: TrailStep[] }`

#### 3. `saveSpecimenFn`
- **Type**: POST
- **Input**: 
  ```typescript
  interface SaveSpecimenPayload {
    title: string;
    summary: string;
    originSource: 'topic' | 'url';
    originValue: string;
    nodes: Array<{ label: string; node_type: string; description: string }>;
    edges: Array<{ sourceLabel: string; targetLabel: string; connection_type: string; description: string }>;
    domainDistribution: DomainDistribution;
    rarityScore: number;
    complexityScore: number;
    trailSteps: TrailStep[];
  }
  ```
- **Output**: `{ success: boolean, specimenId: string }`

---

### B. Cabinet & Collections APIs
#### 4. `getCabinetFn`
- **Type**: GET
- **Input**: `{ search?: string, domain?: string, sortBy?: 'date' | 'rarity' | 'depth' }`
- **Output**: `{ specimens: Specimen[] }`

---

### C. Connections & Synthesis APIs
#### 5. `findUnexpectedConnectionsFn`
- **Type**: GET
- **Input**: `{ specimenId: string }`
- **Output**: 
  ```typescript
  interface ConnectionMatch {
    targetSpecimenId: string;
    title: string;
    similarityScore: number;
    domainOverlap: string[];
  }
  ```

#### 6. `generateBridgeExplanationFn`
- **Type**: POST
- **Input**: `{ specimenAId: string, specimenBId: string }`
- **Output**: `{ bridgeTitle: string, explanationMarkdown: string }`

---

### D. Museum & Analytics APIs
#### 7. `getMuseumAnalyticsFn`
- **Type**: GET
- **Output**: 
  ```typescript
  interface MuseumAnalytics {
    totalSpecimensCount: number;
    deepestRabbitHole: number;
    averageTrailLength: number;
    domainBreakdown: Array<{ name: string; percentage: number }>;
    discoveryTrails: Array<{ specimenTitle: string; maxDepth: number; totalSteps: number }>;
  }
  ```

#### 8. `generateCuriosityInsightFn`
- **Type**: POST
- **Output**: `{ insightMarkdown: string }`

---

### E. Investigation Board APIs
#### 9. `getInvestigationBoardFn`
- **Type**: GET
- **Input**: `{ investigationId: string }`
- **Output**: `{ notes: StickyNote[], threads: BoardThread[] }`

#### 10. `saveStickyNoteFn`
- **Type**: POST
- **Input**: `{ note: Omit<StickyNote, 'formattedDate'> }`
- **Output**: `{ success: boolean, noteId: string }`

#### 11. `saveThreadFn`
- **Type**: POST
- **Input**: `{ thread: Omit<BoardThread, 'id'> }`
- **Output**: `{ success: boolean, threadId: string }`

---

## 6. Graph Rendering Strategy (Explore Page)

1. **Rendering Choice**: **React + D3-force (SVG-based layout)**. Graph elements render as catalog cards and paper notebook nodes.
2. **Physics Engine**:
   - `d3-force` runs in a custom hook `useGraphLayout.ts`.
   - Physics parameters are optimized to separate different branches of the "rabbit hole", clustering nodes by depth.
3. **Visual Style**:
   - Matches the UI Build Guide: sharp-cornered catalog boxes (0.25rem radius), thin 1px lines at 40% opacity (`--ink-soft`), and dashed connections (`--clay`) representing cross-links.
   - Ink-drawing animation effects apply to connections on first rendering.
4. **Zoom & Pan Canvas**:
   - Wrapped in a `d3-zoom` event listener to enable seamless dragging, zooming, and pan bounds-restricting.

---

## 7. Embedding Workflow (Connect Page)

1. **Embedding Manifest Construction**:
   - When a specimen is saved, a text manifest is formatted:
     ```text
     Specimen Title: [Title]
     Origin: [Seed topic or seed URL]
     Core Summary: [AI Summary]
     Primary Domains: [Domain Distribution Tags]
     Key Concepts Explored: [Node labels comma-separated]
     ```
2. **Similarity Querying**:
   - Saved specimens are compared on the server using PostgreSQL's cosine operator (`<=>`).
   - We query similar items whose similarity score is between `0.65` and `0.85` (cosine distance between `0.15` and `0.35`). Scores higher than `0.9` represent duplicate seeds, while scores below `0.5` are too distant to establish a logical AI explanation.
3. **Link Synthesis**:
   - The explanation generator is fed summaries of both specimens and outputs a bridge analysis, detailing the connection in rich Markdown.

---

## 8. Scale & Optimization Concerns

- **Graph Bloat (WebGL Fallback)**:
  - *Symptom*: If a user continues clicking "Dig Deeper" to a depth of 6+, the SVG node count might exceed 200, degrading rendering frame rates.
  - *Mitigation*: Cap "Dig Deeper" depth at 5 levels per active explorer session, or switch rendering engine from SVG to HTML5 Canvas if node counts surpass 150.
- **Scraper Anti-Bot Blocking**:
  - *Symptom*: URL inputs fail when target websites use Cloudflare or bot protection.
  - *Mitigation*: Implement standard user-agent rotation or degrade gracefully to asking the user to copy-paste the text content directly if HTTP scraping fails.
- **AI Rate Limits**:
  - *Symptom*: Rapidly digging deeper and saving specimens exhausts API token allowances.
  - *Mitigation*: Implement a token-bucket rate limiter in Server Functions per user session.
