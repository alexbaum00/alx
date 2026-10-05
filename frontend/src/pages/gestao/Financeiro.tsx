import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, nomesFormaPagamento, type FormaPagamento, type Pagina } from '@/lib/api';
import { formatarMoeda } from '@/lib/formato';
import type { ConfigCadastro, Valores } from '@/components/cadastro/tipos';
import { FormularioCadastro } from '@/components/cadastro/FormularioCadastro';
import { Card, CardHeader } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { Badge } from '@/components/ui/Badge';
import { Carregando, Erro, Vazio } from '@/components/ui/Estados';
import { CabecalhoPagina, tdTabela, thTabela } from '@/components/ui/Pagina';
import { SeletorMes, limitesDoMes, mesAtual } from '@/components/ui/Periodo';

interface Resumo {
  entradasCentavos: number;
  vendasPagas: number;
  porFormaPagamento: { formaPagamento: FormaPagamento | null; totalCentavos: number; quantidade: number }[];
  aReceberCentavos: number;
  vendasAReceber: number;
  despesasPagasCentavos: number;
  despesasPendentesCentavos: number;
  saldoCentavos: number;
}

interface Despesa {
  id: number;
  descricao: string;
  categoria: string | null;
  valorCentavos: number;
  data: string;
  pago: boolean;
}

const categoriasDespesa = ['DAS-MEI', 'Aluguel', 'Energia', 'Água', 'Internet/telefone', 'Fornecedor', 'Ferramentas', 'Combustível', 'Outros'];

const configDespesas: ConfigCadastro = {
  chave: 'despesas',
  titulo: 'Despesas',
  singular: 'despesa',
  feminino: true,
  placeholderBusca: '',
  colunas: [],
  invalidar: ['vendas'], // o resumo financeiro fica sob a chave 'vendas'
  campos: [
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true, placeholder: 'Conta de energia de outubro' },
    { nome: 'categoria', rotulo: 'Categoria', tipo: 'opcoes', largura: 'metade', opcoes: [{ valor: '', rotulo: '—' }, ...categoriasDespesa.map((c) => ({ valor: c, rotulo: c }))] },
    { nome: 'valorCentavos', rotulo: 'Valor', tipo: 'dinheiro', obrigatorio: true, largura: 'metade' },
    { nome: 'data', rotulo: 'Data', tipo: 'data', largura: 'metade', padrao: 'hoje' },
    { nome: 'pago', rotulo: 'Situação', tipo: 'booleano', largura: 'metade', placeholder: 'Já foi paga' },
  ],
};

export function Financeiro() {
  const [mes, setMes] = useState(mesAtual);
  const [formulario, setFormulario] = useState<{ item: Valores | null } | null>(null);
  const { de, ate } = limitesDoMes(mes);

  const resumo = useQuery({ queryKey: ['vendas', 'financeiro', de], queryFn: () => api<Resumo>(`/relatorios/financeiro?de=${de}&ate=${ate}`) });
  const despesas = useQuery({ queryKey: ['despesas', de], queryFn: () => api<Pagina<Despesa>>(`/despesas?de=${de}&ate=${ate}&porPagina=100`) });

  return (
    <div className="mx-auto max-w-6xl">
      <CabecalhoPagina titulo="Financeiro" subtitulo="Entradas das vendas pagas menos as despesas pagas." acoes={<SeletorMes valor={mes} onChange={setMes} />} />

      {resumo.isPending ? (
        <Carregando />
      ) : resumo.error ? (
        <Erro mensagem={resumo.error.message} onTentar={() => resumo.refetch()} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador titulo="Entradas" valor={resumo.data.entradasCentavos} detalhe={`${resumo.data.vendasPagas} vendas pagas`} cor="text-emerald-400" />
            <Indicador titulo="A receber" valor={resumo.data.aReceberCentavos} detalhe={`${resumo.data.vendasAReceber} em aberto ou concluídas`} cor="text-amber-300" />
            <Indicador titulo="Despesas pagas" valor={resumo.data.despesasPagasCentavos} detalhe={resumo.data.despesasPendentesCentavos ? `${formatarMoeda(resumo.data.despesasPendentesCentavos)} pendentes` : 'nenhuma pendente'} cor="text-red-300" />
            <Indicador titulo="Saldo" valor={resumo.data.saldoCentavos} detalhe="entradas − despesas pagas" cor={resumo.data.saldoCentavos >= 0 ? 'text-white' : 'text-red-400'} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader titulo="Entradas por forma de pagamento" />
              {resumo.data.porFormaPagamento.length === 0 ? (
                <Vazio texto="Nenhuma venda paga no mês." />
              ) : (
                <ul className="space-y-3 px-4 pb-4">
                  {resumo.data.porFormaPagamento.map((f) => {
                    const pct = resumo.data.entradasCentavos ? (f.totalCentavos / resumo.data.entradasCentavos) * 100 : 0;
                    return (
                      <li key={f.formaPagamento ?? 'outro'}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-texto">
                            {f.formaPagamento ? nomesFormaPagamento[f.formaPagamento] : 'Não informado'} <span className="text-xs text-apagado">({f.quantidade})</span>
                          </span>
                          <span className="text-texto">{formatarMoeda(f.totalCentavos)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800">
                          <div className="h-2 rounded-full bg-laranja-escuro" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <h2 className="text-[15px] font-semibold text-white">Despesas do mês</h2>
                <Botao tamanho="sm" icone={<Plus className="size-3.5" />} onClick={() => setFormulario({ item: null })}>
                  Nova despesa
                </Botao>
              </div>
              {despesas.isPending ? (
                <Carregando />
              ) : !despesas.data?.itens.length ? (
                <Vazio texto="Nenhuma despesa lançada no mês." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-y border-borda">
                      <tr>
                        <th className={thTabela}>Descrição</th>
                        <th className={`${thTabela} hidden sm:table-cell`}>Data</th>
                        <th className={`${thTabela} text-right`}>Valor</th>
                        <th className={`${thTabela} text-right`}>Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borda/60">
                      {despesas.data.itens.map((d) => (
                        <tr key={d.id} onClick={() => setFormulario({ item: d as unknown as Valores })} className="cursor-pointer hover:bg-card-hover">
                          <td className={tdTabela}>
                            <span className="block text-texto">{d.descricao}</span>
                            <span className="text-xs text-apagado">{d.categoria}</span>
                          </td>
                          <td className={`${tdTabela} hidden text-suave sm:table-cell`}>{new Date(d.data).toLocaleDateString('pt-BR')}</td>
                          <td className={`${tdTabela} text-right whitespace-nowrap`}>{formatarMoeda(d.valorCentavos)}</td>
                          <td className={`${tdTabela} text-right`}>{d.pago ? <Badge cor="verde">Paga</Badge> : <Badge cor="amarelo">Pendente</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {formulario && (
        <FormularioCadastro
          key={(formulario.item?.id as number) ?? 'nova'}
          config={configDespesas}
          item={formulario.item}
          onFechar={() => setFormulario(null)}
        />
      )}
    </div>
  );
}

function Indicador({ titulo, valor, detalhe, cor }: { titulo: string; valor: number; detalhe: string; cor: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-suave">{titulo}</p>
      <p className={`mt-1 text-xl font-bold sm:text-2xl ${cor}`}>{formatarMoeda(valor)}</p>
      <p className="mt-1 text-xs text-apagado">{detalhe}</p>
    </Card>
  );
}
