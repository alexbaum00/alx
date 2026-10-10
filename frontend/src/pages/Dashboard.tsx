import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Car,
  ChartColumn,
  Ellipsis,
  FilePlus,
  FileText,
  PackagePlus,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { api, type DashboardStats } from '@/lib/api';
import { formatarDataHora, formatarMoeda, formatarPlaca, formatarQuantidade } from '@/lib/formato';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, BadgeStatusVenda } from '@/components/ui/Badge';
import { Carregando, Erro, Vazio } from '@/components/ui/Estados';
import { IconeProduto } from '@/components/ui/IconeProduto';

export function Dashboard() {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardStats>('/dashboard/stats'),
    refetchInterval: 60_000,
  });

  if (isPending) return <Carregando texto="Carregando painel…" />;
  if (error) return <Erro mensagem={`Não foi possível carregar o painel: ${error.message}`} onTentar={() => refetch()} />;

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        <Metrica icone={ShoppingCart} cor="bg-emerald-600" titulo="Vendas Hoje" valor={formatarMoeda(data.vendasHoje.totalCentavos)} detalhe={`${data.vendasHoje.atendimentos} atendimento${data.vendasHoje.atendimentos === 1 ? '' : 's'}`} />
        <Metrica icone={Box} cor="bg-blue-600" titulo="Produtos Vendidos" valor={formatarQuantidade(data.produtosVendidosHoje)} detalhe="Itens" />
        <Metrica icone={Wrench} cor="bg-laranja-escuro" titulo="Serviços" valor={String(data.servicosHoje)} detalhe="Realizados" />
        <Metrica icone={TriangleAlert} cor="bg-red-600" titulo="Estoque Baixo" valor={String(data.estoqueBaixo)} detalhe="Produtos" para="/estoque?estoqueBaixo=true" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <VendasRecentes vendas={data.vendasRecentes} />
        <ProdutosEstoque produtos={data.produtosEstoque} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Atalhos />
        <VeiculosRecentes veiculos={data.veiculosRecentes} />
      </div>

      <Banner />
    </div>
  );
}

function Metrica({ icone: Icone, cor, titulo, valor, detalhe, para }: { icone: LucideIcon; cor: string; titulo: string; valor: string; detalhe: string; para?: string }) {
  const conteudo = (
    <Card className="h-full p-4 transition-colors hover:bg-card-hover">
      <span className={`mb-3 inline-flex size-11 items-center justify-center rounded-xl shadow-lg shadow-black/30 ${cor}`}>
        <Icone className="size-5 text-white" />
      </span>
      <p className="text-sm text-slate-200 sm:text-[15px]">{titulo}</p>
      <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{valor}</p>
      <p className="mt-1 text-xs text-apagado">{detalhe}</p>
    </Card>
  );
  return para ? <Link to={para}>{conteudo}</Link> : conteudo;
}

const th = 'px-4 pb-2 text-left text-xs font-medium text-suave';
const td = 'px-4 py-2.5 text-sm';

