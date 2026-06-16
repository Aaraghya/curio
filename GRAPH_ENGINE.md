# Curio Knowledge Graph Engine Design Documentation

This document defines the core architecture and specifications for the **Curio Knowledge Graph Engine**. The engine is responsible for generating, validating, expanding, and rendering semantic structures optimized for the Curio digital curiosity archive.

---

## 1. Graph Philosophy

Curio graphs are designed for **curiosity-driven exploration**, not exhaustive cataloging. They prioritize interestingness and conceptual friction over completeness.

Every graph must incorporate:
*   **Seed Concept**: The entry point (topic seed or URL text).
*   **Direct Foundations**: Essential prerequisites or definitions of the seed.
*   **Contextual Influences**: Cultural, scientific, or historical elements that shaped the concept.
*   **Unexpected Branches**: At least one link connecting the seed or a foundation node to a seemingly unrelated discipline (e.g., linking *Fungal Networks* to *Subway Design Systems*).

---

## 2. Graph Structure & Limits

A Curio graph represents a directed network layout centered around the root seed node.

```
 [Unexpected Branch] ◄──(Mirrors)─── [Satellite Node] ───(Influenced)───► [Seed Node] (Depth 0)
                                                                            │
                                                                       (Emerged From)
                                                                            ▼
                                                                     [Foundation Node]
```

### Constraints & Complexity Boundaries
-   **Initial Graph Size**: 8 to 12 nodes, 10 to 15 edges.
-   **Maximum Graph Size (Hard Cap)**: 60 nodes and 80 edges.
-   **Maximum Rabbit-Hole Depth**: 5 levels from the seed node (represented as steps on the explorer sidebar).
-   **Satellites per Expansion**: 3 to 5 new nodes generated per "Dig Deeper" click.
-   **Disconnected Subgraphs**: Strictly prohibited. Every node must share a path back to the seed.

---

## 3. Node Types & Visual Mapping

Nodes are categorized to fit the archival catalog theme of the Cabinet.

| Node Type | Allowed Sub-Categories | Visual Archetype / Color Mappings |
| :--- | :--- | :--- |
| **Concept** | Theoretical frameworks, ideas | `--ink-soft` (Primary catalog text label) |
| **Person** | Naturalists, scientists, philosophers | `--clay` (Warm brown detail border) |
| **Event** | Historical breakthroughs, epochs | `--burgundy` (Rich dark red accent) |
| **Technology** | Inventions, machines, algorithms | `--moss` (Olive green domain indicator) |
| **System** | Biological networks, architectural models | `--navy` (Muted dark blue indicator) |
| **Artifact** | Books, letters, physical tools | `--ink` (Dark charcoal outline boxes) |
| **Question** | Paradoxes, unresolved hypotheses | `--maroon` (Deep crimson question marks) |

### Generation Rules
1.  Node labels must be short (1 to 4 words).
2.  Every node must carry a brief archival descriptive label (100 to 200 characters) written in a descriptive tone.
3.  Each node must resolve to one of the four main domains: `Technology`, `History`, `Science`, or `Culture`.

---

## 4. Edge Types & Relationships

Edges depict the semantic thread linking two ideas.

| Edge Type | Directional Rule | Semantic Intent |
| :--- | :--- | :--- |
| **Emerged From** | Target → Source | Causal historical sequence or developmental derivation. |
| **Enabled** | Source → Target | A prerequisite system or tool that made the target possible. |
| **Influenced** | Source → Target | Logical, creative, or intellectual inspiration. |
| **Contrasts With** | Bi-directional | Highlights logical differences or opposite ideas. |
| **Mirrors** | Bi-directional | Highlights conceptual structural parallels in completely separate fields. |
| **Inspired** | Source → Target | Artistic, cultural, or philosophical design impact. |

### Edge Validation Rules
1.  Self-loops (source node equals target node) are rejected.
2.  Parallel duplicate edges (multiple lines of the same connection type between the same nodes) are merged.
3.  Every edge must contain an archival description explaining why this specific relationship exists.

---

## 5. Curiosity Heuristics (Interestingness Scoring)

To prevent the generation of generic category trees, the engine calculates a **Curiosity Score** ($C_g$) for every generated graph:

$$C_g = (W_d \cdot H_d) + (W_r \cdot R_s) + (W_u \cdot U_b)$$

