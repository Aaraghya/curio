import { z } from 'zod';

// 1. Topic Analysis Validation
export const TopicAnalysisOutputSchema = z.object({
  title: z.string().min(1).max(100),
  summary: z.string().min(10).max(400),
  suggestedDomain: z.enum(['Technology', 'History', 'Science', 'Culture']),
  tags: z.array(z.string().min(1)).min(1).max(5),
  complexityEstimate: z.number().int().min(1).max(100),
  rarityScore: z.number().int().min(1).max(100)
});

// 2. Node Validation
export const EngineNodeSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().min(1).max(50),
  type: z.enum(['Concept', 'Person', 'Event', 'Technology', 'System', 'Artifact', 'Question']),
  description: z.string().min(10).max(300),
  domain: z.enum(['Technology', 'History', 'Science', 'Culture'])
});

// 3. Edge Validation
export const EngineEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  connection_type: z.enum(['Emerged From', 'Enabled', 'Influenced', 'Contrasts With', 'Mirrors', 'Inspired']),
  description: z.string().min(10).max(300)
}).refine(edge => edge.source !== edge.target, {
  message: "Self-referencing loops are not allowed."
});

// 4. Knowledge Graph Structural Validation
export const EngineGraphSchema = z.object({
  nodes: z.array(EngineNodeSchema).min(3).max(60),
  edges: z.array(EngineEdgeSchema).min(2).max(80)
}).refine(graph => {
  // Ensure no disconnected subgraphs via BFS check
  const adjacencyList = new Map<string, string[]>();
  graph.nodes.forEach(n => adjacencyList.set(n.id, []));
  
  graph.edges.forEach(e => {
    adjacencyList.get(e.source)?.push(e.target);
    adjacencyList.get(e.target)?.push(e.source);
  });

  const visited = new Set<string>();
  const startNode = graph.nodes[0]?.id;
  if (!startNode) return false;

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

  return visited.size === graph.nodes.length;
}, {
  message: "Graph must be fully connected. Disconnected components are not allowed."
});

// 5. Graph Expansion Validation
export const GraphExpansionOutputSchema = z.object({
  newNodes: z.array(EngineNodeSchema).min(2).max(10),
  newEdges: z.array(EngineEdgeSchema).min(2).max(15)
});
