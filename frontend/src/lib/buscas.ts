import { api, type Pagina } from './api';
import type { Relacao } from '@/components/cadastro/tipos';
import { formatarPlaca } from './formato';

interface ClienteApi {
  id: number;
  nome: string;
  cpfCnpj: string | null;
  telefone: string | null;
}

export const buscarClientes = async (termo: string): Promise<Relacao[]> =>
  (await api<Pagina<ClienteApi>>(`/clientes?porPagina=15&busca=${encodeURIComponent(termo)}`)).itens.map((c) => ({
    id: c.id,
    rotulo: c.nome,
    detalhe: [c.telefone, c.cpfCnpj].filter(Boolean).join(' · ') || undefined,
  }));

export const buscarFornecedores = async (termo: string): Promise<Relacao[]> =>
  (await api<Pagina<{ id: number; razaoSocial: string; nomeFantasia: string | null }>>(`/fornecedores?porPagina=15&busca=${encodeURIComponent(termo)}`)).itens.map(
    (f) => ({ id: f.id, rotulo: f.nomeFantasia || f.razaoSocial, detalhe: f.nomeFantasia ? f.razaoSocial : undefined }),
  );

export const buscarVeiculos = async (termo: string, clienteId?: number): Promise<Relacao[]> =>
  (
    await api<Pagina<{ id: number; placa: string; marca: string | null; modelo: string; cliente: { nome: string } }>>(
      `/veiculos?porPagina=15&busca=${encodeURIComponent(termo)}${clienteId ? `&clienteId=${clienteId}` : ''}`,
    )
  ).itens.map((v) => ({ id: v.id, rotulo: `${formatarPlaca(v.placa)} · ${[v.marca, v.modelo].filter(Boolean).join(' ')}`, detalhe: v.cliente.nome }));
