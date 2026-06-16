import React, { useState, useTransition } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SectionHeader } from '../components/shared/SectionHeader';
import { FlowHint } from '../components/shared/FlowHint';
import { EmptyState } from '../components/shared/EmptyState';
import { GraphCanvasSkeleton } from '../components/shared/Skeletons';
import { KnowledgeGraph } from '../components/graph/KnowledgeGraph';
import { generateGraphFn, digDeeperFn } from '../server/functions/analyze';
import { saveSpecimenFn } from '../server/functions/db';
import { useAuth } from '../hooks/useAuth';

interface TrailStep {
  stepNumber: number;
  nodeLabel: string;
  depth: number;
}

interface Node {
  id: string;
  label: string;
  type: string;
  description: string;
  domain: 'Technology' | 'History' | 'Science' | 'Culture';
}

interface Edge {
  source: string;
  target: string;
  connection_type: string;
  description: string;
}

export const Route = createFileRoute('/')({
  component: ExplorePage,
});

function ExplorePage() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate({ from: '/' });
  const [isPending, startTransition] = useTransition();

  // Component States
  const [sourceInput, setSourceInput] = useState('');
  const [sourceType, setSourceType] = useState<'topic' | 'url'>('topic');
  const [exploreStatus, setExploreStatus] = useState<'idle' | 'analyzing' | 'ready' | 'saving' | 'saved' | 'error'>('idle');
  const [isExpanding, setIsExpanding] = useState(false); // Refinement: Local expansion state to avoid canvas resets
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loaded Graph Session data
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [suggestedDomain, setSuggestedDomain] = useState<'Technology' | 'History' | 'Science' | 'Culture'>('Culture');
  const [tags, setTags] = useState<string[]>([]);
  const [complexity, setComplexity] = useState(0);
  const [rarity, setRarity] = useState(0);
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [trail, setTrail] = useState<TrailStep[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Domain Color classes mapping
  const getDomainColor = (domain: string) => {
    switch (domain) {
      case 'Technology': return 'bg-moss border-moss text-paper';
      case 'History': return 'bg-burgundy border-burgundy text-paper';
      case 'Science': return 'bg-navy border-navy text-paper';
      case 'Culture': return 'bg-clay border-clay text-paper';
      default: return 'bg-ink-soft border-ink-soft text-paper';
    }
  };

  const getDomainText = (domain: string) => {
    switch (domain) {
      case 'Technology': return 'text-moss';
      case 'History': return 'text-burgundy';
      case 'Science': return 'text-navy';
      case 'Culture': return 'text-clay';
      default: return 'text-ink-soft';
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-8">
        <SectionHeader
          label="01 · Seed Registry"
          title="Where does an idea actually lead?"
          italicTitleWord="actually"
          subtitle="Map ideas and unearth unexpected branches"
        />
        <div className="max-w-xl mx-auto space-y-6">
          <GraphCanvasSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <SectionHeader
          label="01 · Seed Registry"
          title="Where does an idea actually lead?"
          italicTitleWord="actually"
          subtitle="Map ideas and unearth unexpected branches"
        />
        <EmptyState
          title="Identification Required"
          message="Welcome to Curio. Please identify yourself to begin seeding concept graphs and mapping discovery trails."
          actionLabel="Identify via Google"
          onAction={login}
        />
      </div>
    );
  }

  // 1. SUBMIT SEED FORM ACTION
  const handleSeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceInput.trim()) return;

    setExploreStatus('analyzing');
    setErrorMsg(null);
    setSelectedNode(null);

    startTransition(async () => {
      try {
        const result = await generateGraphFn({
          data: {
            source: sourceInput,
            type: sourceType
          }
        });

        setTitle(result.title);
        setSummary(result.summary);
        setSuggestedDomain(result.suggestedDomain);
        setTags(result.tags);
        setComplexity(result.complexityEstimate);
        setRarity(result.rarityScore);
        setNodes(result.nodes);
        setEdges(result.edges);
        setSessionId(result.sessionId);
        
        const initialTrail = [{ stepNumber: 1, nodeLabel: result.title, depth: 0 }];
        setTrail(initialTrail);
        setExploreStatus('ready');

        // Sync Rabbit-Hole Depth dots inside Root Nav via routing search params
        navigate({ search: { depth: 0 } });
      } catch (err: any) {
        console.error('Seeding process failed:', err);
        setExploreStatus('error');
        setErrorMsg(err.message || 'An error occurred during conceptual extraction.');
      }
    });
  };

  // 2. DIG DEEPER EXPANSION ACTIONS
  const handleDigDeeper = async (node: Node) => {
    if (nodes.length >= 60 || edges.length >= 80) {
      alert("This rabbit hole has exceeded maximum archival complexity (60 nodes / 80 edges) to keep rendering precise.");
      return;
    }

    setIsExpanding(true); // Refinement: Triggers localized canvas alert overlay without resetting graph coordinates

    startTransition(async () => {
      try {
        const result = await digDeeperFn({
          data: {
            sessionId,
            targetNodeId: node.id,
            targetNodeLabel: node.label,
            existingNodeLabels: nodes.map(n => n.label),
            trailSteps: trail
          }
        });

        // Merge expansion outputs, filtering duplicates
        const existingNodeIds = new Set(nodes.map(n => n.id));
        const filteredNewNodes = result.newNodes.filter((n: Node) => !existingNodeIds.has(n.id));
        
        const updatedNodes = [...nodes, ...filteredNewNodes];
        
        // Ensure all edges connect nodes that actually exist in the updated graph
        const updatedNodeIds = new Set(updatedNodes.map(n => n.id));
        const filteredNewEdges = result.newEdges.filter(
          (e: Edge) => updatedNodeIds.has(e.source) && updatedNodeIds.has(e.target)
        );
        const updatedEdges = [...edges, ...filteredNewEdges];
        
        setNodes(updatedNodes);
        setEdges(updatedEdges);

        const currentDepth = trail[trail.length - 1]?.depth + 1 || 1;
        const updatedTrail = [
          ...trail,
          {
            stepNumber: trail.length + 1,
            nodeLabel: node.label,
            depth: currentDepth
          }
        ];
        
        setTrail(updatedTrail);
        setSelectedNode(null);

        // Sync depth to Root Nav dots
        navigate({ search: { depth: Math.min(currentDepth, 9) } });
      } catch (err: any) {
        console.error('Dig deeper expansion failed:', err);
        alert(err.message || 'The concept could not be expanded.');
      } finally {
        setIsExpanding(false); // Stop local loader
      }
    });
  };

  // 3. PERSIST SPECIMEN TO CABINET VAULT
  const handleSaveSpecimen = async () => {
    setExploreStatus('saving');

    try {
      const payload = {
        title,
        summary,
        originSource: sourceType,
        originValue: sourceInput,
        nodes: nodes.map(n => ({
          id: n.id,
          label: n.label,
          type: n.type,
          description: n.description,
          domain: n.domain
        })),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target,
          connection_type: e.connection_type,
          description: e.description
        })),
        domainDistribution: calculateDomainDistribution(),
        rarityScore: rarity,
        complexityScore: complexity,
        trailSteps: trail
      };

      await saveSpecimenFn({ data: payload });
      setExploreStatus('saved');
    } catch (err) {
      console.error('Persisting specimen failed:', err);
      setExploreStatus('ready');
      alert('Failed to register specimen inside cabinet.');
    }
  };

  // Helper: Computes relative domain layout weights
  const calculateDomainDistribution = () => {
    const distribution: Record<string, number> = {
      Technology: 0,
      History: 0,
      Science: 0,
      Culture: 0
    };
    nodes.forEach(n => {
      if (distribution[n.domain] !== undefined) {
        distribution[n.domain] += 1;
      }
    });
    const total = nodes.length || 1;
    Object.keys(distribution).forEach(key => {
      distribution[key] = parseFloat((distribution[key] / total).toFixed(2));
    });
    return distribution;
  };

  // RESET CANVAS SESSIONS
  const handleReset = () => {
    setSourceInput('');
    setExploreStatus('idle');
    setIsExpanding(false);
    setNodes([]);
    setEdges([]);
    setTrail([]);
    setSelectedNode(null);
    navigate({ search: { depth: 0 } });
  };

  const domainData = calculateDomainDistribution();

  return (
    <div className="space-y-8">
      {/* Dynamic Header */}
      <SectionHeader
        label={exploreStatus === 'idle' ? '01 · Seed Registry' : '02 · active exploration'}
        title={exploreStatus === 'idle' ? 'Where does an idea actually lead?' : title}
        italicTitleWord={exploreStatus === 'idle' ? 'actually' : undefined}
        subtitle={exploreStatus === 'idle' ? 'Map ideas and unearth unexpected branches' : `Seed Origin: ${sourceInput}`}
      />

      {exploreStatus === 'idle' && (
        <div className="max-w-xl mx-auto space-y-6">
          <FlowHint hint="Register a seeding concept (e.g. 'Photosynthesis') or insert a clean URL to begin plotting connections." />
          
          {/* Source Entry Form */}
          <form onSubmit={handleSeedSubmit} className="border border-ink/10 bg-paper-deep/30 p-8 rounded-sharp space-y-6">
            <div className="flex items-center gap-4 border-b border-ink/10 pb-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-soft/60">Source type:</span>
              <button
                type="button"
                onClick={() => setSourceType('topic')}
                className={`font-mono text-[9px] uppercase tracking-[0.16em] px-2 py-0.5 border rounded-sm transition-all duration-300 ${
                  sourceType === 'topic' ? 'bg-ink text-paper border-ink' : 'border-ink/10 text-ink-soft'
                }`}
              >
                Topic
              </button>
              <button
                type="button"
                onClick={() => setSourceType('url')}
                className={`font-mono text-[9px] uppercase tracking-[0.16em] px-2 py-0.5 border rounded-sm transition-all duration-300 ${
                  sourceType === 'url' ? 'bg-ink text-paper border-ink' : 'border-ink/10 text-ink-soft'
                }`}
              >
                URL Link
              </button>
            </div>

            <label className="block">
              <div className="flex items-center border-b border-ink/30 focus-within:border-ink transition-all pb-2 gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-moss">Source</span>
                <input
                  type="text"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder={sourceType === 'topic' ? "Try: coffee, sleep, socrates..." : "https://example.com/natural-science"}
                  className="bg-transparent border-none outline-none w-full text-sm font-sans placeholder:text-ink-soft/40 placeholder:italic text-ink"
                />
                <button 
                  type="submit" 
                  disabled={!sourceInput.trim()}
                  className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft hover:text-ink disabled:opacity-30 transition-colors"
                >
                  Enter ↵
                </button>
              </div>
            </label>
          </form>
        </div>
      )}

      {/* LOADING CANVAS SKELETON */}
      {exploreStatus === 'analyzing' && <GraphCanvasSkeleton />}

      {/* ERROR HANDLER EMPTY STATE */}
      {exploreStatus === 'error' && (
        <EmptyState
          title="Archive Extraction Failed"
          message={errorMsg || 'Gemini encountered a validation failure while cataloging this seed.'}
          actionLabel="Return to Registry"
          onAction={handleReset}
        />
      )}

      {/* SAVED SUCCESS STATE */}
      {exploreStatus === 'saved' && (
        <div className="max-w-md mx-auto text-center border border-ink/10 bg-paper-deep p-8 rounded-sharp shadow-offset space-y-6">
          <span className="text-maroon text-2xl">✓</span>
          <h3 className="font-display text-2xl italic text-ink">Specimen Vaulted</h3>
          <p className="font-sans text-sm text-ink-soft leading-relaxed">
            The intellectual coordinates for <strong className="font-serif italic">"{title}"</strong> have been securely registered inside your Cabinet.
          </p>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] bg-ink/5 py-1.5 rounded-sm text-clay">
            Rarity Index: {rarity}% · Complex: {complexity}%
          </div>
          <button
            onClick={handleReset}
            className="font-mono text-[10px] uppercase tracking-[0.22em] bg-ink text-paper px-4 py-2 hover:bg-maroon transition-all duration-300 rounded-sharp"
          >
            Register New Seed
          </button>
        </div>
      )}

      {/* GRAPH ACTIVE WORKSPACE */}
      {(exploreStatus === 'ready' || exploreStatus === 'saving') && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR: Discovery Trail */}
          <aside className="col-span-1 md:col-span-4 border border-ink/10 bg-paper-deep/30 p-5 rounded-sharp space-y-6">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-moss block mb-2">
                Discovery Trail
              </span>
              <ul className="space-y-3.5 border-l border-ink/10 pl-2.5 ml-1.5 py-1">
                {trail.map((step, idx) => (
                  <li key={idx} className="flex items-center gap-2 relative">
                    <span className="absolute -left-[14px] size-2 rounded-full border border-paper bg-ink" />
                    <span className="font-mono text-[9.5px] text-ink-soft/40">
                      {String(step.stepNumber).padStart(2, '0')}
                    </span>
                    <span className="font-display text-[15px] italic text-ink">
                      {step.nodeLabel}
                    </span>
                    <span className="font-mono text-[8px] text-moss ml-auto">
                      Depth {step.depth}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rule" />

            {/* Specimen catalog index labels */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-moss block mb-3">
                Curiosity DNA Distribution
              </span>
              <div className="space-y-2">
                {Object.entries(domainData).map(([dom, weight]) => (
                  <div key={dom} className="flex items-center justify-between text-xs">
                    <span className={`font-mono text-[9px] uppercase tracking-[0.16em] ${getDomainText(dom)}`}>
                      {dom}
                    </span>
                    <span className="font-mono text-[9px] text-ink-soft">
                      {(weight * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rule" />

            <div className="flex gap-2">
              <button
                onClick={handleSaveSpecimen}
                disabled={exploreStatus === 'saving'}
                className="flex-1 font-mono text-[10px] uppercase tracking-[0.2em] bg-ink text-paper py-2.5 rounded-sharp hover:bg-maroon transition-all duration-300 disabled:opacity-40 shadow-offset"
              >
                {exploreStatus === 'saving' ? 'Archiving...' : 'Archive in Cabinet'}
              </button>
              <button
                onClick={handleReset}
                className="font-mono text-[10px] uppercase tracking-[0.2em] border border-ink/20 py-2.5 px-3 rounded-sharp hover:bg-ink hover:text-paper transition-all duration-300"
              >
                Reset
              </button>
            </div>
          </aside>

          {/* MAIN GRAPH CANVAS AREA */}
          <main className="col-span-1 md:col-span-8 space-y-6 relative">
            {/* Refinement: Subtle inline loading indicator instead of canvas wipe */}
            {isExpanding && (
              <div className="absolute top-4 right-4 bg-paper/95 border border-ink/20 px-3 py-1.5 rounded-sharp font-mono text-[9px] uppercase tracking-[0.2em] flex items-center gap-2 z-20 shadow-sm animate-pulse">
                <span className="size-2 border border-dashed border-maroon animate-spin rounded-full" />
                <span className="text-maroon">Expanding path...</span>
              </div>
            )}

            <div className="border border-ink/15 bg-paper rounded-sharp p-1">
              <KnowledgeGraph
                seedNodeId={nodes[0]?.id || ''}
                nodes={nodes}
                edges={edges}
                onSelectNode={setSelectedNode}
                selectedNodeId={selectedNode?.id || null}
              />
            </div>

            {/* Selected Node Details Draw */}
            {selectedNode && (
              <div className="border border-ink/15 bg-paper-deep p-6 relative rounded-sharp shadow-[0_4px_20px_rgba(26,28,24,0.06)] animate-fade-in">
                <span className="absolute -bottom-1 -right-1 size-2 bg-maroon" />
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <span className={`font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm ${getDomainColor(selectedNode.domain)}`}>
                      {selectedNode.domain} · {selectedNode.type}
                    </span>
                    <h3 className="font-display text-2xl md:text-3xl text-ink font-normal mt-2">
                      {selectedNode.label}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="font-mono text-xs text-ink-soft/40 hover:text-ink"
                  >
                    ✕
                  </button>
                </div>
                
                <p className="font-sans text-[14px] leading-relaxed text-ink-soft mb-6">
                  {selectedNode.description}
                </p>

                <div className="flex justify-end gap-2 border-t border-t-ink/10 pt-4">
                  {selectedNode.id !== nodes[0]?.id && (
                    <button
                      onClick={() => handleDigDeeper(selectedNode)}
                      disabled={isExpanding}
                      className="font-mono text-[10px] uppercase tracking-[0.22em] bg-ink text-paper px-4 py-2 hover:bg-maroon transition-all duration-300 rounded-sharp disabled:opacity-50"
                    >
                      Dig Deeper ↵
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="font-mono text-[10px] uppercase tracking-[0.22em] border border-ink/20 px-3 py-2 hover:bg-ink hover:text-paper transition-all duration-300 rounded-sharp"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </main>

        </div>
      )}
    </div>
  );
}
