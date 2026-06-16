import React, { useState, useEffect, useTransition } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { SectionHeader } from '../components/shared/SectionHeader';
import { EmptyState } from '../components/shared/EmptyState';
import { FlowHint } from '../components/shared/FlowHint';
import { getConnectionsFn } from '../server/functions/connections';
import { useAuth } from '../hooks/useAuth';

interface SpecimenRef {
  id: string;
  title: string;
  summary: string;
  origin_value: string;
}

interface UnexpectedConnection {
  id: string;
  bridgeTitle: string;
  bridgeExplanation: string;
  similarityScore: number;
  uniquenessScore: number;
  createdAt: string;
  specimenA: SpecimenRef;
  specimenB: SpecimenRef;
}

export const Route = createFileRoute('/connections')({
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { user, loading: authLoading, login } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [connections, setConnections] = useState<UnexpectedConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<UnexpectedConnection | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    if (!user) return;
    startTransition(async () => {
      try {
        const result = await getConnectionsFn();
        if (result.connections && result.connections.length > 0) {
          setConnections(result.connections);
          setSelectedConnection(result.connections[0]);
          setStatus('ready');
        } else {
          setConnections([]);
          setStatus('empty');
        }
      } catch (err) {
        console.error('Failed to load connections:', err);
        setStatus('error');
      }
    });
  }, [user]);

  if (authLoading) {
    return (
      <div className="space-y-8">
        <SectionHeader
          label="03 · Connections Engine"
          title="Unearth latent, unexpected crossings."
          italicTitleWord="crossings"
          subtitle="AI-synthesized conceptual bridges"
          description="The connections engine runs vector similarity matches across archived cabinet specimens, prompting Gemini to discover unexpected conceptual crossovers."
        />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-pulse">
          {/* Left timeline placeholder */}
          <div className="col-span-1 md:col-span-4 border border-ink/10 bg-paper-deep/30 p-5 rounded-sharp space-y-4">
            <div className="h-3 w-1/3 bg-ink/10 rounded-sm" />
            <div className="space-y-2">
              <div className="h-5 w-full bg-ink/10 rounded-sm" />
              <div className="h-5 w-5/6 bg-ink/10 rounded-sm" />
              <div className="h-5 w-4/5 bg-ink/10 rounded-sm" />
            </div>
          </div>
          {/* Main detail placeholder */}
          <div className="col-span-1 md:col-span-8 border border-ink/10 p-6 bg-paper-deep/15 rounded-sharp space-y-6">
            <div className="h-8 w-1/2 bg-ink/15 rounded-sm" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-28 bg-ink/10 rounded-sm" />
              <div className="h-28 bg-ink/10 rounded-sm" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-ink/10 rounded-sm" />
              <div className="h-3.5 w-full bg-ink/10 rounded-sm" />
              <div className="h-3.5 w-5/6 bg-ink/10 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <SectionHeader
          label="03 · Connections Engine"
          title="Unearth latent, unexpected crossings."
          italicTitleWord="crossings"
          subtitle="AI-synthesized conceptual bridges"
          description="The connections engine runs vector similarity matches across archived cabinet specimens, prompting Gemini to discover unexpected conceptual crossovers."
        />
        <EmptyState
          title="Identification Required"
          message="Access to the connections engine is restricted. Please identify yourself to explore unexpected intersections between specimens."
          actionLabel="Identify via Google"
          onAction={login}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        label="03 · Connections Engine"
        title="Unearth latent, unexpected crossings."
        italicTitleWord="crossings"
        subtitle="AI-synthesized conceptual bridges"
        description="The connections engine runs vector similarity matches across archived cabinet specimens, prompting Gemini to discover unexpected conceptual crossovers."
      />

      {status === 'loading' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-pulse">
          {/* Left timeline placeholder */}
          <div className="col-span-1 md:col-span-4 border border-ink/10 bg-paper-deep/30 p-5 rounded-sharp space-y-4">
            <div className="h-3 w-1/3 bg-ink/10 rounded-sm" />
            <div className="space-y-2">
              <div className="h-5 w-full bg-ink/10 rounded-sm" />
              <div className="h-5 w-5/6 bg-ink/10 rounded-sm" />
              <div className="h-5 w-4/5 bg-ink/10 rounded-sm" />
            </div>
          </div>
          {/* Main detail placeholder */}
          <div className="col-span-1 md:col-span-8 border border-ink/10 p-6 bg-paper-deep/15 rounded-sharp space-y-6">
            <div className="h-8 w-1/2 bg-ink/15 rounded-sm" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-28 bg-ink/10 rounded-sm" />
              <div className="h-28 bg-ink/10 rounded-sm" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-ink/10 rounded-sm" />
              <div className="h-3.5 w-full bg-ink/10 rounded-sm" />
              <div className="h-3.5 w-5/6 bg-ink/10 rounded-sm" />
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          title="Engine Failure"
          message="Could not read unexpected connections from Supabase. Ensure your database migrations are fully configured."
        />
      )}

      {status === 'empty' && (
        <EmptyState
          title="Bridges Untravelled"
          message="The connections engine has not cataloged any unexpected intersections. Save conceptual specimens inside the Explore registry to automatically trigger crossover matching."
        />
      )}

      {status === 'ready' && selectedConnection && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Connection Timeline */}
          <aside className="col-span-1 md:col-span-4 border border-ink/10 bg-paper-deep/30 p-5 rounded-sharp space-y-6">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-moss block mb-2">
                Connection Timeline
              </span>
              <p className="font-sans text-[11px] text-ink-soft/60 mb-4">
                Select a registered bridge to review details:
              </p>
              
              <ul className="space-y-2 border-l border-ink/10 pl-2.5 ml-1.5">
                {connections.map((conn) => {
                  const isSelected = selectedConnection.id === conn.id;
                  return (
                    <li key={conn.id} className="relative">
                      <span className={`absolute -left-[14px] top-2 size-2 rounded-full border border-paper ${
                        isSelected ? 'bg-maroon scale-110' : 'bg-ink/30'
                      }`} />
                      <button
                        onClick={() => setSelectedConnection(conn)}
                        className={`font-display text-[15px] italic text-left block w-full hover:text-maroon transition-colors ${
                          isSelected ? 'text-maroon' : 'text-ink-soft/75'
                        }`}
                      >
                        {conn.specimenA.title} ↔ {conn.specimenB.title}
                      </button>
                      <span className="font-mono text-[8px] text-ink-soft/40 block mt-0.5">
                        Similarity: {conn.similarityScore}% · Unique: {conn.uniquenessScore}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* MAIN COLUMN: Active Bridge Explanation */}
          <main className="col-span-1 md:col-span-8 space-y-8">
            <FlowHint label="Connections Synthesis" hint="Every bridge connection represents a non-obvious intellectual crossing discovered by analyzing vector space distributions." />
            
            {/* Split cards display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Specimen A Card */}
              <div className="border border-ink/15 bg-paper-deep p-4 rounded-sharp border-l-2 border-burgundy">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft/50">Specimen Alpha</span>
                <h4 className="font-display text-lg text-ink mt-1 italic">{selectedConnection.specimenA.title}</h4>
                <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed mt-2 line-clamp-3">
                  {selectedConnection.specimenA.summary}
                </p>
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-clay block mt-3">
                  Origin: {selectedConnection.specimenA.origin_value}
                </span>
              </div>

              {/* Specimen B Card */}
              <div className="border border-ink/15 bg-paper-deep p-4 rounded-sharp border-l-2 border-navy">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft/50">Specimen Beta</span>
                <h4 className="font-display text-lg text-ink mt-1 italic">{selectedConnection.specimenB.title}</h4>
                <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed mt-2 line-clamp-3">
                  {selectedConnection.specimenB.summary}
                </p>
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-clay block mt-3">
                  Origin: {selectedConnection.specimenB.origin_value}
                </span>
              </div>
            </div>

            {/* The Bridge Explanation Narrative Block */}
            <article className="border border-ink/15 bg-paper p-6 md:p-8 rounded-sharp relative shadow-offset">
              <span className="absolute -bottom-1 -right-1 size-2 bg-maroon" />
              
              <div className="flex flex-col md:flex-row justify-between items-baseline gap-2 border-b border-ink/10 pb-4 mb-6">
                <div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-moss">Philosophical Bridge</span>
                  <h3 className="font-display text-3xl italic text-ink mt-1">
                    {selectedConnection.bridgeTitle}
                  </h3>
                </div>
                <div className="flex gap-4 font-mono text-[9px] uppercase tracking-[0.16em] text-clay">
                  <span>Similarity: <strong className="text-ink">{selectedConnection.similarityScore}%</strong></span>
                  <span>Uniqueness: <strong className="text-ink">{selectedConnection.uniquenessScore}%</strong></span>
                </div>
              </div>

              <div className="space-y-4 font-sans text-[14.5px] leading-relaxed text-ink-soft">
                {/* Render the 1920s naturalist explanation Markdown details */}
                {selectedConnection.bridgeExplanation.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </article>
          </main>

        </div>
      )}
    </div>
  );
}