function VendasRecentes({ vendas }: { vendas: DashboardStats['vendasRecentes'] }) {
  return (
    <Card>
      <CardHeader titulo="Vendas Recentes" link={{ para: '/vendas', texto: 'Ver todas' }} />
      {vendas.length === 0 ? (
        <Vazio texto="Nenhuma venda registrada ainda." />
      ) : (
        <div className="overflow-x-auto pb-2">
          <table className="w-full">
            <thead>
              <tr>
                <th className={`${th} hidden sm:table-cell`}>Data</th>
                <th className={th}>Cliente</th>
                <th className={`${th} text-right`}>Valor</th>
                <th className={`${th} text-right`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda/60">
              {vendas.map((v) => (
                <tr key={v.id} className="hover:bg-card-hover">
                  <td className={`${td} hidden whitespace-nowrap text-xs text-suave sm:table-cell`}>{formatarDataHora(v.data)}</td>
                  <td className={`${td} max-w-36`}>
                    <span className="block truncate">{v.cliente?.nome ?? 'Balcão'}</span>
                    <span className="block text-[11px] text-apagado sm:hidden">{formatarDataHora(v.data)}</span>
                  </td>
                  <td className={`${td} text-right whitespace-nowrap`}>{formatarMoeda(v.valorTotalCentavos)}</td>
                  <td className={`${td} text-right`}>
                    <BadgeStatusVenda status={v.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ProdutosEstoque({ produtos }: { produtos: DashboardStats['produtosEstoque'] }) {
  return (
    <Card>
      <CardHeader titulo="Produtos em Estoque" link={{ para: '/estoque', texto: 'Ver todos' }} />
      {produtos.length === 0 ? (
        <Vazio texto="Nenhum produto cadastrado." />
      ) : (
        <div className="overflow-x-auto pb-2">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Produto</th>
                <th className={`${th} text-right`}>Qtd.</th>
                <th className={`${th} text-right`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda/60">
              {produtos.map((p) => (
                <tr key={p.id} className="hover:bg-card-hover">
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <IconeProduto categoria={p.categoria} nome={p.nome} imagemId={p.imagemId} />
                      <span className="truncate">{p.nome}</span>
                    </span>
                  </td>
                  <td className={`${td} text-right whitespace-nowrap`}>
                    {formatarQuantidade(p.estoqueAtual)}
                    {p.unidade !== 'un' && <span className="ml-1 text-xs text-apagado">{p.unidade}</span>}
                  </td>
                  <td className={`${td} text-right`}>{p.estoqueBaixo ? <Badge cor="laranja">Baixo</Badge> : <Badge cor="verde">OK</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

const atalhos: { rotulo: string; para: string; icone: LucideIcon; destaque?: boolean; dica?: string }[] = [
  { rotulo: 'Nova Venda', para: '/vendas/nova', icone: ShoppingCart, destaque: true, dica: 'F2' },
  { rotulo: 'Novo Orçamento', para: '/orcamentos/novo', icone: FileText },
  { rotulo: 'Cadastrar Cliente', para: '/cadastros/clientes/novo', icone: UserPlus },
  { rotulo: 'Adicionar Produto', para: '/cadastros/produtos/novo', icone: PackagePlus },
  { rotulo: 'Registrar Serviço', para: '/cadastros/servicos/novo', icone: Wrench },
  { rotulo: 'Entrada no Estoque', para: '/estoque/entrada', icone: FilePlus },
  { rotulo: 'Relatório de Vendas', para: '/relatorios', icone: ChartColumn },
  { rotulo: 'Mais Opções', para: '/cadastros', icone: Ellipsis },
];

function Atalhos() {
  return (
    <Card>
      <CardHeader titulo="Atalhos" />
      <div className="grid grid-cols-4 gap-2 px-4 pb-4 sm:gap-3">
        {atalhos.map(({ rotulo, para, icone: Icone, destaque, dica }) => (
          <Link
            key={para}
            to={para}
            className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border p-1 text-center transition-colors ${
              destaque ? 'border-laranja/60 bg-laranja-escuro text-white shadow-lg shadow-orange-950/40 hover:bg-laranja' : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <Icone className="size-5 sm:size-6" />
            <span className="text-[10px] leading-tight sm:text-xs">{rotulo}</span>
            {dica && <span className="hidden text-[9px] opacity-70 lg:block">({dica})</span>}
          </Link>
        ))}
      </div>
    </Card>
  );
}

function VeiculosRecentes({ veiculos }: { veiculos: DashboardStats['veiculosRecentes'] }) {
  return (
    <Card>
      <CardHeader titulo="Veículos Recentes" link={{ para: '/cadastros/veiculos', texto: 'Ver todos' }} />
      {veiculos.length === 0 ? (
        <Vazio texto="Nenhum veículo atendido ainda." />
      ) : (
        <div className="overflow-x-auto pb-2">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Placa</th>
                <th className={th}>Modelo</th>
                <th className={th}>Serviço</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda/60">
              {veiculos.map((v) => (
                <tr key={v.id} className="hover:bg-card-hover">
                  <td className={`${td} font-mono whitespace-nowrap`}>{formatarPlaca(v.placa)}</td>
                  <td className={`${td} whitespace-nowrap`}>{[v.marca, v.modelo].filter(Boolean).join(' ')}</td>
                  <td className={`${td} text-suave`}>{v.servico ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Banner() {
  return (
    <Card className="relative flex items-center gap-4 overflow-hidden bg-gradient-to-r from-card via-card to-orange-950/40 p-5">
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-laranja-escuro/20 ring-1 ring-laranja/40">
        <ShieldCheck className="size-7 text-laranja" />
      </span>
      <div className="relative z-10">
        <p className="text-lg font-semibold text-white">Qualidade e confiança</p>
        <p className="text-sm text-suave">Seu veículo em boas mãos.</p>
      </div>
      <Car className="pointer-events-none absolute -bottom-8 -right-6 size-40 text-laranja/10 sm:right-8" strokeWidth={1.25} />
    </Card>
  );
}
