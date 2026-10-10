import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { payloadPix } from '../lib/pix.js';

// Código e QR do Pix da oficina para um valor. Sem chave cadastrada, avisa onde cadastrar.
export async function gerarPix(valorCentavos: number, identificador?: string) {
  const empresa = await prisma.empresa.findUnique({ where: { id: 1 } });
  if (!empresa?.pixChave) throw new AppError('Cadastre a chave Pix da oficina em Configurações.');
  const payload = payloadPix({
    chave: empresa.pixChave,
    nome: empresa.pixNome || empresa.razaoSocial || empresa.nomeFantasia,
    cidade: empresa.pixCidade || empresa.cidade || '',
    valorCentavos,
    identificador,
  });
  const qrSvg = await QRCode.toString(payload, { type: 'svg', margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
  return { payload, qrSvg, valorCentavos, chave: empresa.pixChave };
}
