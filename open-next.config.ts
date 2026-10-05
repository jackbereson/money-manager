import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// All authenticated pages are dynamic; private data is never stored in a shared cache.
export default defineCloudflareConfig({});
