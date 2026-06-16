import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { SectionHeader } from '../components/shared/SectionHeader';
import { EmptyState } from '../components/shared/EmptyState';

export const Route = createFileRoute('/museum')({
  component: MuseumPage,
});

function MuseumPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        label="04 · Exhibition Log"
        title="Curiosity analysis of E. Calloway"
        italicTitleWord="Calloway"
        subtitle="Archetypes & Domain Strata"
      />
      
      <EmptyState
        title="Exhibits Empty"
        message="Analytics pipelines require active specimen records to catalog your primary curiosity domains and construct strata timelines."
      />
    </div>
  );
}
