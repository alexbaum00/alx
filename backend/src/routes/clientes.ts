import type { FastifyInstance } from 'fastify';
import * as clienteService from '../services/clienteService.js';
import { clienteCreate, clienteUpdate } from '../schemas/cliente.js';
import { idParam, listQuery } from '../schemas/common.js';

export async function clienteRoutes(app: FastifyInstance) {
  app.get('/', async (req) => clienteService.listar(listQuery.parse(req.query)));

  app.get('/:id', async (req) => clienteService.buscarPorId(idParam.parse(req.params).id));

  app.post('/', async (req, reply) => {
    const cliente = await clienteService.criar(clienteCreate.parse(req.body));
    return reply.code(201).send(cliente);
  });

  app.put('/:id', async (req) =>
    clienteService.atualizar(idParam.parse(req.params).id, clienteUpdate.parse(req.body)),
  );

  app.delete('/:id', async (req, reply) => {
    await clienteService.remover(idParam.parse(req.params).id);
    return reply.code(204).send();
  });
}
