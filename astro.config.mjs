// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import netlify from '@astrojs/netlify';

import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  output: 'server',
  adapter: netlify(),

  env: {
    schema: {
      TURSO_DATABASE_URL: envField.string({ context: 'server', access: 'secret' }),
      TURSO_AUTH_TOKEN: envField.string({ context: 'server', access: 'secret' }),
      ADMIN_USER: envField.string({ context: 'server', access: 'secret' }),
      ADMIN_PASSWORD: envField.string({ context: 'server', access: 'secret' }),
      AUTH_SECRET: envField.string({ context: 'server', access: 'secret' }),
      PUBLIC_SPOTIFY_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      SPOTIFY_CLIENT_ID: envField.string({ context: 'server', access: 'secret' }),
      SPOTIFY_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret' })
    }
  },

  integrations: [icon()]
});