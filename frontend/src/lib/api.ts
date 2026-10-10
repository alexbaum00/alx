export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly campos?: { campo: string; mensagem: string }[],
  ) {
    super(message);
  }
}

export const EVENTO_SESSAO_EXPIRADA = 'alx:sessao-expirada';

export async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${caminho}`, {
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const corpo = await res.json().catch(() => null);
  // sessão vencida ou encerrada em outro aparelho: a tela de acesso assume
  if (res.status === 401 && !caminho.startsWith('/auth/')) window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
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
    imagemId: string | null;
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
  imagemId: string | null;
}

export type FormaPagamento = 'PIX' | 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'BOLETO' | 'OUTRO';
export type StatusOrcamento = 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'CONVERTIDO';

export const nomesFormaPagamento: Record<FormaPagamento, string> = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  CARTAO_DEBITO: 'Débito',
  CARTAO_CREDITO: 'Crédito',
  BOLETO: 'Boleto',
  OUTRO: 'Outro',
};

export interface ClienteCompleto {
  id: number;
  nome: string;
  cpfCnpj: string | null;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}

export interface VeiculoCompleto {
  id: number;
  clienteId: number;
  placa: string;
  marca: string | null;
  modelo: string;
  ano: number | null;
  kmAtual: number | null;
}

export interface ItemDocumento {
  id: number;
  tipo: 'PRODUTO' | 'SERVICO';
  produtoId: number | null;
  servicoId: number | null;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  valorTotalCentavos: number;
}

interface Totais {
  descontoCentavos: number;
  totalProdutosCentavos: number;
  totalServicosCentavos: number;
  valorTotalCentavos: number;
}

export interface Venda extends Totais {
  id: number;
  data: string;
  status: StatusVenda;
  formaPagamento: FormaPagamento | null;
  kmEntrada: number | null;
  observacoes: string | null;
  clienteId: number | null;
  veiculoId: number | null;
  cliente: ClienteCompleto | null;
  veiculo: VeiculoCompleto | null;
  itens: ItemDocumento[];
  orcamento: { id: number } | null;
  estoqueBaixado: boolean;
}

export interface Orcamento extends Totais {
  id: number;
  data: string;
  status: StatusOrcamento;
  validadeAte: string | null;
  nomeContato: string | null;
  telefoneContato: string | null;
  descricaoVeiculo: string | null;
  observacoes: string | null;
  clienteId: number | null;
  veiculoId: number | null;
  cliente: ClienteCompleto | null;
  veiculo: VeiculoCompleto | null;
  itens: ItemDocumento[];
  venda: { id: number; status: StatusVenda } | null;
}

export interface Empresa {
  nomeFantasia: string;
  razaoSocial: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  urlEmissorNfe: string | null;
  pixChave: string | null;
  pixNome: string | null;
  pixCidade: string | null;
}

export interface EstadoAcesso {
  senhaDefinida: boolean;
  autenticado: boolean;
  acessoLocal: boolean;
}

export interface Radio {
  id: number;
  nome: string;
  descricao: string | null;
  url: string;
  tocarAoAbrir: boolean;
}
