import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', horario: new Date().toISOString() };
  });
}
