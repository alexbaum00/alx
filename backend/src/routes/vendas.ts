import type { FastifyInstance } from 'fastify';
import { idParam } from '../schemas/common.js';
import * as s from '../schemas/vendas.js';
import * as vendaService from '../services/vendaService.js';
import * as orcamentoService from '../services/orcamentoService.js';
import * as dashboardService from '../services/dashboardService.js';
import * as relatorioService from '../services/relatorioService.js';
import { periodoQuery } from '../schemas/common.js';

// Vendas não têm DELETE: o caminho é cancelar, que devolve as peças ao estoque.
export async function vendaRoutes(app: FastifyInstance) {
  app.get('/', async (req) => vendaService.listar(s.vendaList.parse(req.query)));
  app.get('/:id', async (req) => vendaService.buscarPorId(idParam.parse(req.params).id));
  app.post('/', async (req, reply) => reply.code(201).send(await vendaService.criar(s.vendaCreate.parse(req.body))));
  app.put('/:id', async (req) => vendaService.atualizar(idParam.parse(req.params).id, s.vendaUpdate.parse(req.body)));
  app.patch('/:id/status', async (req) => {
    const { status, formaPagamento } = s.vendaStatus.parse(req.body);
    return vendaService.alterarStatus(idParam.parse(req.params).id, status, formaPagamento);
  });
}

export async function orcamentoRoutes(app: FastifyInstance) {
  app.get('/', async (req) => orcamentoService.listar(s.orcamentoList.parse(req.query)));
  app.get('/:id', async (req) => orcamentoService.buscarPorId(idParam.parse(req.params).id));
  app.post('/', async (req, reply) =>
    reply.code(201).send(await orcamentoService.criar(s.orcamentoCreate.parse(req.body))),
  );
  app.put('/:id', async (req) =>
    orcamentoService.atualizar(idParam.parse(req.params).id, s.orcamentoUpdate.parse(req.body)),
  );
  app.patch('/:id/status', async (req) =>
    orcamentoService.alterarStatus(idParam.parse(req.params).id, s.orcamentoStatus.parse(req.body).status),
  );
  app.post('/:id/converter', async (req, reply) =>
    reply
      .code(201)
      .send(await orcamentoService.converterEmVenda(idParam.parse(req.params).id, s.orcamentoConverter.parse(req.body ?? {}))),
  );
  app.delete('/:id', async (req, reply) => {
    await orcamentoService.remover(idParam.parse(req.params).id);
    return reply.code(204).send();
  });
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/stats', async () => dashboardService.estatisticas());
}

export async function relatorioRoutes(app: FastifyInstance) {
  app.get('/financeiro', async (req) => {
    const { de, ate } = periodoQuery.parse(req.query);
    return relatorioService.resumoFinanceiro(de, ate);
  });
  app.get('/vendas', async (req) => {
    const { de, ate } = periodoQuery.parse(req.query);
    return relatorioService.relatorioVendas(de, ate);
  });
}
