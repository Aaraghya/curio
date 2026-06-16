# Curio AI Service Layer Design Documentation

This document defines the complete AI service layer for the **Curio Digital Curiosity Archive**. All services integrate with the Google Gen AI SDK utilizing **Gemini 2.5 Flash** for structural parsing and synthesis, and the **Text Embeddings model (`text-embedding-004`)** for semantic vectors.

---

## Service Architecture Overview

The AI layer sits between our TanStack Start Server Functions and the client-facing UI. It enforces structured JSON outputs using native Gemini schema configurations, validates the outputs using Zod, and manages caching and error bounds.

```
[Server Functions] 
       │
       ▼
[AI Service Layer Wrapper]
       │
  ┌────┼────────────────────────────────────────────────────────┐
  ▼    ▼                                                        ▼
[Zod Schema] ──(Fails)──► [Retry / Fallback Engine]      [Concept Cache / DB]
  │                                                             │ (Cache Hit)
  ▼ (Validated)                                                 ▼
[Client UI] ◄───────────────────────────────────────────── [Return Cache]
```

---

## Shared Configurations & Policies

### A. Retry Logic
For transient API faults (such as status code `500`, `503`, or connection timeouts):
- **Mechanism**: Exponential backoff with random jitter.
- **Parameters**: 
  - `initialDelayMs`: 1000ms
  - `factor`: 2
  - `maxRetries`: 3
  - `jitter`: ±200ms

### B. Rate-Limit Handling (HTTP 429)
When API rate limits are hit:
- Catch the `429` error envelope.
- Introduce a 2-second sleep wait before performing a single retry.
- If the retry fails, throw a custom exception `AI_RATE_LIMIT_EXCEEDED` which is intercepted by the client UI to render a quiet alert: *"The archivist is busy cataloging. Please wait a moment."*

### C. Caching Strategy
- **Static Caching**: Topic and node expansion responses are cached inside the `concept_cache` table using lowercased and trimmed topic names as the `concept_key`.
- **Pre-computed Storage**: Embeddings, unexpected connections, and museum insights are computed once and stored directly in their respective schema tables (`specimens`, `unexpected_connections`, `curiosity_insights`), completely avoiding repeated API invocations.

---

## Detailed Service Specifications

### 1. Topic Analysis Service
*   **Purpose**: Validates, cleans, and suggests domains and tags for a user-submitted topic seed.
*   **Model**: `gemini-2.5-flash`
*   **Inputs**:
    ```typescript
    interface TopicAnalysisInput {
      topic: string;
    }
    ```
*   **Outputs**:
    ```typescript
    interface TopicAnalysisOutput {
      title: string;
      summary: string;
      suggestedDomain: 'Technology' | 'History' | 'Science' | 'Culture';
      tags: string[];
      complexityEstimate: number; // 1-100
      rarityScore: number;       // 1-100
    }
    ```
*   **Prompt Strategy**:
    *   **System Instruction**: *"You are an academic archivist. Categorize the seed topic into one of the four official domains: Technology, History, Science, or Culture. Suggest a title, a brief summary of the concept, 3 tags, a complexity estimation, and a rarity score indicating how uncommon this topic is in standard collections."*
*   **Gemini Response Schema**:
    ```json
    {
      "type": "OBJECT",
      "properties": {
        "title": { "type": "STRING" },
        "summary": { "type": "STRING" },
        "suggestedDomain": { "type": "STRING", "enum": ["Technology", "History", "Science", "Culture"] },
        "tags": { "type": "ARRAY", "items": { "type": "STRING" } },
        "complexityEstimate": { "type": "INTEGER" },
        "rarityScore": { "type": "INTEGER" }
      },
      "required": ["title", "summary", "suggestedDomain", "tags", "complexityEstimate", "rarityScore"]
    }
    ```
*   **Zod Validation Schema**:
    ```typescript
    import { z } from 'zod';

    const TopicAnalysisOutputSchema = z.object({
      title: z.string().min(1).max(100),
      summary: z.string().min(10).max(300),
      suggestedDomain: z.enum(['Technology', 'History', 'Science', 'Culture']),
      tags: z.array(z.string().min(1)).min(1).max(5),
      complexityEstimate: z.number().int().min(1).max(100),
      rarityScore: z.number().int().min(1).max(100)
    });
    ```
*   **Failure Handling**: Fall back to generic default values and label the domain as `Culture` if parser validation fails after retries.

---

### 2. URL Analysis Service
*   **Purpose**: Distills raw scraped page texts into an archival curiosity overview.
*   **Model**: `gemini-2.5-flash`
*   **Inputs**:
    ```typescript
    interface UrlAnalysisInput {
      url: string;
      rawText: string; // Trimmed text content (max 8000 words)
    }
    ```
*   **Outputs**: Same as `TopicAnalysisOutput`.
*   **Prompt Strategy**:
    *   **System Instruction**: *"Analyze the text extracted from the URL. Distill it into an archival specimen entry. Identify the core theme, select one of the four domains (Technology, History, Science, Culture), suggest 3 tags, evaluate the topic complexity, and rate its archive rarity."*
