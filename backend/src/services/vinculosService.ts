import type { Prisma } from '@prisma/client';
import { AppError, NotFoundError } from '../lib/errors.js';

// Confere se cliente e veículo existem e se o veículo pertence ao cliente.
export async function validarClienteVeiculo(
  tx: Prisma.TransactionClient,
  clienteId: number | null | undefined,
  veiculoId: number | null | undefined,
) {
  if (clienteId != null && !(await tx.cliente.findUnique({ where: { id: clienteId }, select: { id: true } }))) {
    throw new NotFoundError('Cliente');
  }
  if (veiculoId != null) {
    const veiculo = await tx.veiculo.findUnique({ where: { id: veiculoId }, select: { clienteId: true } });
    if (!veiculo) throw new NotFoundError('Veículo');
    if (clienteId != null && veiculo.clienteId !== clienteId) {
      throw new AppError('O veículo informado não pertence a este cliente');
    }
  }
}
