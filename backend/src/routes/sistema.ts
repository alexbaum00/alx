import type { FastifyInstance } from 'fastify';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { enderecosLocais } from '../lib/rede.js';
import { z } from 'zod';
import { gerarPix } from '../services/pixService.js';
import { fazerBackup, listarBackups, pastaBackup } from '../lib/backup.js';

export async function sistemaRoutes(app: FastifyInstance) {
  // Endereços para abrir no celular, com QR code para apontar a câmera
  app.get('/acesso', async () => ({
    enderecos: await Promise.all(
      enderecosLocais(env.PORT).map(async (url) => ({
        url,
        qrSvg: await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0f172a', light: '#ffffff' } }),
      })),
    ),
  }));

  app.get('/backup', async () => ({
    pasta: pastaBackup(),
    automatico: env.BACKUP_AUTOMATICO,
    manter: env.BACKUP_MANTER,
    ultimos: listarBackups().slice(0, 5),
  }));

  // Pix de um valor qualquer: a tela de Nova Venda mostra o QR antes de a venda existir
  app.get('/pix', async (req) => {
    const { valorCentavos } = z.object({ valorCentavos: z.coerce.number().int().positive('Valor deve ser maior que zero') }).parse(req.query);
    return gerarPix(valorCentavos);
  });

  app.post('/backup', async () => {
    const caminho = await fazerBackup();
    return { caminho, ultimos: listarBackups().slice(0, 5) };
  });
}
