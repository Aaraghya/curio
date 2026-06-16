import React, { useState } from 'react';
import { useGraphLayout } from '../../hooks/useGraphLayout';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  description: string;
  domain: 'Technology' | 'History' | 'Science' | 'Culture';
}

interface GraphEdge {
  source: string;
  target: string;
  connection_type: string;
  description: string;
}

interface KnowledgeGraphProps {
  seedNodeId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode: (node: GraphNode) => void;
  selectedNodeId: string | null;
}

export function KnowledgeGraph({
  seedNodeId,
  nodes: rawNodes,
  edges,
  onSelectNode,
  selectedNodeId
}: KnowledgeGraphProps) {
  // Compute positions via physics engine hook
  const positionedNodes = useGraphLayout({ nodes: rawNodes, edges });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const getDomainColor = (domain: string) => {
    switch (domain) {
      case 'Technology': return 'text-moss';
      case 'History': return 'text-burgundy';
      case 'Science': return 'text-navy';
      case 'Culture': return 'text-clay';
      default: return 'text-ink-soft';
    }
  };

  return (
    <div className="relative w-full aspect-[16/10] min-h-[560px] border border-ink/10 bg-paper-deep/15 rounded-sharp p-4 overflow-visible select-none">
      {/* 1. Background Grid & Coordinates Guidelines */}
      <div className="absolute inset-0 border border-ink/5 pointer-events-none rounded-sharp" 
           style={{ 
             backgroundSize: '40px 40px', 
             backgroundImage: 'linear-gradient(to right, oklch(0.18 0.006 110 / 0.03) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.18 0.006 110 / 0.03) 1px, transparent 1px)' 
           }} 
      />

      {/* 2. SVG Line Connections (Behind Nodes) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
        {edges.map((edge, idx) => {
          const sourceNode = positionedNodes.find(n => n.id === edge.source);
          const targetNode = positionedNodes.find(n => n.id === edge.target);

          if (!sourceNode || !targetNode) return null;

          const isSeedEdge = edge.source === seedNodeId || edge.target === seedNodeId;
          const isHighlighted = hoveredNodeId === edge.source || hoveredNodeId === edge.target || 
                                selectedNodeId === edge.source || selectedNodeId === edge.target;
          
          return (
            <line
              key={idx}
              x1={`${sourceNode.x}%`}
              y1={`${sourceNode.y}%`}
              x2={`${targetNode.x}%`}
              y2={`${targetNode.y}%`}
              stroke="currentColor"
              strokeWidth={isSeedEdge ? 1.2 : 0.8}
              strokeDasharray={isSeedEdge ? undefined : "3 4"}
              className={`transition-all duration-300 ${
                isHighlighted 
                  ? 'text-maroon opacity-90' 
                  : isSeedEdge 
                    ? 'text-ink/30 opacity-60' 
                    : 'text-clay/30 opacity-40'
              }`}
              style={{
                strokeDashoffset: isHighlighted ? 0 : 20,
                transition: 'stroke 0.3s var(--ease-journal), stroke-width 0.3s'
              }}
            />
          );
        })}
      </svg>

      {/* 3. HTML Absolute Positioned Node Buttons */}
      <div className="absolute inset-0 z-10 overflow-visible pointer-events-none">
        {positionedNodes.map((node) => {
          const isSeed = node.id === seedNodeId;
          const isSelected = node.id === selectedNodeId;
          const isHovered = node.id === hoveredNodeId;
          
          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group outline-none"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {isSeed ? (
                /* Seed Node Layout */
                <div className={`px-5 py-3 border border-ink/25 bg-paper/95 shadow-offset transition-all duration-300 rounded-sharp text-left relative ${
                  isSelected ? 'border-maroon ring-1 ring-maroon' : 'hover:border-ink'
                }`}>
                  <p className="font-mono text-[8px] uppercase tracking-[0.2em] mb-1 text-moss">
                    Seed concept
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl leading-none text-ink font-normal">
                    {node.label}
                  </h3>
                  <p className="font-mono text-[8px] mt-2 text-ink-soft/60 uppercase tracking-[0.18em]">
                    Source · Seed
                  </p>
                  {/* Archival corner marker */}
                  <span className="absolute -bottom-[4px] -right-[4px] size-2 bg-maroon" />
                </div>
              ) : (
                /* Satellite Node Layout */
                <div className={`text-left bg-paper/90 backdrop-blur-[1px] border border-ink/10 px-2.5 py-1.5 max-w-[170px] rounded-sharp transition-all duration-300 shadow-[0_2px_8px_rgba(36,35,32,0.03)] ${
                  isSelected 
                    ? 'border-maroon shadow-offset bg-paper' 
                    : isHovered 
                      ? 'border-ink/40 shadow-sm' 
                      : 'hover:border-ink/25'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {/* Pulsing dot indicators */}
                    <span className={`block rounded-full size-[5px] transition-all duration-300 ${
                      isSelected || isHovered 
                        ? 'bg-maroon scale-125 animate-pulse' 
                        : 'bg-ink'
                    }`} />
                    <p className={`font-mono text-[8px] uppercase tracking-[0.16em] italic ${getDomainColor(node.domain)}`}>
                      {node.type}
                    </p>
                  </div>
                  <h4 className="font-display text-sm leading-tight text-ink clamp-2">
                    {node.label}
                  </h4>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
