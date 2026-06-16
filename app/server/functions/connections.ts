import { createServerFn } from '@tanstack/start';
import { supabaseAdmin } from '../../lib/supabase';
import { callGemini } from '../../lib/gemini';
import { getAuthenticatedUserId } from './auth';

interface SpecimenRef {
  id: string;
  title: string;
  summary: string;
  origin_value: string;
}

interface ConnectionMatch {
  id: string;
  user_id: string;
  bridge_title: string;
  bridge_explanation: string;
  similarity_score: number;
  uniqueness_score: number;
  created_at: string;
  specimen_a: SpecimenRef;
  specimen_b: SpecimenRef;
}

// 1. GET SAVED UNEXPECTED CONNECTIONS WITH ACTUAL METRICS
export const getConnectionsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const userId = await getAuthenticatedUserId();

    const { data, error } = await supabaseAdmin
      .from('unexpected_connections')
      .select(`
        id,
        bridge_title,
        bridge_explanation,
        similarity_score,
        uniqueness_score, -- Select actual uniqueness score!
        created_at,
        specimen_a:specimens!unexpected_connections_specimen_a_id_fkey(id, title, summary, origin_value),
        specimen_b:specimens!unexpected_connections_specimen_b_id_fkey(id, title, summary, origin_value)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to query unexpected connections:', error.message);
      return { connections: [] };
    }

    // Parse and map to clean frontend payload
    const connections = (data || []).map((conn: any) => ({
      id: conn.id,
      bridgeTitle: conn.bridge_title,
      bridgeExplanation: conn.bridge_explanation,
      similarityScore: Math.round(conn.similarity_score * 100), // Fixed: Already similarity, no need to subtract from 1!
      createdAt: conn.created_at,
      specimenA: conn.specimen_a,
      specimenB: conn.specimen_b,
      uniquenessScore: conn.uniqueness_score // Return actual score!
    }));

    return { connections };
  });

// 2. DISCOVERY WORKER PIPELINE
export async function discoverUnexpectedBridges(specimenId: string, embedding: number[], userId: string) {
  try {

    // Query similar specimens using pgvector match_specimens RPC
    const { data: matches, error: matchErr } = await supabaseAdmin.rpc('match_specimens', {
      query_embedding: embedding,
      match_threshold: 0.55,
      match_count: 5,
      requesting_user_id: userId
    });

    if (matchErr || !matches) {
      console.warn('Vector matching RPC failed:', matchErr?.message);
      return;
    }

    const otherSpecimens = matches.filter((m: any) => m.id !== specimenId);
    console.log(`Found ${otherSpecimens.length} similarity candidates for specimen ID: ${specimenId}`);

    const { data: currentSpecimen } = await supabaseAdmin
      .from('specimens')
      .select('title, summary')
      .eq('id', specimenId)
      .single();

    if (!currentSpecimen) return;

    for (const match of otherSpecimens) {
      // Check if connection already exists in database before calling Gemini
      const [specimenA, specimenB] = specimenId < match.id 
        ? [specimenId, match.id] 
        : [match.id, specimenId];

      const { data: existingConn } = await supabaseAdmin
        .from('unexpected_connections')
        .select('id')
        .eq('specimen_a_id', specimenA)
        .eq('specimen_b_id', specimenB)
        .maybeSingle();

      if (existingConn) {
        console.log(`Bridge connection already exists between "${specimenId}" and "${match.id}". Skipping evaluation.`);
        continue;
      }

      // Step A: Evaluate Unexpectedness
      const systemInstruction = `You are a museum catalog analyzer.
You compare Specimen A and Specimen B. Evaluate if there is an unexpected, interdisciplinary connection linking them.
If they share obvious direct keywords, they are NOT unexpected.
Suggest a shared core concept that acts as a logical bridge. Rate their connection uniqueness from 1 to 100.`;

      const prompt = `Specimen A: "${currentSpecimen.title}" - Summary: "${currentSpecimen.summary}"
Specimen B: "${match.title}" - Summary: "${match.summary}"`;

      const responseSchema = {
        type: "OBJECT",
        properties: {
          isUnexpected: { type: "BOOLEAN" },
          uniquenessScore: { type: "INTEGER" },
          sharedCoreConcept: { type: "STRING" }
        },
        required: ["isUnexpected", "uniquenessScore", "sharedCoreConcept"]
      };

      console.log(`Evaluating connection between "${currentSpecimen.title}" and "${match.title}"`);
      const evaluation = await callGemini({
        model: 'gemini-2.5-flash',
        systemInstruction,
        prompt,
        responseSchema
      });

      if (evaluation.isUnexpected && evaluation.uniquenessScore > 65) {
        // Step B: Generate Bridge Explanation
        console.log(`Unexpected connection found! Generating narrative bridge for shared concept: "${evaluation.sharedCoreConcept}"`);
        
        const explanationInstruction = `You are an expert natural philosopher and archivist from the 1920s writing a field registry log.
Write a 2-paragraph narrative in an archival literary tone explaining the latent bridge linking Specimen A and Specimen B. 
Cite their shared concept: "${evaluation.sharedCoreConcept}". Use rich language. No modern tech buzzwords.
Return JSON with the bridgeTitle and explanationMarkdown property containing the written text.`;

        const explanationSchema = {
          type: "OBJECT",
          properties: {
            bridgeTitle: { type: "STRING" },
            explanationMarkdown: { type: "STRING" }
          },
          required: ["bridgeTitle", "explanationMarkdown"]
        };

        const bridge = await callGemini({
          model: 'gemini-2.5-flash',
          systemInstruction: explanationInstruction,
          prompt,
          responseSchema: explanationSchema
        });

        // Step C: Persist inside unexpected_connections table
        const [specimenA, specimenB] = specimenId < match.id 
          ? [specimenId, match.id] 
          : [match.id, specimenId];

        const { error: insertErr } = await supabaseAdmin
          .from('unexpected_connections')
          .insert({
            user_id: userId,
            specimen_a_id: specimenA,
            specimen_b_id: specimenB,
            bridge_title: bridge.bridgeTitle || `${currentSpecimen.title} ↔ ${match.title}`,
            bridge_explanation: bridge.explanationMarkdown,
            similarity_score: match.similarity, // Already similarity score from match_specimens
            uniqueness_score: evaluation.uniquenessScore // Persist actual uniqueness score!
          });

        if (insertErr) {
          if (insertErr.code === '23505') { 
            console.log('Bridge connection already logged between these specimens.');
          } else {
            console.error('Failed to log unexpected connection:', insertErr.message);
          }
        } else {
          console.log(`Bridge connection successfully stored: "${bridge.bridgeTitle}"`);
        }
      } else {
        console.log(`Connection between "${currentSpecimen.title}" and "${match.title}" dismissed (not unexpected).`);
      }
    }
  } catch (err) {
    console.error('Error during unexpected bridge discovery pipeline:', err);
  }
}
