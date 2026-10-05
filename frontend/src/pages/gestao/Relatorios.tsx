import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatarMoeda, formatarQuantidade } from '@/lib/formato';
import { Card, CardHeader } from '@/components/ui/Card';
import { Carregando, Erro, Vazio } from '@/components/ui/Estados';
import { CabecalhoPagina, tdTabela, thTabela } from '@/components/ui/Pagina';
import { SeletorMes, limitesDoMes, mesAtual } from '@/components/ui/Periodo';

interface Ranking {
  descricao: string;
  quantidade: number;
  totalCentavos: number;
}

interface RelatorioVendas {
  totalCentavos: number;
  vendas: number;
  ticketMedioCentavos: number;
  produtosCentavos: number;
  servicosCentavos: number;
  descontosCentavos: number;
  porDia: { dia: string; totalCentavos: number; vendas: number }[];
  topProdutos: Ranking[];
  topServicos: Ranking[];
}

export function Relatorios() {
  const [mes, setMes] = useState(mesAtual);
  const { de, ate } = limitesDoMes(mes);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['vendas', 'relatorio', de],
    queryFn: () => api<RelatorioVendas>(`/relatorios/vendas?de=${de}&ate=${ate}`),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <CabecalhoPagina titulo="Relatórios" subtitulo="Vendas do mês, sem as canceladas." acoes={<SeletorMes valor={mes} onChange={setMes} />} />
      {isPending ? (
        <Carregando />
      ) : error ? (
        <Erro mensagem={error.message} onTentar={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Numero titulo="Faturamento" valor={formatarMoeda(data.totalCentavos)} detalhe={data.descontosCentavos ? `${formatarMoeda(data.descontosCentavos)} em descontos` : 'sem descontos'} />
            <Numero titulo="Vendas" valor={String(data.vendas)} detalhe="no período" />
            <Numero titulo="Ticket médio" valor={formatarMoeda(data.ticketMedioCentavos)} detalhe="por venda" />
            <Numero
              titulo="Serviços × peças"
              valor={data.totalCentavos ? `${Math.round((data.servicosCentavos / (data.servicosCentavos + data.produtosCentavos || 1)) * 100)}% serviços` : '—'}
              detalhe={`${formatarMoeda(data.servicosCentavos)} · ${formatarMoeda(data.produtosCentavos)}`}
            />
          </div>
          <GraficoDias dias={data.porDia} mes={mes} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TabelaRanking titulo="Peças mais vendidas" itens={data.topProdutos} />
            <TabelaRanking titulo="Serviços mais feitos" itens={data.topServicos} />
          </div>
        </div>
      )}
    </div>
  );
}

function Numero({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-suave">{titulo}</p>
      <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{valor}</p>
      <p className="mt-1 truncate text-xs text-apagado">{detalhe}</p>
    </Card>
  );
}

// Uma série só (faturamento por dia): barras finas com topo arredondado, sem legenda.
function GraficoDias({ dias, mes }: { dias: RelatorioVendas['porDia']; mes: { ano: number; mes: number } }) {
  const [foco, setFoco] = useState<number | null>(null);
  const totalDias = new Date(mes.ano, mes.mes + 1, 0).getDate();
  const porDia = new Map(dias.map((d) => [Number(d.dia.slice(8)), d]));
  const serie = Array.from({ length: totalDias }, (_, i) => ({ dia: i + 1, totalCentavos: porDia.get(i + 1)?.totalCentavos ?? 0, vendas: porDia.get(i + 1)?.vendas ?? 0 }));
  const maximo = Math.max(...serie.map((d) => d.totalCentavos), 1);
  const linhas = [1, 0.5];
  const atual = foco != null ? serie[foco - 1] : null;

  return (
    <Card>
      <CardHeader titulo="Faturamento por dia" />
      {dias.length === 0 ? (
        <Vazio texto="Nenhuma venda no período." />
      ) : (
        <div className="px-4 pb-4">
          <p className="mb-2 h-5 text-sm text-suave" aria-live="polite">
            {atual ? (
              <>
                Dia {atual.dia}: <strong className="text-white">{formatarMoeda(atual.totalCentavos)}</strong> · {atual.vendas} venda{atual.vendas === 1 ? '' : 's'}
              </>
            ) : (
              'Passe o mouse ou toque numa barra para ver o valor.'
            )}
          </p>
          <div className="relative h-48" onMouseLeave={() => setFoco(null)}>
            {linhas.map((l) => (
              <div key={l} className="pointer-events-none absolute inset-x-0 border-t border-borda/60" style={{ bottom: `${l * 100}%` }}>
                <span className="absolute -top-2 right-0 bg-card pl-1 text-[10px] text-apagado">{formatarMoeda(Math.round(maximo * l))}</span>
              </div>
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px] border-b border-borda">
              {serie.map((d) => (
                <button
                  key={d.dia}
                  type="button"
                  onMouseEnter={() => setFoco(d.dia)}
                  onFocus={() => setFoco(d.dia)}
                  onClick={() => setFoco(d.dia)}
                  aria-label={`Dia ${d.dia}: ${formatarMoeda(d.totalCentavos)}`}
                  className="group flex h-full min-w-0 flex-1 items-end"
                >
                  <span
                    className={`w-full rounded-t-[4px] transition-colors ${foco === d.dia ? 'bg-laranja' : 'bg-laranja-escuro'}`}
                    style={{ height: d.totalCentavos ? `max(2px, ${(d.totalCentavos / maximo) * 100}%)` : 0 }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-apagado">
            <span>1</span>
            <span>{Math.ceil(totalDias / 2)}</span>
            <span>{totalDias}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function TabelaRanking({ titulo, itens }: { titulo: string; itens: Ranking[] }) {
  return (
    <Card>
      <CardHeader titulo={titulo} />
      {itens.length === 0 ? (
        <Vazio texto="Nada no período." />
      ) : (
        <table className="w-full">
          <thead className="border-y border-borda">
            <tr>
              <th className={thTabela}>Item</th>
              <th className={`${thTabela} text-right`}>Qtd.</th>
              <th className={`${thTabela} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda/60">
            {itens.map((i, n) => (
              <tr key={i.descricao}>
                <td className={tdTabela}>
                  <span className="mr-2 text-xs text-apagado">{n + 1}.</span>
                  {i.descricao}
                </td>
                <td className={`${tdTabela} text-right text-suave`}>{formatarQuantidade(i.quantidade)}</td>
                <td className={`${tdTabela} text-right whitespace-nowrap`}>{formatarMoeda(i.totalCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
