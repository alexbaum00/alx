// Código "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central).
// Gerado aqui mesmo, sem banco nem API: o cliente lê o QR e o app do banco já
// preenche chave, valor e nome. Não confirma o recebimento sozinho; isso fica no extrato.

// campo EMV: id de 2 dígitos + tamanho de 2 dígitos + valor
function campo(id: string, valor: string) {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do código
export function crc16(texto: string) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// nome e cidade: sem acento, só letras, números e espaço, no tamanho máximo do padrão
function textoSimples(texto: string, max: number) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

// Chave como o banco espera: e-mail em minúsculas, celular com +55, CPF/CNPJ só números.
export function normalizarChavePix(chave: string) {
  const c = chave.trim();
  if (c.includes('@')) return c.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return c.toLowerCase();
  if (c.startsWith('+')) return `+${c.replace(/\D/g, '')}`;
  const digitos = c.replace(/\D/g, '');
  if (/^[\d.\-/ ]+$/.test(c) && (digitos.length === 11 || digitos.length === 14)) return digitos;
  return c;
}

export function chavePixValida(chave: string) {
  const c = normalizarChavePix(chave);
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(c) ||
    /^\+55\d{10,11}$/.test(c) ||
    /^\d{11}$/.test(c) ||
    /^\d{14}$/.test(c)
  );
}

export function payloadPix({ chave, nome, cidade, valorCentavos, identificador }: {
  chave: string;
  nome: string;
  cidade: string;
  valorCentavos?: number;
  identificador?: string;
}) {
  const txid = (identificador ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const corpo =
    campo('00', '01') +
    campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', normalizarChavePix(chave))) +
    campo('52', '0000') +
    campo('53', '986') +
    (valorCentavos && valorCentavos > 0 ? campo('54', (valorCentavos / 100).toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', textoSimples(nome, 25) || 'RECEBEDOR') +
    campo('60', textoSimples(cidade, 15) || 'BRASIL') +
    campo('62', campo('05', txid)) +
    '6304';
  return corpo + crc16(corpo);
}
