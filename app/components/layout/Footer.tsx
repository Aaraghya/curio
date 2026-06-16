import React from 'react';

export function ArchiveFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="max-w-7xl mx-auto px-6 md:px-12 pt-12 pb-16 mt-20">
      <div className="rule mb-8" />
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-soft/60">
        <div>
          © {currentYear} Curio Archive. All concepts registered.
        </div>
        <div className="flex items-center gap-2">
          <span>Admissio: Cogitare</span>
          <span className="text-maroon">•</span>
          <span>Field Log v.04</span>
        </div>
      </div>
    </footer>
  );
}
