import React, { useState, useEffect, useTransition } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { SectionHeader } from '../components/shared/SectionHeader';
import { EmptyState } from '../components/shared/EmptyState';
import { FlowHint } from '../components/shared/FlowHint';
import { SpecimenCardSkeleton } from '../components/shared/Skeletons';
import { KnowledgeGraph } from '../components/graph/KnowledgeGraph';
import { getCabinetFn, deleteSpecimenFn, getSpecimenDetailsFn } from '../server/functions/db';
import { useAuth } from '../hooks/useAuth';

interface Specimen {
  id: string;
  title: string;
  summary: string;
  origin_source: string;
  origin_value: string;
  rarity_score: number;
  complexity_score: number;
  domain_distribution: Record<string, number>;
  max_depth: number;
  created_at: string;
}

export const Route = createFileRoute('/cabinet')({
  component: CabinetPage,
});

function CabinetPage() {
  const { user, loading: authLoading, login } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  // Filtering & Sorting parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDomain, setActiveDomain] = useState<'All' | 'Technology' | 'History' | 'Science' | 'Culture'>('All');
  const [sortBy, setSortBy] = useState<'recency' | 'rarity' | 'depth'>('recency');

  // Specimen Detail Modal Viewer States
  const [activeSpecimenId, setActiveSpecimenId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // Load Cabinet Data
  const loadCabinet = () => {
    startTransition(async () => {
      try {
        const result = await getCabinetFn();
        if (result.specimens && result.specimens.length > 0) {
          setSpecimens(result.specimens);
          setStatus('ready');
        } else {
          setSpecimens([]);
          setStatus('empty');
        }
      } catch (err) {
        console.error('Cabinet retrieval failed:', err);
        setStatus('error');
      }
    });
  };

  useEffect(() => {
    if (user) {
      loadCabinet();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="space-y-8">
        <SectionHeader
          label="02 · The Specimen Cabinet"
          title="Browse your curated catalog."
          italicTitleWord="catalog"
          subtitle="Archived conceptual registries"
          description="Inspect registered topics, expand their node paths, or discard specimens no longer relevant to your investigations."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          <SpecimenCardSkeleton />
          <SpecimenCardSkeleton />
          <SpecimenCardSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <SectionHeader
          label="02 · The Specimen Cabinet"
          title="Browse your curated catalog."
          italicTitleWord="catalog"
          subtitle="Archived conceptual registries"
          description="Inspect registered topics, expand their node paths, or discard specimens no longer relevant to your investigations."
        />
        <EmptyState
          title="Identification Required"
          message="Access to the curiosity cabinet is restricted. Please identify yourself to browse your registered specimen archive."
          actionLabel="Identify via Google"
          onAction={login}
        />
      </div>
    );
  }

  // Handle Specimen Deletion
  const handleDeleteSpecimen = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to permanently discard this specimen from your Cabinet?')) return;

    try {
      await deleteSpecimenFn({ data: { specimenId: id } });
      setActiveSpecimenId(null);
      setDetailData(null);
      loadCabinet();
    } catch (err) {
      alert('Failed to discard specimen.');
    }
  };

  // Open Saved Specimen Details
  const handleOpenSpecimen = async (id: string) => {
    setActiveSpecimenId(id);
    setLoadingDetails(true);
    setSelectedNode(null);

    try {
      const details = await getSpecimenDetailsFn({ data: { specimenId: id } });
      setDetailData(details);
    } catch (err) {
      console.error(err);
      alert('Could not reload specimen data.');
      setActiveSpecimenId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Get primary domain indicator color
  const getDomainBorderColor = (distribution: Record<string, number>) => {
    const primary = Object.entries(distribution).reduce(
      (max, current) => (current[1] > max[1] ? current : max),
      ['Culture', 0]
    )[0];

    switch (primary) {
      case 'Technology': return 'border-moss';
      case 'History': return 'border-burgundy';
      case 'Science': return 'border-navy';
      case 'Culture': return 'border-clay';
      default: return 'border-ink/15';
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

  // Process sorting and filtering client-side
  const filteredSpecimens = specimens
    .filter(spec => {
      const matchesSearch = spec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            spec.summary.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeDomain === 'All') return matchesSearch;
      return matchesSearch && spec.domain_distribution[activeDomain] > 0;
    })
    .sort((a, b) => {
      if (sortBy === 'recency') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'rarity') {
        return b.rarity_score - a.rarity_score;
      }
      if (sortBy === 'depth') {
        return b.max_depth - a.max_depth;
      }
      return 0;
    });

  return (
    <div className="space-y-8 relative">
      <SectionHeader
        label="02 · The Specimen Cabinet"
        title="Browse your curated catalog."
        italicTitleWord="catalog"
        subtitle="Archived conceptual registries"
        description="Inspect registered topics, expand their node paths, or discard specimens no longer relevant to your investigations."
      />

      {status === 'loading' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SpecimenCardSkeleton />
          <SpecimenCardSkeleton />
          <SpecimenCardSkeleton />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          title="Archive Inaccessible"
          message="Failed to load your cabinet. Ensure database connections are online."
        />
      )}

      {status === 'empty' && (
        <EmptyState
          title="Cabinet Vacant"
          message="No conceptual specimens have been registered. Visit the Explore Workspace to seed a new thread."
        />
      )}

      {status === 'ready' && (
        <div className="space-y-8">
          
          {/* SEARCH, SORTING, AND FILTERING BAR */}
          <div className="border border-ink/10 bg-paper-deep/30 p-5 rounded-sharp flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
            {/* Left: Domain filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-soft/50 mr-2">Filter:</span>
              {(['All', 'Technology', 'History', 'Science', 'Culture'] as const).map(domain => (
                <button
                  key={domain}
                  onClick={() => setActiveDomain(domain)}
                  className={`font-mono text-[9px] uppercase tracking-[0.16em] px-2 py-0.5 border rounded-sm transition-all duration-200 ${
                    activeDomain === domain ? 'bg-ink text-paper border-ink shadow-sm' : 'border-ink/10 text-ink-soft hover:border-ink/20'
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>

            {/* Middle: Sort buttons */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-soft/50 mr-2">Sort:</span>
              {(['recency', 'rarity', 'depth'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`font-mono text-[9px] uppercase tracking-[0.16em] px-2 py-0.5 border rounded-sm transition-all duration-200 ${
                    sortBy === option ? 'bg-ink text-paper border-ink shadow-sm' : 'border-ink/10 text-ink-soft hover:border-ink/20'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* Right: Inline Search Input */}
            <div className="w-full md:w-64 border-b border-ink/20 focus-within:border-ink pb-1 flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archive..."
                className="bg-transparent border-none outline-none w-full text-xs font-mono placeholder:text-ink-soft/40 placeholder:italic text-ink"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="font-mono text-[9px] text-ink-soft/40 ml-1">✕</button>
              )}
            </div>

          </div>

          {/* SPECIMENS INDEX GRID */}
          {filteredSpecimens.length === 0 ? (
            <EmptyState
              title="No Specimens Match"
              message="Adjust search criteria or filter tags to unearth saved specimens."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpecimens.map(spec => (
                <article
                  key={spec.id}
                  onClick={() => handleOpenSpecimen(spec.id)}
                  className="border border-ink/15 bg-paper-deep/60 p-5 rounded-sharp cursor-pointer hover:border-ink/40 hover:bg-paper-deep/80 transition-all duration-300 relative group flex flex-col justify-between h-[230px]"
                >
                  {/* Left Indicator Strip */}
                  <div className={`border-l-2 ${getDomainBorderColor(spec.domain_distribution)} pl-3 flex-1 flex flex-col justify-between`}>
                    <div>
                      {/* Top Date & Rarity */}
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-ink-soft/40">
                          {new Date(spec.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="font-mono text-[8.5px] text-maroon uppercase tracking-[0.18em]">
                          Rarity: {spec.rarity_score}%
                        </span>
                      </div>
                      
                      {/* Title */}
                      <h4 className="font-display text-xl text-ink leading-tight clamp-2 group-hover:text-maroon transition-colors">
                        {spec.title}
                      </h4>
                      
                      {/* Summary */}
                      <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed mt-2 line-clamp-3">
                        {spec.summary}
                      </p>
                    </div>

                    {/* Bottom Metadata Indicators */}
                    <div className="mt-3 flex justify-between items-center border-t border-ink/5 pt-2 font-mono text-[8.5px] text-ink-soft/50 uppercase tracking-[0.16em]">
                      <span>Max Depth: {spec.max_depth}</span>
                      <span>Complex: {spec.complexity_score}%</span>
                    </div>
                  </div>

                  {/* Absolute Delete Action (visible on hover) */}
                  <button
                    onClick={(e) => handleDeleteSpecimen(spec.id, e)}
                    className="absolute top-2 right-2 size-5 bg-paper rounded-full border border-ink/10 flex items-center justify-center font-mono text-[9px] text-ink-soft/40 hover:bg-maroon hover:text-paper hover:border-maroon opacity-0 group-hover:opacity-100 transition-all duration-300"
                    title="Discard Specimen"
                  >
                    ✕
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SAVED SPECIMEN EXPANSION GRAPH VIEWER MODAL OVERLAY */}
      {activeSpecimenId && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="bg-paper border border-ink/20 w-full max-w-7xl h-[90vh] rounded-sharp shadow-[0_24px_64px_rgba(26,28,24,0.18)] flex flex-col justify-between relative">
            <span className="absolute -bottom-1 -right-1 size-2 bg-maroon" />

            {/* Modal Header */}
            <header className="border-b border-ink/10 px-6 py-4 flex justify-between items-center bg-paper-deep/30">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-moss">Specimen Cabinet Registry</span>
                <h3 className="font-display text-2xl italic text-ink mt-0.5">
                  {detailData?.specimen.title || 'Loading archive...'}
                </h3>
              </div>
              <button
                onClick={() => { setActiveSpecimenId(null); setDetailData(null); }}
                className="font-mono text-xs text-ink hover:text-maroon border border-ink/20 px-3 py-1 hover:border-maroon rounded-sharp transition-all"
              >
                Close View ✕
              </button>
            </header>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6">
              {loadingDetails ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                  <div className="size-6 border border-dashed border-maroon animate-spin rounded-full" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-soft">Loading registry log...</span>
                </div>
              ) : detailData && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start h-full">
                  
                  {/* Left sidebar info drawer */}
                  <aside className="col-span-1 md:col-span-4 border border-ink/10 bg-paper-deep/20 p-5 rounded-sharp space-y-6">
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-moss block mb-2">Origin Detail</span>
                      <p className="font-sans text-xs text-ink-soft leading-relaxed">
                        Source input seed: <strong className="font-mono text-[9px] text-ink block mt-1 border-b border-ink/10 pb-1">{detailData.specimen.origin_value}</strong>
                      </p>
                    </div>

                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-moss block mb-2">Discovery Trail</span>
                      <ul className="space-y-2.5 border-l border-ink/10 pl-2.5 ml-1">
                        {detailData.trailSteps.map((step: any, idx: number) => (
                          <li key={idx} className="flex items-center gap-1.5 text-xs">
                            <span className="font-mono text-[9px] text-ink-soft/40">{String(step.stepNumber).padStart(2, '0')}</span>
                            <span className="font-display italic text-[14px] text-ink">{step.nodeLabel}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rule" />

                    <button
                      onClick={() => handleDeleteSpecimen(detailData.specimen.id)}
                      className="w-full font-mono text-[9px] uppercase tracking-[0.22em] border border-maroon/40 text-maroon py-2 rounded-sharp hover:bg-maroon hover:text-paper transition-all"
                    >
                      Permanently Discard Specimen
                    </button>
                  </aside>

                  {/* Main Graph rendering block */}
                  <main className="col-span-1 md:col-span-8 space-y-6 h-full">
                    <div className="border border-ink/10 bg-paper rounded-sharp p-1">
                      <KnowledgeGraph
                        seedNodeId={detailData.nodes[0]?.id || ''}
                        nodes={detailData.nodes}
                        edges={detailData.edges}
                        onSelectNode={setSelectedNode}
                        selectedNodeId={selectedNode?.id || null}
                      />
                    </div>

                    {/* Modal Node Selection Detail Panel */}
                    {selectedNode && (
                      <div className="border border-ink/10 bg-paper-deep/60 p-5 rounded-sharp relative animate-fade-in">
                        <div className="flex justify-between items-baseline mb-2">
                          <h4 className="font-display text-xl text-ink font-semibold italic">{selectedNode.label}</h4>
                          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-clay">{selectedNode.type}</span>
                        </div>
                        <p className="font-sans text-xs text-ink-soft leading-relaxed">{selectedNode.description}</p>
                      </div>
                    )}
                  </main>

                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