Where:
*   **Domain Entropy ($H_d$)**: Measures domain variety. Higher entropy indicates the graph spans multiple fields (e.g. Science, Art, and History).
    $$H_d = -\sum_{i} p_i \ln(p_i)$$
*   **Seed Rarity ($R_s$)**: Evaluates how uncommon the seed topic is based on global specimen archives.
*   **Unexpected Bridges ($U_b$)**: A count of bi-directional `Mirrors` or `Contrasts With` connections linking disparate categories.
*   **Weights ($W$)**: $W_d = 0.4$, $W_r = 0.3$, $W_u = 0.3$.

---

## 6. Graph Expansion ("Dig Deeper")

Expanding a node creates a rabbit-hole hop:
1.  **Context Construction**: The engine bundles the labels of all existing nodes inside the current graph.
2.  **AI Invocation**: Gemini receives the target node label and the `existingNodeLabels` array. It is instructed to generate 3 to 5 new conceptual satellites and link them to the target.
3.  **Duplication Filtering**:
    - Gemini's schema constraints prevent it from outputting labels matching the list.
    - If a duplicate label bypasses the model, the engine resolves or discards it.
4.  **Trail Update**: The system records the step, increments the session depth counter, and updates the active session parameters in `exploration_sessions`.

---

## 7. Engine Validation Layer (Zod Schemas)

The Graph Engine uses TypeScript schemas to validate structural integrity before database write or UI rendering.

```typescript
import { z } from 'zod';

// Node validation
export const EngineNodeSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().min(1).max(50),
  type: z.enum(['Concept', 'Person', 'Event', 'Technology', 'System', 'Artifact', 'Question']),
  description: z.string().min(10).max(200),
  domain: z.enum(['Technology', 'History', 'Science', 'Culture'])
});

// Edge validation
export const EngineEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  connection_type: z.enum(['Emerged From', 'Enabled', 'Influenced', 'Contrasts With', 'Mirrors', 'Inspired']),
  description: z.string().min(10).max(200)
}).refine(edge => edge.source !== edge.target, {
  message: "Self-referencing loops are not allowed."
});

// Graph Envelope validation
export const EngineGraphSchema = z.object({
  nodes: z.array(EngineNodeSchema).min(3).max(60),
  edges: z.array(EngineEdgeSchema).min(2).max(80)
}).refine(graph => {
  // Validate Connectivity (ensure no isolated/disconnected subgraphs)
  const adjacencyList = new Map<string, string[]>();
  graph.nodes.forEach(n => adjacencyList.set(n.id, []));
  
  graph.edges.forEach(e => {
    adjacencyList.get(e.source)?.push(e.target);
    adjacencyList.get(e.target)?.push(e.source); // Treat undirected for connectivity checks
  });

  const visited = new Set<string>();
  const startNode = graph.nodes[0]?.id;
  if (!startNode) return false;

  // Perform standard Breadth-First Search (BFS)
  const queue = [startNode];
  visited.add(startNode);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Graph passes connectivity if visited node count matches total nodes
  return visited.size === graph.nodes.length;
}, {
  message: "Graph must be fully connected. Disconnected components are not allowed."
});
```

---

## 8. Persistence Strategy

When saving a specimen:
1.  **Transaction Execution**: All database operations execute inside a unified database transaction.
2.  **Specimen Write**: Writes the core description, domain distribution ratios, and metadata.
3.  **Nodes & Edges Insertion**: Node records are inserted first, retrieving database UUIDs. Edge source/target IDs are converted from local string slugs to these actual database UUID references.
4.  **Embedding Compilation**: An asynchronous server action runs the summary manifest through `text-embedding-004` and updates the specimen's embedding column.
5.  **Trail Persistence**: The active `exploration_sessions` steps array is logged into the `discovery_trails` table.

---

## 9. UI Rendering Representation

The output data layout is structured to align with D3 layout inputs and the UI Build Guide:

```typescript
interface RenderingGraphPayload {
  seedNodeId: string; // The root concept highlighted in the middle
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    description: string;
    domain: 'Technology' | 'History' | 'Science' | 'Culture';
    x?: number; // Coordinates set dynamically by D3 force layout
    y?: number;
  }>;
  edges: Array<{
    sourceId: string;
    targetId: string;
    connectionType: string;
    description: string;
    isUnexpectedBridge: boolean; // Triggers dashed clay line animations in the UI
  }>;
  trailHighlightIds: string[]; // Node IDs mapped in sequence inside active discovery trail
}
```
