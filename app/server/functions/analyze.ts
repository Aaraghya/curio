import { createServerFn } from '@tanstack/start';
import { callGemini } from '../../lib/gemini';
import { supabaseAdmin } from '../../lib/supabase';
import { TopicAnalysisOutputSchema, EngineGraphSchema, GraphExpansionOutputSchema } from '../schema';
import { getAuthenticatedUserId } from './auth';

const getCacheKey = (input: string) => input.toLowerCase().trim();

// 1. GENERATE GRAPH SERVER FUNCTION WITH SESSION PERSISTENCE
export const generateGraphFn = createServerFn({ method: 'POST' })
  .validator((input: { source: string; type: 'topic' | 'url' }) => input)
  .handler(async ({ input }) => {
    const cacheKey = getCacheKey(input.source);
    let finalResult: any = null;
    
    // Check PostgreSQL Cache first
    try {
      const { data: cacheData, error } = await supabaseAdmin
        .from('concept_cache')
        .select('generated_graph')
        .eq('concept_key', cacheKey)
        .maybeSingle();
      
      if (!error && cacheData) {
        console.log(`Cache HIT for key: "${cacheKey}"`);
        finalResult = cacheData.generated_graph;
      }
    } catch (dbErr) {
      console.warn('Cache database check failed:', dbErr);
    }

    if (!finalResult) {
      // Cache MISS: Query Gemini 2.5 Flash
      console.log(`Cache MISS for key: "${cacheKey}". Invoking Gemini 2.5...`);
      
      const systemInstruction = `You are a museum archivist and curator. 
Your goal is to parse the input seed (topic or URL content) and construct a curiosity-driven knowledge graph specimen. 
You must output a structured JSON containing:
1. Metadatum: title, summary, suggestedDomain (strict Technology/History/Science/Culture enum), tags (max 3), complexityEstimate (1-100), and rarityScore (1-100).
2. Nodes: 8 to 12 concept nodes. Each node must have an id (alphanumeric slugs), label, type, description, and domain.
3. Edges: 10 to 15 edges connecting these nodes. You must establish at least one "Unexpected Branch" using a 'Mirrors' or 'Contrasts With' link connecting to a conceptually distant node.
Ensure all edge sources and targets map exactly to node ids. No disconnected nodes allowed.`;

      const prompt = input.type === 'url'
        ? `Extract and construct a specimen graph from the following source page: "${input.source}"`
        : `Construct a specimen graph seeded from the topic: "${input.source}"`;

      const responseSchema = {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          summary: { type: "STRING" },
          suggestedDomain: { type: "STRING", enum: ["Technology", "History", "Science", "Culture"] },
          tags: { type: "ARRAY", items: { type: "STRING" } },
          complexityEstimate: { type: "INTEGER" },
          rarityScore: { type: "INTEGER" },
          nodes: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                label: { type: "STRING" },
                type: { type: "STRING", enum: ["Concept", "Person", "Event", "Technology", "System", "Artifact", "Question"] },
                description: { type: "STRING" },
                domain: { type: "STRING", enum: ["Technology", "History", "Science", "Culture"] }
              },
              required: ["id", "label", "type", "description", "domain"]
            }
          },
          edges: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                source: { type: "STRING" },
                target: { type: "STRING" },
                connection_type: { type: "STRING", enum: ["Emerged From", "Enabled", "Influenced", "Contrasts With", "Mirrors", "Inspired"] },
                description: { type: "STRING" }
              },
              required: ["source", "target", "connection_type", "description"]
            }
          }
        },
        required: ["title", "summary", "suggestedDomain", "tags", "complexityEstimate", "rarityScore", "nodes", "edges"]
      };

      const graphData = await callGemini({
        model: 'gemini-2.5-flash',
        systemInstruction,
        prompt,
        responseSchema
      });

      // Validate structure
      const parsedGraph = EngineGraphSchema.parse({
        nodes: graphData.nodes,
        edges: graphData.edges
      });

      finalResult = {
        title: graphData.title,
        summary: graphData.summary,
        suggestedDomain: graphData.suggestedDomain,
        tags: graphData.tags,
        complexityEstimate: graphData.complexityEstimate,
        rarityScore: graphData.rarityScore,
        nodes: parsedGraph.nodes,
        edges: parsedGraph.edges
      };

      // Store cache asynchronously
      supabaseAdmin
        .from('concept_cache')
        .insert({ concept_key: cacheKey, generated_graph: finalResult })
        .then(({ error }) => {
          if (error) console.error('Failed to cache generated graph:', error.message);
        });
    }

    // Create Exploration Session in database
    const userId = await getAuthenticatedUserId();
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('exploration_sessions')
      .insert({
        user_id: userId,
        seed_concept: finalResult.title,
        trail_history: [{ stepNumber: 1, nodeLabel: finalResult.title, depth: 0 }],
        current_depth: 0,
        is_archived: false
      })
      .select('id')
      .single();

    if (sessErr || !session) {
      console.error('Failed to log exploration session:', sessErr?.message);
    }

    return {
      ...finalResult,
      sessionId: session?.id || null
    };
  });

