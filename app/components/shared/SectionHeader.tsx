import React from 'react';

interface SectionHeaderProps {
  label: string;
  title: string;
  italicTitleWord?: string;
  subtitle: string;
  description?: string;
  className?: string;
}

export function SectionHeader({
  label,
  title,
  italicTitleWord,
  subtitle,
  description,
  className = '',
}: SectionHeaderProps) {
  // Highlight the italic word if provided
  const renderTitle = () => {
    if (!italicTitleWord) return title;
    const parts = title.split(italicTitleWord);
    return (
      <>
        {parts[0]}
        <span className="italic text-maroon font-display">{italicTitleWord}</span>
        {parts[1]}
      </>
    );
  };

  return (
    <section className={`mb-16 ${className}`}>
      {/* Top Label */}
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-moss mb-4">
        {label}
      </p>

      {/* Main Heading */}
      <h2 className="font-display text-5xl md:text-6xl leading-[1.05] text-pretty text-ink">
        {renderTitle()}
      </h2>

      {/* Subtitle */}
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft/60 mt-3">
        {subtitle}
      </p>

      {/* Description text */}
      {description && (
        <p className="mt-5 text-[15px] leading-relaxed text-ink-soft max-w-xl">
          {description}
        </p>
      )}
    </section>
  );
}
