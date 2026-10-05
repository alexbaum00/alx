import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { conferirSenha, gerarHash, hashToken, novoToken } from '../lib/senha.js';
import { limparFalhas, registrarFalha, segundosBloqueado } from '../lib/tentativas.js';

export const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000;
const RENOVAR_APOS_MS = 60 * 60 * 1000;

export async function senhaDefinida() {
  return (await prisma.acesso.count()) > 0;
}

async function abrirSessao(dispositivo?: string) {
  const token = novoToken();
  await prisma.sessao.create({
    data: { tokenHash: hashToken(token), dispositivo: dispositivo?.slice(0, 200), expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS) },
  });
  return token;
}

// Primeira senha: só no computador da oficina (quem está no Wi-Fi não pode "tomar" o sistema).
export async function definirPrimeiraSenha(senha: string, ehLocal: boolean, dispositivo?: string) {
  if (await senhaDefinida()) throw new AppError('A senha já foi definida', 409);
  if (!ehLocal) throw new AppError('Defina a senha no computador onde o sistema está instalado', 403);
  await prisma.acesso.create({ data: { senhaHash: await gerarHash(senha) } });
  return abrirSessao(dispositivo);
}

export async function entrar(senha: string, ip: string, dispositivo?: string) {
  const espera = segundosBloqueado(ip);
  if (espera) throw new AppError(`Muitas tentativas. Tente de novo em ${Math.ceil(espera / 60)} min.`, 429);
  const acesso = await prisma.acesso.findUnique({ where: { id: 1 } });
  if (!acesso) throw new AppError('Senha ainda não definida', 409);
  if (!(await conferirSenha(senha, acesso.senhaHash))) {
    registrarFalha(ip);
    throw new AppError('Senha incorreta', 401);
  }
  limparFalhas(ip);
  await prisma.sessao.deleteMany({ where: { expiraEm: { lt: new Date() } } });
  return abrirSessao(dispositivo);
}

// Confere o token do cookie; renova a validade com o uso (no máximo uma escrita por hora).
export async function validarSessao(token: string | undefined) {
  if (!token) return null;
  const sessao = await prisma.sessao.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!sessao || sessao.expiraEm < new Date()) return null;
  if (Date.now() - sessao.ultimoAcesso.getTime() > RENOVAR_APOS_MS) {
    await prisma.sessao.update({
      where: { id: sessao.id },
      data: { ultimoAcesso: new Date(), expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS) },
    });
  }
  return sessao;
}

export async function sair(token: string | undefined) {
  if (token) await prisma.sessao.deleteMany({ where: { tokenHash: hashToken(token) } });
}

// Troca a senha e derruba as outras sessões (celular perdido, funcionário que saiu…).
export async function trocarSenha(atual: string, nova: string, tokenAtual: string) {
  const acesso = await prisma.acesso.findUniqueOrThrow({ where: { id: 1 } });
  if (!(await conferirSenha(atual, acesso.senhaHash))) throw new AppError('Senha atual incorreta', 400);
  await prisma.$transaction([
    prisma.acesso.update({ where: { id: 1 }, data: { senhaHash: await gerarHash(nova) } }),
    prisma.sessao.deleteMany({ where: { tokenHash: { not: hashToken(tokenAtual) } } }),
  ]);
}

export async function redefinirAcesso() {
  await prisma.$transaction([prisma.sessao.deleteMany(), prisma.acesso.deleteMany()]);
}