// 2. DIG DEEPER (GRAPH EXPANSION) SERVER FUNCTION WITH TRAIL WRITEBACK
export const digDeeperFn = createServerFn({ method: 'POST' })
  .validator((input: {
    sessionId: string | null;
    targetNodeId: string;
    targetNodeLabel: string;
    existingNodeLabels: string[];
    trailSteps: Array<{ stepNumber: number; nodeLabel: string; depth: number }>;
  }) => input)
  .handler(async ({ input }) => {
    const userId = await getAuthenticatedUserId();
    const cacheKey = `expand_${getCacheKey(input.targetNodeLabel)}`;
    let expansionResult: any = null;

    // Check cache first
    try {
      const { data: cacheData, error } = await supabaseAdmin
        .from('concept_cache')
        .select('generated_graph')
        .eq('concept_key', cacheKey)
        .maybeSingle();
      
      if (!error && cacheData) {
        expansionResult = cacheData.generated_graph;
      }
    } catch (e) {
      console.warn(e);
    }

    if (!expansionResult) {
      const systemInstruction = `You are a museum archivist. Expand the knowledge graph from the concept: "${input.targetNodeLabel}".
Generate exactly 3 to 5 new conceptual satellite nodes digging deeper into this topic.
Connect them back to the parent target concept.
You must avoid generating concepts similar to these existing ones: [${input.existingNodeLabels.join(', ')}].`;

      const responseSchema = {
        type: "OBJECT",
        properties: {
          newNodes: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                label: { type: "STRING" },
                type: { type: "STRING", enum: ["Concept", "Person", "Event", "Technology", "System", "Artifact", "Question"] },
                description: { type: "STRING" },
                domain: { type: "STRING", enum: ["Technology", "History", "Science", "Culture"] }
              },
              required: ["id", "label", "type", "description", "domain"]
            }
          },
          newEdges: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                source: { type: "STRING" },
                target: { type: "STRING" },
                connection_type: { type: "STRING", enum: ["Emerged From", "Enabled", "Influenced", "Contrasts With", "Mirrors", "Inspired"] },
                description: { type: "STRING" }
              },
              required: ["source", "target", "connection_type", "description"]
            }
          }
        },
        required: ["newNodes", "newEdges"]
      };

      const expansionData = await callGemini({
        model: 'gemini-2.5-flash',
        systemInstruction,
        prompt: `Generate satellites and edge connections expanding: "${input.targetNodeLabel}"`,
        responseSchema
      });

      expansionResult = GraphExpansionOutputSchema.parse(expansionData);

      // Save cache asynchronously
      supabaseAdmin
        .from('concept_cache')
        .insert({ concept_key: cacheKey, generated_graph: expansionResult })
        .then(({ error }) => {
          if (error) console.error('Failed to cache expansion graph:', error.message);
        });
    }

    // Persist session update in Database (Update trail history and depth)
    if (input.sessionId) {
      const nextStep = {
        stepNumber: input.trailSteps.length + 1,
        nodeLabel: input.targetNodeLabel,
        depth: input.trailSteps[input.trailSteps.length - 1]?.depth + 1 || 1
      };
      
      const updatedTrail = [...input.trailSteps, nextStep];

      supabaseAdmin
        .from('exploration_sessions')
        .update({
          trail_history: updatedTrail,
          current_depth: nextStep.depth
        })
        .eq('id', input.sessionId)
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) console.error('Failed to update session progress:', error.message);
        });
    }

    return expansionResult;
  });
