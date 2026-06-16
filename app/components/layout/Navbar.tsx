import React from 'react';
import { Link, useLocation } from '@tanstack/react-router';

import { useAuth } from '../../hooks/useAuth';

interface NavbarProps {
  activeDepth?: number;
  maxDepth?: number;
}

export function ArchiveNav({ activeDepth = 0, maxDepth = 9 }: NavbarProps) {
  const location = useLocation();
  const { user, loading, login, logout } = useAuth();

  const tabs = [
    { name: 'Explore', path: '/' },
    { name: 'Connections', path: '/connections' },
    { name: 'Cabinet', path: '/cabinet' },
    { name: 'Museum', path: '/museum' },
  ];

  return (
    <nav className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 px-6 md:px-12 pt-10 pb-8 border-b border-ink/5">
      {/* LEFT: Logo + Tabs */}
      <div className="flex items-end gap-10 flex-wrap">
        {/* Logo */}
        <Link to="/" className="group block select-none">
          <h1 className="font-display text-4xl italic leading-none tracking-tight text-ink">
            C<span className="text-maroon transition-colors duration-300">u</span>rio
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-moss mt-1">
            Field Registry · v.04
          </p>
        </Link>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.name}
                to={tab.path}
                className={`tab-nav-item ${isActive ? 'active' : ''}`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Rabbit-hole depth & Auth */}
      <div className="flex items-center gap-6">
        {/* Depth dots */}
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-soft/75">
            Rabbit-hole depth
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: maxDepth }).map((_, i) => {
              const isFilled = i < activeDepth;
              return (
                <div
                  key={i}
                  className={`size-[6px] rounded-full transition-all duration-300 ${
                    isFilled ? 'bg-maroon scale-110 shadow-[0_0_4px_oklch(0.40_0.12_22/0.2)]' : 'bg-ink/15'
                  }`}
                />
              );
            })}
            <span className="font-mono text-[10px] text-ink-soft ml-1.5">
              {activeDepth} / {maxDepth}
            </span>
          </div>
        </div>

        {/* Auth Button */}
        {loading ? (
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft/40 border border-ink/10 px-3 py-1.5 rounded-sharp">
            ···
          </div>
        ) : user ? (
          <button
            onClick={logout}
            className="font-mono text-[10px] uppercase tracking-[0.22em] border border-maroon/30 text-maroon px-3 py-1.5 rounded-sharp hover:bg-maroon hover:text-paper transition-all duration-300 active:translate-y-[1px]"
          >
            Log Out ({user.email?.split('@')[0]})
          </button>
        ) : (
          <button
            onClick={login}
            className="font-mono text-[10px] uppercase tracking-[0.22em] border border-ink/20 px-3 py-1.5 rounded-sharp hover:bg-ink hover:text-paper transition-all duration-300 active:translate-y-[1px]"
          >
            Identify
          </button>
        )}
      </div>
    </nav>
  );
}
