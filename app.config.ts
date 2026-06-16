import { defineConfig } from '@tanstack/start/config';

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        '~': '/app',
      },
    },
  },
});
