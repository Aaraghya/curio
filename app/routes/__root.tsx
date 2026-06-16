import React from 'react';
import { createRootRoute, Outlet, ScrollRestoration, useLocation } from '@tanstack/react-router';
import { Meta, Scripts } from '@tanstack/start';
import { ArchiveNav } from '../components/layout/Navbar';
import { ArchiveFooter } from '../components/layout/Footer';
import styles from '../styles/globals.css?url';

import { AuthProvider } from '../hooks/useAuth';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Curio — Digital Curiosity Archive' },
      {
        name: 'description',
        content: 'A digital curiosity archive to explore concepts, map discovery trails, and discover unexpected conceptual connections.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: styles },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();

  // Dynamically extract rabbit-hole depth from URL parameters if visiting explore routes
  const searchParams = new URLSearchParams(location.search);
  const activeDepth = parseInt(searchParams.get('depth') || '0', 10);

  return (
    <html lang="en">
      <head>
        <Meta />
        {/* Inject environment variables safely from SSR context */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.env = {
                SUPABASE_URL: ${JSON.stringify(process.env.SUPABASE_URL || '')},
                SUPABASE_ANON_KEY: ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')}
              };
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <div className="min-h-screen flex flex-col justify-between relative">
            {/* Subtle top horizontal accent rule */}
            <div className="h-[3px] w-full bg-maroon/80" />
            
            <div className="flex-1 flex flex-col">
              <ArchiveNav activeDepth={activeDepth} maxDepth={9} />
              <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-8 animate-fade-in">
                <Outlet />
              </main>
            </div>
            
            <ArchiveFooter />
          </div>
        </AuthProvider>
        
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
