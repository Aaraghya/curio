import React, { useState } from 'react';

interface FlowHintProps {
  label?: string;
  hint: string;
  className?: string;
}

export function FlowHint({ label = 'Registry Note', hint, className = '' }: FlowHintProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      className={`border border-ink/10 bg-paper-deep/30 p-4 flex justify-between items-start gap-4 rounded-sharp relative overflow-hidden ${className}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-clay/40" />
      
      <div className="pl-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-clay block mb-1">
          {label}
        </span>
        <p className="font-sans text-[13px] leading-relaxed text-ink-soft">
          {hint}
        </p>
      </div>

      <button
        onClick={() => setVisible(false)}
        className="font-mono text-[9px] text-ink-soft/40 hover:text-ink transition-colors duration-200"
        aria-label="Dismiss Note"
      >
        ✕
      </button>
    </div>
  );
}
