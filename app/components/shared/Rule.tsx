import React from 'react';

export function Rule({ className = '' }: { className?: string }) {
  return <div className={`rule my-8 ${className}`} />;
}
