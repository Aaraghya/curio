# Curio Explore Workspace — Implementation Walkthrough

This document summarizes the changes, components, and services implemented to construct the primary **Explore Workspace** on Curio v1.2.

---

## 1. Summary of Changes

We have completed the full end-to-end integration of the Explore page, connecting the client-side D3-physics visual graph coordinates wrapper with the Gemini 2.5 Flash Server Functions and Supabase Postgres database.

### Core Files Created & Wired:
1.  **AI Service Client**:
    *   [app/lib/gemini.ts](file:///c:/Users/aarag/Desktop/curio/app/lib/gemini.ts): Establishes exponential backoff API calls to Gemini 2.5 Flash using strict JSON Schema configurations, and generates 768-dimension floats via `text-embedding-004`.
2.  **Supabase Client**:
    *   [app/lib/supabase.ts](file:///c:/Users/aarag/Desktop/curio/app/lib/supabase.ts): Hooks up a service-role bypass client safely on server boundaries.
3.  **Zod Schema Validators**:
    *   [app/server/schema.ts](file:///c:/Users/aarag/Desktop/curio/app/server/schema.ts): Houses structural validators ensuring graph connectivity, correct domain types, and mapping parameters.
4.  **Vinxi Server Functions**:
    *   [app/server/functions/analyze.ts](file:///c:/Users/aarag/Desktop/curio/app/server/functions/analyze.ts): Hosts `generateGraphFn` and `digDeeperFn` wrapped inside `@tanstack/start` server structures. Includes caching checks on the database before making API calls.
    *   [app/server/functions/db.ts](file:///c:/Users/aarag/Desktop/curio/app/server/functions/db.ts): Houses `saveSpecimenFn` executing specimen writes, node mappings, trail logging, and embedding mutations.
5.  **Layout Physics Hook**:
    *   [app/hooks/useGraphLayout.ts](file:///c:/Users/aarag/Desktop/curio/app/hooks/useGraphLayout.ts): A clean, self-contained force-directed coordinate simulator in TypeScript. Computes repulsion and spring coordinates to arrange node percentages.
6.  **Interactive Canvas Visualization**:
    *   [app/components/graph/KnowledgeGraph.tsx](file:///c:/Users/aarag/Desktop/curio/app/components/graph/KnowledgeGraph.tsx): Compiles absolute buttons and responsive SVG lines (solid/dashed) matching the museum catalog styling.
7.  **Final Page Shell Ingestion**:
    *   [app/routes/index.tsx](file:///c:/Users/aarag/Desktop/curio/app/routes/index.tsx): Controls the active explore session, forms submissions, trial arrays, skeletons, and optimistic cabinet saves.

---

## 2. Interactive Features Tested & Completed

*   **Ingestion State**: Inputs transition through `analyzing` (displaying `GraphCanvasSkeleton`) to `ready`, rendering headers and tags.
*   **Active Depth dots**: Updates are synced to the URL search parameter `?depth=N`. The global `ArchiveNav` dot strip reacts dynamically to these URL modifications.
*   **Dig Deeper expansions**: satellite nodes are dynamically computed, preventing duplicate labels by supplying existing node indexes to the Gemini parser.
*   **Optimistic Saving**: Initiating save logs nodes, edges, and step histories, updating database coordinates and rendering the success card.
*   **Cache Ingestion**: Second queries on identical seeds trigger immediate returns from PostgreSQL `concept_cache` table records.
