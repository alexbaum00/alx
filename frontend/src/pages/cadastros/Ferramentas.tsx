import { useQuery } from '@tanstack/react-query';
import { Hammer } from 'lucide-react';
import { api } from '@/lib/api';
import { formatarMoeda } from '@/lib/formato';
import { urlImagem } from '@/lib/imagens';
import { PaginaCadastro } from '@/components/cadastro/PaginaCadastro';
import type { ConfigCadastro } from '@/components/cadastro/tipos';
import { Card } from '@/components/ui/Card';
import { Badge, type CorBadge } from '@/components/ui/Badge';

interface Resumo {
  totalCentavos: number;
  cadastradas: number;
  unidades: number;
  emManutencao: number;
  emGarantia: number;
  porCategoria: { categoria: string; itens: number; totalCentavos: number }[];
}

const categorias = ['Diagnóstico', 'Medição', 'Elétricas', 'Manuais', 'Bancada', 'Solda', 'Segurança', 'Outras'];
const estados: Record<string, [string, CorBadge]> = {
  NOVA: ['Nova', 'azul'],
  BOA: ['Boa', 'verde'],
  MANUTENCAO: ['Manutenção', 'amarelo'],
  DESCARTADA: ['Descartada', 'cinza'],
};

const s = (v: unknown) => (v as string | null) ?? '';

const config: ConfigCadastro = {
  chave: 'ferramentas',
  titulo: 'Ferramentas',
  subtitulo: 'Equipamentos da oficina e quanto já foi investido neles.',
  singular: 'ferramenta',
  feminino: true,
  placeholderBusca: 'Buscar por nome, marca, categoria, nº de série ou local…',
  campos: [
    { nome: 'imagemId', rotulo: 'Foto', tipo: 'foto' },
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, placeholder: 'Scanner automotivo' },
    { nome: 'marca', rotulo: 'Marca', tipo: 'texto', largura: 'terco' },
    { nome: 'modelo', rotulo: 'Modelo', tipo: 'texto', largura: 'terco' },
    { nome: 'categoria', rotulo: 'Categoria', tipo: 'opcoes', largura: 'terco', opcoes: [{ valor: '', rotulo: '—' }, ...categorias.map((c) => ({ valor: c, rotulo: c }))] },
    { nome: 'valorCompraCentavos', rotulo: 'Valor pago (unidade)', tipo: 'dinheiro', largura: 'terco' },
    { nome: 'quantidade', rotulo: 'Quantidade', tipo: 'inteiro', largura: 'terco', padrao: '1' },
    {
      nome: 'estado',
      rotulo: 'Estado',
      tipo: 'opcoes',
      largura: 'terco',
      padrao: 'BOA',
      opcoes: Object.entries(estados).map(([valor, [rotulo]]) => ({ valor, rotulo })),
    },
    { nome: 'dataCompra', rotulo: 'Data da compra', tipo: 'data', largura: 'terco' },
    { nome: 'ondeComprou', rotulo: 'Onde comprou', tipo: 'texto', largura: 'terco' },
    { nome: 'garantiaAte', rotulo: 'Garantia até', tipo: 'data', largura: 'terco' },
    { nome: 'numeroSerie', rotulo: 'Nº de série', tipo: 'texto', largura: 'metade' },
    { nome: 'localizacao', rotulo: 'Onde fica', tipo: 'texto', largura: 'metade', placeholder: 'Bancada, gaveta 2…' },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea' },
  ],
  colunas: [
    {
      titulo: 'Ferramenta',
      render: (f) => (
        <span className="flex items-center gap-3">
          {f.imagemId ? (
            <img src={urlImagem(s(f.imagemId))} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg bg-white object-cover ring-1 ring-borda" />
          ) : (
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
              <Hammer className="size-4 text-suave" />
            </span>
          )}
          <span className="flex flex-col">
            <span className="font-medium text-white">
              {s(f.nome)}
              {(f.quantidade as number) > 1 && <span className="ml-1.5 text-xs font-normal text-suave">× {f.quantidade as number}</span>}
            </span>
            <span className="text-xs text-apagado">{[f.marca, f.modelo].filter(Boolean).join(' ') || s(f.categoria)}</span>
          </span>
        </span>
      ),
    },
    { titulo: 'Categoria', render: (f) => <span className="text-suave">{s(f.categoria) || '—'}</span>, esconderNoCelular: true },
    { titulo: 'Local', render: (f) => <span className="text-suave">{s(f.localizacao) || '—'}</span>, esconderNoCelular: true },
    {
      titulo: 'Investido',
      classe: 'text-right whitespace-nowrap',
      render: (f) => formatarMoeda((f.valorCompraCentavos as number) * (f.quantidade as number)),
    },
    {
      titulo: 'Estado',
      classe: 'text-right',
      esconderNoCelular: true,
      render: (f) => {
        const [rotulo, cor] = estados[s(f.estado)] ?? ['—', 'cinza'];
        return <Badge cor={cor}>{rotulo}</Badge>;
      },
    },
  ],
};

export function Ferramentas({ novo }: { novo?: boolean }) {
  const { data } = useQuery({ queryKey: ['ferramentas', 'resumo'], queryFn: () => api<Resumo>('/ferramentas/resumo') });
  const maior = Math.max(1, ...(data?.porCategoria.map((c) => c.totalCentavos) ?? [1]));

  const resumo = data && (
    <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1">
        <Card className="col-span-2 p-4 lg:col-span-1">
          <p className="text-sm text-suave">Total investido</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatarMoeda(data.totalCentavos)}</p>
          <p className="mt-1 text-xs text-apagado">
            {data.cadastradas} ferramenta{data.cadastradas === 1 ? '' : 's'} · {data.unidades} unidade{data.unidades === 1 ? '' : 's'} (sem as descartadas)
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-suave">Em manutenção</p>
          <p className="mt-1 text-xl font-bold text-white">{data.emManutencao}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-suave">Na garantia</p>
          <p className="mt-1 text-xl font-bold text-white">{data.emGarantia}</p>
        </Card>
      </div>
      <Card className="p-4 lg:col-span-2">
        <p className="mb-3 text-sm font-medium text-white">Investimento por categoria</p>
        {data.porCategoria.length === 0 ? (
          <p className="text-sm text-apagado">Cadastre suas ferramentas para ver o resumo.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.porCategoria.map((c) => (
              <li key={c.categoria}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-texto">
                    {c.categoria} <span className="text-xs text-apagado">({c.itens})</span>
                  </span>
                  <span className="text-texto">{formatarMoeda(c.totalCentavos)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-laranja-escuro" style={{ width: `${(c.totalCentavos / maior) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );

  return <PaginaCadastro config={config} abrirNovo={novo} acima={resumo} />;
}