*   **Gemini Response Schema**: Same as `TopicAnalysis` response schema.
*   **Zod Validation Schema**: Same as `TopicAnalysisOutputSchema`.
*   **Failure Handling**: If the scraped text is empty or blocked by anti-bot handlers, reject the request with a `SCRAPING_BLOCKED` flag, prompting the client UI to request manual text submission.

---

### 3. Knowledge Graph Generation Service
*   **Purpose**: Extracts related entities and semantic connections based on a topic/URL analysis context.
*   **Model**: `gemini-2.5-flash`
*   **Inputs**:
    ```typescript
    interface GraphGenerationInput {
      title: string;
      summary: string;
    }
    ```
*   **Outputs**:
    ```typescript
    interface GraphNode {
      id: string; // Alphanumeric slug
      label: string;
      type: string; // e.g., "Concept", "Entity", "Event"
      description: string;
    }

    interface GraphEdge {
      source: string; // Node ID
      target: string; // Node ID
      connection_type: string;
      description: string; // Archival logic behind connection
    }

    interface GraphGenerationOutput {
      nodes: GraphNode[];
      edges: GraphEdge[];
    }
    ```
*   **Prompt Strategy**:
    *   **System Instruction**: *"Using the provided title and summary context, generate an interconnected knowledge graph containing exactly 8 to 12 nodes and 10 to 15 edges. Nodes represent concepts. Edges represent relationships. Provide alphanumeric string IDs for nodes and map edges using source and target IDs."*
*   **Gemini Response Schema**:
    ```json
    {
      "type": "OBJECT",
      "properties": {
        "nodes": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": {
              "id": { "type": "STRING" },
              "label": { "type": "STRING" },
              "type": { "type": "STRING" },
              "description": { "type": "STRING" }
            },
            "required": ["id", "label", "type", "description"]
          }
        },
        "edges": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": {
              "source": { "type": "STRING" },
              "target": { "type": "STRING" },
              "connection_type": { "type": "STRING" },
              "description": { "type": "STRING" }
            },
            "required": ["source", "target", "connection_type", "description"]
          }
        }
      },
      "required": ["nodes", "edges"]
    }
    ```
*   **Zod Validation Schema**:
    ```typescript
    const GraphNodeSchema = z.object({
      id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
      label: z.string().min(1).max(50),
      type: z.string().min(1).max(30),
      description: z.string().min(5).max(200)
    });

    const GraphEdgeSchema = z.object({
      source: z.string(),
      target: z.string(),
      connection_type: z.string().min(1).max(30),
      description: z.string().min(5).max(200)
    });

    const GraphGenerationOutputSchema = z.object({
      nodes: z.array(GraphNodeSchema).min(5).max(15),
      edges: z.array(GraphEdgeSchema).min(4).max(25)
    }).refine((data) => {
      // Validate that all edges reference valid node IDs
      const nodeIds = new Set(data.nodes.map(n => n.id));
      return data.edges.every(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    }, { message: "Edge references must match valid node IDs." });
    ```
*   **Failure Handling**: If the generated JSON violates node ID mapping constraints, clean or prune invalid edges before sending to the client rather than failing.

---

### 4. Graph Expansion Service ("Dig Deeper")
*   **Purpose**: Generates additional satellite branches when expanding an existing node.
*   **Model**: `gemini-2.5-flash`
*   **Inputs**:
    ```typescript
    interface GraphExpansionInput {
      targetNodeLabel: string;
      existingNodes: string[]; // List of already rendered node labels to avoid duplicate generation
    }
    ```
*   **Outputs**:
    ```typescript
    interface GraphExpansionOutput {
      newNodes: GraphNode[];
      newEdges: GraphEdge[];
    }
    ```
*   **Prompt Strategy**:
    *   **System Instruction**: *"Expand the selected concept. Generate 3 to 5 new conceptual nodes that dig deeper into the topic. Connect them back to the target node. Avoid generating concepts listed in the existingNodes list to ensure variety."*
*   **Gemini Response Schema**: Same structure as the Knowledge Graph Service but containing a smaller collection range.
*   **Zod Validation Schema**: Same validation structure as graph generation, verifying ID integrity.
*   **Caching**: Expansion results are indexed in `concept_cache` using `concept_key = lower(targetNodeLabel)`.

---

### 5. Embedding Generation Service
*   **Purpose**: Creates vector coordinates representing the specimen.
*   **Model**: `text-embedding-004`
*   **Inputs**:
    ```typescript
    interface EmbeddingInput {
      text: string; // Compiled specimen summary and tags manifest
    }
    ```
*   **Outputs**:
    ```typescript
    interface EmbeddingOutput {
      embedding: number[]; // 768 float array
    }
    ```
*   **Zod Validation Schema**:
    ```typescript
    const EmbeddingOutputSchema = z.object({
      embedding: z.array(z.number()).length(768)
    });
    ```

---

### 6. Unexpected Connection Discovery Service
*   **Purpose**: Validates similarity pairings to find unexpected cross-connections.
*   **Model**: `gemini-2.5-flash`
*   **Inputs**:
    ```typescript
    interface ConnectionCandidateInput {
      specimenA: { title: string; summary: string; domain: string };
      specimenB: { title: string; summary: string; domain: string };
    }
    ```
