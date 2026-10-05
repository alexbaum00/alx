// Limite de tentativas de login por endereço: após 5 erros, espera crescente (1, 2, 4… min, até 30).
const LIMITE = 5;
const registro = new Map<string, { falhas: number; bloqueadoAte: number }>();

export function segundosBloqueado(ip: string, agora = Date.now()) {
  const r = registro.get(ip);
  return r && r.bloqueadoAte > agora ? Math.ceil((r.bloqueadoAte - agora) / 1000) : 0;
}

export function registrarFalha(ip: string, agora = Date.now()) {
  const r = registro.get(ip) ?? { falhas: 0, bloqueadoAte: 0 };
  r.falhas += 1;
  if (r.falhas >= LIMITE) {
    const minutos = Math.min(30, 2 ** (r.falhas - LIMITE));
    r.bloqueadoAte = agora + minutos * 60_000;
  }
  registro.set(ip, r);
}

export function limparFalhas(ip: string) {
  registro.delete(ip);
}

export function zerarTentativas() {
  registro.clear();
}
