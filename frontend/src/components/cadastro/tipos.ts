import type { ReactNode } from 'react';

export type Valores = Record<string, unknown>;

export interface Relacao {
  id: number;
  rotulo: string;
  detalhe?: string;
}

export type TipoCampo =
  | 'texto'
  | 'email'
  | 'telefone'
  | 'textarea'
  | 'uf'
  | 'placa'
  | 'inteiro'
  | 'numero'
  | 'dinheiro'
  | 'booleano'
  | 'data'
  | 'foto'
  | 'fotos'
  | 'opcoes'
  | 'relacao';

export interface CampoDef {
  nome: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio?: boolean;
  ajuda?: string;
  placeholder?: string;
  largura?: 'inteira' | 'metade' | 'terco';
  opcoes?: { valor: string; rotulo: string }[];
  somenteNaCriacao?: boolean;
  // tipo 'relacao': como buscar e como montar o valor inicial a partir do registro
  buscar?: (termo: string) => Promise<Relacao[]>;
  relacaoInicial?: (item: Valores) => Relacao | null;
  padrao?: unknown;
}

export interface ColunaDef {
  titulo: string;
  render: (item: Valores) => ReactNode;
  classe?: string;
  esconderNoCelular?: boolean;
}

export interface ConfigCadastro {
  chave: string; // queryKey e caminho da API: /clientes
  titulo: string;
  subtitulo?: string;
  singular: string; // "cliente"
  feminino?: boolean;
  campos: CampoDef[];
  colunas: ColunaDef[];
  placeholderBusca: string;
  porPagina?: number;
  invalidar?: string[]; // outras consultas que dependem deste cadastro
  parametrosLista?: string; // ex.: "incluirInativos=true"
}
