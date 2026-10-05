// Categorias de serviço e a cor de cada bloco. As classes ficam escritas por extenso
// para o Tailwind incluí-las no CSS final.
export type CategoriaServico = 'ELETRICA' | 'PELICULA' | 'SOM' | 'CHAVE' | 'OUTROS';

export interface EstiloCategoria {
  valor: CategoriaServico;
  rotulo: string;
  bloco: string; // borda e fundo do bloco
  cabecalho: string; // faixa do título
  titulo: string; // cor do nome da categoria
  marcador: string; // bolinha/etiqueta
}

export const categoriasServico: EstiloCategoria[] = [
  {
    valor: 'ELETRICA',
    rotulo: 'Elétrica',
    bloco: 'border-yellow-400/40 bg-yellow-950/20',
    cabecalho: 'bg-yellow-400/15 border-yellow-400/30',
    titulo: 'text-yellow-300',
    marcador: 'bg-yellow-400',
  },
  {
    valor: 'PELICULA',
    rotulo: 'Película',
    bloco: 'border-zinc-400/40 bg-zinc-800/30',
    cabecalho: 'bg-zinc-500/20 border-zinc-400/30',
    titulo: 'text-zinc-200',
    marcador: 'bg-zinc-400',
  },
  {
    valor: 'SOM',
    rotulo: 'Som',
    bloco: 'border-violet-400/40 bg-violet-950/25',
    cabecalho: 'bg-violet-500/20 border-violet-400/30',
    titulo: 'text-violet-300',
    marcador: 'bg-violet-400',
  },
  {
    valor: 'CHAVE',
    rotulo: 'Chave',
    bloco: 'border-red-400/40 bg-red-950/25',
    cabecalho: 'bg-red-500/20 border-red-400/30',
    titulo: 'text-red-300',
    marcador: 'bg-red-400',
  },
  {
    valor: 'OUTROS',
    rotulo: 'Outros',
    bloco: 'border-neutral-700 bg-black',
    cabecalho: 'bg-neutral-900 border-neutral-700',
    titulo: 'text-neutral-200',
    marcador: 'bg-neutral-500',
  },
];

export const estiloCategoria = (valor: string | null | undefined) =>
  categoriasServico.find((c) => c.valor === valor) ?? categoriasServico[categoriasServico.length - 1];
