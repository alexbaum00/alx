import type { FastifyInstance } from 'fastify';
import { registrarCrud } from '../lib/crud.js';
import { idParam } from '../schemas/common.js';
import * as s from '../schemas/cadastros.js';
import * as veiculoService from '../services/veiculoService.js';
import * as fornecedorService from '../services/fornecedorService.js';
import * as produtoService from '../services/produtoService.js';
import * as servicoService from '../services/servicoService.js';
import * as procedimentoService from '../services/procedimentoService.js';
import * as despesaService from '../services/despesaService.js';
import { prisma } from '../lib/prisma.js';

export async function veiculoRoutes(app: FastifyInstance) {
  registrarCrud(app, veiculoService, { create: s.veiculoCreate, update: s.veiculoUpdate, list: s.veiculoList });
}

export async function fornecedorRoutes(app: FastifyInstance) {
  registrarCrud(app, fornecedorService, { create: s.fornecedorCreate, update: s.fornecedorUpdate });
}

export async function produtoRoutes(app: FastifyInstance) {
  // rotas fixas antes do CRUD para não colidir com /:id
  app.get('/estoque-baixo', async () => produtoService.listarEstoqueBaixo());
  app.get('/categorias', async () => produtoService.categorias());
  app.post('/:id/entrada', async (req) =>
    produtoService.registrarEntrada(idParam.parse(req.params).id, s.entradaEstoque.parse(req.body)),
  );
  app.post('/:id/ajuste', async (req) =>
    produtoService.ajustarEstoque(idParam.parse(req.params).id, s.ajusteEstoque.parse(req.body)),
  );
  registrarCrud(app, produtoService, { create: s.produtoCreate, update: s.produtoUpdate, list: s.produtoList });
}

export async function servicoRoutes(app: FastifyInstance) {
  registrarCrud(app, servicoService, { create: s.servicoCreate, update: s.servicoUpdate });
}

export async function procedimentoRoutes(app: FastifyInstance) {
  registrarCrud(app, procedimentoService, { create: s.procedimentoCreate, update: s.procedimentoUpdate });
}

export async function despesaRoutes(app: FastifyInstance) {
  registrarCrud(app, despesaService, { create: s.despesaCreate, update: s.despesaUpdate, list: s.despesaList });
}

export async function empresaRoutes(app: FastifyInstance) {
  app.get('/', async () => prisma.empresa.upsert({ where: { id: 1 }, update: {}, create: {} }));
  app.put('/', async (req) => {
    const data = s.empresaUpdate.parse(req.body);
    return prisma.empresa.upsert({ where: { id: 1 }, update: data, create: data });
  });
}
