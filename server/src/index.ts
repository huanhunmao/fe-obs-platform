import Fastify from 'fastify';
import cors from '@fastify/cors';
import { WebSocketServer } from 'ws';
import { Pipeline } from './pipeline.js';

const PORT = Number(process.env.PORT || 8787);
const app = Fastify({ logger: false });
await app.register(cors, { origin: true });

const pipe = new Pipeline();

app.post('/ingest', async (req, reply) => {
  const evt = req.body as any;
  pipe.publish('events', { ...evt, serverTs: Date.now() });
  return reply.code(204).send();
});

app.get('/health', async () => ({ ok: true }));

const server = await app.listen({ port: PORT, host: '0.0.0.0' });

const wss = new WebSocketServer({ server: (app.server as any) });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'snapshot', data: pipe.snapshot(100) }));
  const off = pipe.subscribe('events', (evt) => {
    try { ws.send(JSON.stringify({ type: 'event', data: evt })); } catch {}
  });
  ws.on('close', off);
});

console.log('[server] listening on', PORT);