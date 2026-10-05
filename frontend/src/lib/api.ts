export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly campos?: { campo: string; mensagem: string }[],
  ) {
    super(message);
  }
}

export async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${caminho}`, {
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const corpo = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(corpo?.erro ?? `Erro ${res.status}`, res.status, corpo?.campos);
  return corpo as T;
}

export type StatusVenda = 'ABERTO' | 'CONCLUIDO' | 'PAGO' | 'CANCELADO';

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface DashboardStats {
  vendasHoje: { totalCentavos: number; atendimentos: number };
  produtosVendidosHoje: number;
  servicosHoje: number;
  estoqueBaixo: number;
  vendasRecentes: {
    id: number;
    data: string;
    status: StatusVenda;
    valorTotalCentavos: number;
    cliente: { id: number; nome: string } | null;
  }[];
  produtosEstoque: {
    id: number;
    nome: string;
    categoria: string | null;
    unidade: string;
    estoqueAtual: number;
    estoqueMinimo: number;
    estoqueBaixo: boolean;
  }[];
  veiculosRecentes: {
    vendaId: number;
    id: number;
    placa: string;
    marca: string | null;
    modelo: string;
    servico: string | null;
  }[];
}

export interface ClienteResumo {
  id: number;
  nome: string;
  telefone: string | null;
  veiculos: { id: number; placa: string; modelo: string }[];
}

export interface VeiculoResumo {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string;
  cliente: { id: number; nome: string };
}

export interface ProdutoResumo {
  id: number;
  nome: string;
  sku: string | null;
  categoria: string | null;
  unidade: string;
  estoqueAtual: number;
  precoVendaCentavos: number;
  estoqueBaixo: boolean;
}
