import { networkInterfaces } from 'node:os';
import { env } from './config/env.js';
import { buildApp } from './app.js';

const app = await buildApp({ logger: { level: 'info' } });
await app.listen({ host: env.HOST, port: env.PORT });

// Mostra os endereços para abrir no celular conectado ao mesmo Wi-Fi.
const ips = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === 'IPv4' && !i.internal)
  .map((i) => `http://${i!.address}:${env.PORT}`);
if (ips.length) app.log.info(`Acesso pela rede local: ${ips.join(' | ')}`);
