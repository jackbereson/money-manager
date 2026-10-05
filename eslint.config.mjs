import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([...nextVitals, ...nextTs, { settings: { next: { rootDir: 'webapp/' } } }, { ignores: ['**/.next/**', '.open-next/**', '**/.wrangler/**', '.scratch/**', 'core/dist/**', '**/out/**', 'cloudflare-env.d.ts', '**/next-env.d.ts'] }]);
