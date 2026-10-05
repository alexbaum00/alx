import type { FastifyInstance } from 'fastify';
import * as clienteService from '../services/clienteService.js';
import { clienteCreate, clienteUpdate } from '../schemas/cliente.js';
import { registrarCrud } from '../lib/crud.js';

export async function clienteRoutes(app: FastifyInstance) {
  registrarCrud(app, clienteService, { create: clienteCreate, update: clienteUpdate });
}
