// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://roger-g.de',
  integrations: [sitemap()],
  // Dev-Toolbar stört Screenshots/Audits im Headless-Workflow
  devToolbar: { enabled: false },
});
