import { createServerFn } from '@tanstack/start';
import { supabaseAdmin } from '../../lib/supabase';
import { generateEmbedding } from '../../lib/gemini';
import { discoverUnexpectedBridges } from './connections';
import { getAuthenticatedUserId } from './auth';

interface SaveNodePayload {
  id: string;
  label: string;
  type: string;
  description: string;
  domain: string;
}

interface SaveEdgePayload {
  source: string;
  target: string;
  connection_type: string;
  description: string;
}

interface SaveSpecimenPayload {
  title: string;
  summary: string;
  originSource: 'topic' | 'url';
  originValue: string;
  nodes: SaveNodePayload[];
  edges: SaveEdgePayload[];
  domainDistribution: Record<string, number>;
  rarityScore: number;
  complexityScore: number;
  trailSteps: Array<{
    stepNumber: number;
    nodeLabel: string;
    depth: number;
  }>;
}

// 1. SAVE SPECIMEN (BOUND TO AUTHENTICATED USER)
export const saveSpecimenFn = createServerFn({ method: 'POST' })
  .validator((input: SaveSpecimenPayload) => input)
  .handler(async ({ input }) => {
    const userId = await getAuthenticatedUserId();

    const embeddingText = `Specimen Title: ${input.title}
Origin: ${input.originValue} (${input.originSource})
Summary: ${input.summary}
Domains: ${Object.entries(input.domainDistribution).map(([k, v]) => `${k}:${(v * 100).toFixed(0)}%`).join(', ')}
Nodes: ${input.nodes.map(n => n.label).join(', ')}`;

    console.log(`Generating embedding for specimen: "${input.title}"`);
    const embedding = await generateEmbedding(embeddingText);

    let specimenId: string | null = null;
    try {
      const { data: specimen, error: specErr } = await supabaseAdmin
        .from('specimens')
        .insert({
          user_id: userId,
          title: input.title,
          summary: input.summary,
          embedding: embedding,
          origin_source: input.originSource,
          origin_value: input.originValue,
          rarity_score: input.rarityScore,
          complexity_score: input.complexityScore,
          domain_distribution: input.domainDistribution,
          max_depth: input.trailSteps[input.trailSteps.length - 1]?.depth || 0,
          is_public: false
        })
        .select('id')
        .single();

      if (specErr || !specimen) {
        throw new Error(`Failed to save specimen header: ${specErr?.message}`);
      }

      specimenId = specimen.id;

      // Insert Nodes
      const nodeMapping = new Map<string, string>();
      const nodesPayload = input.nodes.map(n => ({
        specimen_id: specimenId,
        label: n.label,
        node_type: n.type,
        description: n.description,
        domain: n.domain
      }));

      const { data: insertedNodes, error: nodesErr } = await supabaseAdmin
        .from('nodes')
        .insert(nodesPayload)
        .select('id, label');

      if (nodesErr || !insertedNodes) {
        throw new Error(`Failed to save specimen nodes: ${nodesErr?.message}`);
      }

      input.nodes.forEach(n => {
        const match = insertedNodes.find(dbNode => dbNode.label === n.label);
        if (match) {
          nodeMapping.set(n.id, match.id);
        }
      });

      // Insert Edges
      const edgesPayload = input.edges.map(e => {
        const sourceUuid = nodeMapping.get(e.source);
        const targetUuid = nodeMapping.get(e.target);
        
        if (!sourceUuid || !targetUuid) {
          throw new Error(`Edge resolution failed. Missing node: ${e.source} or ${e.target}`);
        }

        return {
          specimen_id: specimenId,
          source_node_id: sourceUuid,
          target_node_id: targetUuid,
          connection_type: e.connection_type,
          description: e.description
        };
      });

      const { error: edgesErr } = await supabaseAdmin.from('edges').insert(edgesPayload);
      if (edgesErr) {
        throw new Error(`Failed to save specimen edges: ${edgesErr.message}`);
      }

      // Insert Discovery Trail
      const { error: trailErr } = await supabaseAdmin
        .from('discovery_trails')
        .insert({
          user_id: userId,
          specimen_id: specimenId,
          steps: input.trailSteps,
          total_steps: input.trailSteps.length,
          max_depth: input.trailSteps[input.trailSteps.length - 1]?.depth || 0
        });

      if (trailErr) {
        throw new Error(`Failed to save specimen discovery trail: ${trailErr.message}`);
      }

      // Trigger Unexpected Connection Matching and await it to prevent truncation in serverless environment
      try {
        await discoverUnexpectedBridges(specimenId, embedding, userId);
      } catch (err) {
        console.error('Unexpected connections matching failed:', err);
      }

      return {
        success: true,
        specimenId
      };
    } catch (err) {
      if (specimenId) {
        console.warn(`Atomic transaction fallback: cleaning up incomplete specimen record ${specimenId}.`);
        await supabaseAdmin
          .from('specimens')
          .delete()
          .eq('id', specimenId)
          .eq('user_id', userId);
      }
      throw err;
    }
  });

// 2. GET CABINET SPECIMENS (FILTERED BY LOGGED-IN USER)
export const getCabinetFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const userId = await getAuthenticatedUserId();

    const { data, error } = await supabaseAdmin
      .from('specimens')
      .select('id, title, summary, origin_source, origin_value, rarity_score, complexity_score, domain_distribution, max_depth, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to query Cabinet:', error.message);
      return { specimens: [] };
    }

    return { specimens: data || [] };
  });

// 3. DELETE SPECIMEN (SECURE OWNERSHIP CHECK)
export const deleteSpecimenFn = createServerFn({ method: 'POST' })
  .validator((input: { specimenId: string }) => input)
  .handler(async ({ input }) => {
    const userId = await getAuthenticatedUserId();

    const { error } = await supabaseAdmin
      .from('specimens')
      .delete()
      .eq('id', input.specimenId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete specimen: ${error.message}`);
    }

    return { success: true };
  });

// 4. GET SPECIMEN DETAILS (SECURE OWNERSHIP CHECK)
export const getSpecimenDetailsFn = createServerFn({ method: 'POST' })
  .validator((input: { specimenId: string }) => input)
  .handler(async ({ input }) => {
    const userId = await getAuthenticatedUserId();

    const { data: specimen, error: specErr } = await supabaseAdmin
      .from('specimens')
      .select('id, title, summary, origin_value, origin_source, rarity_score, complexity_score, domain_distribution')
      .eq('id', input.specimenId)
      .eq('user_id', userId)
      .single();

    if (specErr || !specimen) {
      throw new Error(`Failed to load specimen details: ${specErr?.message}`);
    }

    const { data: dbNodes } = await supabaseAdmin
      .from('nodes')
      .select('id, label, node_type, description, domain')
      .eq('specimen_id', input.specimenId);

    const nodes = (dbNodes || []).map(n => ({
      id: n.id,
      label: n.label,
      type: n.node_type as any,
      description: n.description,
      domain: n.domain as any
    }));

    const { data: dbEdges } = await supabaseAdmin
      .from('edges')
      .select('source_node_id, target_node_id, connection_type, description')
      .eq('specimen_id', input.specimenId);

    const edges = (dbEdges || []).map(e => ({
      source: e.source_node_id,
      target: e.target_node_id,
      connection_type: e.connection_type as any,
      description: e.description
    }));

    const { data: trail } = await supabaseAdmin
      .from('discovery_trails')
      .select('steps')
      .eq('specimen_id', input.specimenId)
      .maybeSingle();

    return {
      specimen,
      nodes,
      edges,
      trailSteps: trail?.steps || []
    };
  });