*   **Outputs**:
    ```typescript
    interface ConnectionCandidateOutput {
      isUnexpected: boolean;
      uniquenessScore: number; // 1-100
      sharedCoreConcept: string;
    }
    ```
*   **Prompt Strategy**:
    *   **System Instruction**: *"Analyze the summaries of specimen A and specimen B. Determine if there is a latent, unexpected logical bridge linking them. If they share obvious keywords, they are not unexpected. Rate their connection uniqueness from 1 to 100."*
*   **Gemini Response Schema**:
    ```json
    {
      "type": "OBJECT",
      "properties": {
        "isUnexpected": { "type": "BOOLEAN" },
        "uniquenessScore": { "type": "INTEGER" },
        "sharedCoreConcept": { "type": "STRING" }
      },
      "required": ["isUnexpected", "uniquenessScore", "sharedCoreConcept"]
    }
    ```
*   **Zod Validation Schema**:
    ```typescript
    const ConnectionCandidateOutputSchema = z.object({
      isUnexpected: z.boolean(),
      uniquenessScore: z.number().int().min(1).max(100),
      sharedCoreConcept: z.string().max(80)
    });
    ```

---

### 7. Bridge Explanation Service
*   **Purpose**: Writes a narrative explaining the unexpected bridge linking two specimens.
*   **Model**: `gemini-2.5-flash`
*   **Inputs**:
    ```typescript
    interface BridgeExplanationInput {
      specimenATitle: string;
      specimenASummary: string;
      specimenBTitle: string;
      specimenBSummary: string;
      sharedConcept: string;
    }
    ```
*   **Outputs**:
    ```typescript
    interface BridgeExplanationOutput {
      bridgeTitle: string;
      explanationMarkdown: string; // Markdown text (written in archival tone)
    }
    ```
*   **Prompt Strategy**:
    *   **System Instruction**: *"Write a 2-paragraph narrative in the tone of a 1920s naturalist notebook. Explain the connection between Specimen A and Specimen B using the shared concept. Do not use generic words. Frame it as a discovery log. Keep the explanation field as valid Markdown, wrapped inside a JSON response envelope."*
*   **Gemini Response Schema**:
    ```json
    {
      "type": "OBJECT",
      "properties": {
        "bridgeTitle": { "type": "STRING" },
        "explanationMarkdown": { "type": "STRING" }
      },
      "required": ["bridgeTitle", "explanationMarkdown"]
    }
    ```
*   **Zod Validation Schema**:
    ```typescript
    const BridgeExplanationOutputSchema = z.object({
      bridgeTitle: z.string().min(1).max(100),
      explanationMarkdown: z.string().min(50).max(1200)
    });
    ```

---

### 8. Museum Insight Generation Service
*   **Purpose**: Creates reflection insights summarizing the user's Cabinet collections.
*   **Model**: `gemini-2.5-flash`
*   **Inputs**:
    ```typescript
    interface MuseumInsightInput {
      specimens: Array<{ title: string; summary: string }>;
    }
    ```
*   **Outputs**:
    ```typescript
    interface MuseumInsightOutput {
      insightTitle: string;
      confidencePercentage: number;
      insightMarkdown: string;
      evidenceSpecimens: string[]; // List of specimen titles
    }
    ```
*   **Prompt Strategy**:
    *   **System Instruction**: *"Analyze the list of saved specimens. Identify a overarching intellectual focus (obsession/pattern) present across these items. Write a critique in a naturalist notebook style, citing the evidence specimens. Output as JSON with markdown in the explanation field."*
*   **Gemini Response Schema**:
    ```json
    {
      "type": "OBJECT",
      "properties": {
        "insightTitle": { "type": "STRING" },
        "confidencePercentage": { "type": "INTEGER" },
        "insightMarkdown": { "type": "STRING" },
        "evidenceSpecimens": { "type": "ARRAY", "items": { "type": "STRING" } }
      },
      "required": ["insightTitle", "confidencePercentage", "insightMarkdown", "evidenceSpecimens"]
    }
    ```
*   **Zod Validation Schema**:
    ```typescript
    const MuseumInsightOutputSchema = z.object({
      insightTitle: z.string().min(1).max(100),
      confidencePercentage: z.number().int().min(1).max(100),
      insightMarkdown: z.string().min(50).max(1500),
      evidenceSpecimens: z.array(z.string()).min(1)
    });
    ```

---

## Implementation Plan

1.  **Helper setup**: Initialize the Gemini API client inside `app/lib/gemini.ts`. Set up unified rate-limit backoffs and retry wraps.
2.  **Schema files creation**: Create `app/server/schema.ts` to export all Zod schema definitions (`TopicAnalysisOutputSchema`, `GraphGenerationOutputSchema`, etc.).
3.  **Service wrapper creation**: Write files in `app/server/functions/` to execute structured queries to Gemini using `responseSchema` parameters to force JSON envelopes.
4.  **Integration testing**: Verify Zod parser outputs. Implement database caching on `generateGraphFn` and `digDeeperFn` to finalize integration.
