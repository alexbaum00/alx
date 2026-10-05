import { ApiError, EVENTO_SESSAO_EXPIRADA } from './api';

export const urlImagem = (id: string) => `/api/imagens/${id}`;

// Reduz a foto no navegador antes de enviar: uma foto de celular de 4 MB vira ~300 KB
// em JPEG, sem perder a leitura de um esquema ou de um conector.
export async function reduzirFoto(arquivo: File, maxLado = 1600, qualidade = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; // PNG com fundo transparente fica branco no JPEG
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();
  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Não foi possível ler a foto'))), 'image/jpeg', qualidade));
}

export async function enviarFoto(arquivo: File, maxLado?: number): Promise<{ id: string; url: string }> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem');
  const blob = await reduzirFoto(arquivo, maxLado);
  const res = await fetch('/api/imagens', { method: 'POST', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
  const corpo = await res.json().catch(() => null);
  if (res.status === 401) window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
  if (!res.ok) throw new ApiError(corpo?.erro ?? `Erro ${res.status}`, res.status);
  return corpo;
}
