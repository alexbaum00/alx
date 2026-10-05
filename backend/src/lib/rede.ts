import { networkInterfaces } from 'node:os';

// Endereços IPv4 da máquina na rede local (para abrir no celular).
export function enderecosLocais(porta: number) {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i!.address}:${porta}`);
}
