import React from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="border border-ink/10 bg-paper-deep/50 p-12 text-center rounded-sharp">
      <div className="max-w-md mx-auto">
        {/* Pin or sticker index */}
        <div className="size-2 rounded-full bg-maroon/40 mx-auto mb-6" />

        <h3 className="font-display text-2xl text-ink italic mb-2">
          {title}
        </h3>
        
        <p className="font-sans text-sm text-ink-soft mb-6 leading-relaxed">
          {message}
        </p>

        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="font-mono text-[10px] uppercase tracking-[0.2em] border border-ink/25 px-4 py-2 hover:bg-ink hover:text-paper transition-all duration-300 rounded-sharp"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
