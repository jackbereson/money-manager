import worker from './.open-next/worker.js';
import { databaseContext } from './src/lib/database-context.ts';
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

// Workers TCP sockets belong to the request that opened them. Share a Mongo
// client within a request, then close it when the response stream finishes.
const moneyWorker = {
  ...worker,
  async fetch(request, env, ctx) {
    const scope = {};
    const close = () => ctx.waitUntil(scope.client?.then(client => client.close()).catch(() => {}) ?? Promise.resolve());
    return databaseContext.run(scope, async () => {
      try {
        const response = await worker.fetch(request, env, ctx);
        if (!response.body) { close(); return response; }
        const reader = response.body.getReader();
        const body = new ReadableStream({
          async pull(controller) {
            try {
              const { done, value } = await databaseContext.run(scope, () => reader.read());
              if (done) { controller.close(); close(); }
              else controller.enqueue(value);
            } catch (error) { controller.error(error); close(); }
          },
          async cancel(reason) { try { await reader.cancel(reason); } finally { close(); } },
        });
        return new Response(body, response);
      } catch (error) { close(); throw error; }
    });
  },
};
export default moneyWorker;
