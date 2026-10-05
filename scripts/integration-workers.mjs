process.env.TEST_RUNTIME = 'workers';
process.env.TEST_PORT ??= '3114';
await import('./integration.mjs');
