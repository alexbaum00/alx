import { env } from './config/env.js';
import { buildApp } from './app.js';
import { enderecosLocais } from './lib/rede.js';
import { agendarBackups } from './lib/backup.js';

const app = await buildApp({ logger: { level: 'info' } });
await app.listen({ host: env.HOST, port: env.PORT });

const ips = enderecosLocais(env.PORT);
app.log.info(`Sistema no ar. Neste computador: http://localhost:${env.PORT}`);
if (ips.length) app.log.info(`No celular (mesmo Wi-Fi): ${ips.join(' | ')}`);

if (env.BACKUP_AUTOMATICO) agendarBackups(app.log);
