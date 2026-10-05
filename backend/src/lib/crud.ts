import type { FastifyInstance } from 'fastify';
import type { ZodType } from 'zod';
import { idParam, listQuery } from '../schemas/common.js';

export interface CrudService<C, U, Q> {
  listar(query: Q): Promise<unknown>;
  buscarPorId(id: number): Promise<unknown>;
  criar(data: C): Promise<unknown>;
  atualizar(id: number, data: U): Promise<unknown>;
  remover(id: number): Promise<void>;
}

// Registra GET /, GET /:id, POST /, PUT /:id e DELETE /:id para um cadastro.
export function registrarCrud<C, U, Q = ReturnType<typeof listQuery.parse>>(
  app: FastifyInstance,
  service: CrudService<C, U, Q>,
  schemas: { create: ZodType<C>; update: ZodType<U>; list?: ZodType<Q> },
) {
  const list = schemas.list ?? (listQuery as unknown as ZodType<Q>);

  app.get('/', async (req) => service.listar(list.parse(req.query)));
  app.get('/:id', async (req) => service.buscarPorId(idParam.parse(req.params).id));
  app.post('/', async (req, reply) => reply.code(201).send(await service.criar(schemas.create.parse(req.body))));
  app.put('/:id', async (req) => service.atualizar(idParam.parse(req.params).id, schemas.update.parse(req.body)));
  app.delete('/:id', async (req, reply) => {
    await service.remover(idParam.parse(req.params).id);
    return reply.code(204).send();
  });
}

export function paginar(pagina: number, porPagina: number) {
  return { skip: (pagina - 1) * porPagina, take: porPagina };
}
