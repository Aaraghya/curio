import React from 'react';
import ReactDOM from 'react-dom/client';
import { StartClient } from '@tanstack/start';
import { createRouter } from './router';

const router = createRouter();

ReactDOM.hydrateRoot(document, (
  <React.StrictMode>
    <StartClient router={router} />
  </React.StrictMode>
));
