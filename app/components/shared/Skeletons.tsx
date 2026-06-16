import React from 'react';

// Specimen Card loading layout
export function SpecimenCardSkeleton() {
  return (
    <div className="border border-ink/10 bg-paper-deep p-5 rounded-sharp animate-pulse">
      <div className="border-l-2 border-ink/10 pl-3 space-y-3">
        {/* Domain and date */}
        <div className="h-2.5 w-1/3 bg-ink/10 rounded-sm" />
        {/* Title */}
        <div className="h-5 w-2/3 bg-ink/15 rounded-sm" />
        {/* Summary */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-ink/10 rounded-sm" />
          <div className="h-3 w-5/6 bg-ink/10 rounded-sm" />
        </div>
        {/* Tags */}
        <div className="flex gap-1.5 pt-1">
          <div className="h-4 w-12 bg-ink/10 rounded-sm" />
          <div className="h-4 w-16 bg-ink/10 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

// Full page loader skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Title block */}
      <div className="space-y-3">
        <div className="h-3 w-20 bg-moss/20 rounded-sm" />
        <div className="h-12 w-2/3 bg-ink/10 rounded-sm" />
        <div className="h-3 w-40 bg-ink/10 rounded-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-12">
        {/* Left main block */}
        <div className="col-span-1 md:col-span-8 border border-ink/10 p-6 bg-paper-deep/20 rounded-sharp space-y-6">
          <div className="h-6 w-1/4 bg-ink/15 rounded-sm" />
          <div className="h-40 w-full bg-ink/10 rounded-sm" />
          <div className="h-24 w-full bg-ink/10 rounded-sm" />
        </div>

        {/* Right sidebar block */}
        <div className="col-span-1 md:col-span-4 space-y-6">
          <div className="border border-ink/10 p-5 rounded-sharp space-y-4">
            <div className="h-4 w-1/2 bg-ink/15 rounded-sm" />
            <div className="h-3 w-full bg-ink/10 rounded-sm" />
            <div className="h-3 w-full bg-ink/10 rounded-sm" />
            <div className="h-3.5 w-3/4 bg-ink/10 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Graph Canvas loading spinner/state
export function GraphCanvasSkeleton() {
  return (
    <div className="relative w-full aspect-[16/10] min-h-[560px] border border-ink/10 bg-paper-deep/10 flex flex-col items-center justify-center rounded-sharp overflow-hidden">
      {/* Archival drafting guidelines background lines */}
      <div className="absolute inset-0 border-b border-ink/5 pointer-events-none" style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, oklch(0.18 0.006 110 / 0.02) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.18 0.006 110 / 0.02) 1px, transparent 1px)' }} />
      
      <div className="text-center relative z-10 space-y-4 animate-pulse">
        <div className="size-8 rounded-full border border-dashed border-maroon animate-spin mx-auto" />
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-maroon block">
            Plotting coordinates
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-ink-soft/50 mt-1 block">
            Synthesizing conceptual seeds...
          </span>
        </div>
      </div>
    </div>
  );
}
