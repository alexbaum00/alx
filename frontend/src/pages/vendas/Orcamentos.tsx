import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, type Pagina, type StatusOrcamento } from '@/lib/api';
import { formatarDataHora, formatarMoeda, formatarPlaca } from '@/lib/formato';
import { useBuscaNaUrl } from '@/lib/hooks';
import { Card } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { BadgeStatusOrcamento } from '@/components/ui/Badge';
import { Abas } from '@/components/ui/Abas';
import { Carregando, Erro, Vazio } from '@/components/ui/Estados';
import { Paginacao } from '@/components/ui/Paginacao';
import { CabecalhoPagina, CampoBusca, tdTabela, thTabela } from '@/components/ui/Pagina';

interface OrcamentoLista {
  id: number;
  data: string;
  status: StatusOrcamento;
  validadeAte: string | null;
  valorTotalCentavos: number;
  nomeContato: string | null;
  descricaoVeiculo: string | null;
  cliente: { nome: string } | null;
  veiculo: { placa: string; modelo: string } | null;
}

export const orcamentoVencido = (o: { status: StatusOrcamento; validadeAte: string | null }) =>
  o.status === 'PENDENTE' && o.validadeAte != null && new Date(o.validadeAte) < new Date(new Date().toDateString());

const abas: { valor: '' | StatusOrcamento; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'PENDENTE', rotulo: 'Pendentes' },
  { valor: 'APROVADO', rotulo: 'Aprovados' },
  { valor: 'CONVERTIDO', rotulo: 'Viraram venda' },
  { valor: 'RECUSADO', rotulo: 'Recusados' },
];

export function Orcamentos() {
  const { texto, setTexto, termo } = useBuscaNaUrl();
  const [status, setStatus] = useState<'' | StatusOrcamento>('');
  const [pagina, setPagina] = useState(1);
  const navigate = useNavigate();
  useEffect(() => setPagina(1), [termo, status]);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['orcamentos', 'lista', termo, status, pagina],
    queryFn: () => api<Pagina<OrcamentoLista>>(`/orcamentos?busca=${encodeURIComponent(termo)}${status ? `&status=${status}` : ''}&pagina=${pagina}&porPagina=20`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <CabecalhoPagina
        titulo="Orçamentos"
        subtitulo="Para quem pede preço antes de fechar. Vendas não dependem de orçamento."
        acoes={
          <Link to="/orcamentos/novo">
            <Botao icone={<Plus className="size-4" />}>Novo orçamento</Botao>
          </Link>
        }
      />
      <div className="mb-3 flex flex-col gap-2 md:flex-row">
        <CampoBusca valor={texto} onChange={setTexto} placeholder="Buscar por cliente, contato ou veículo…" />
        <Abas opcoes={abas} valor={status} onChange={setStatus} />
      </div>
      <Card>
        {isPending ? (
          <Carregando />
        ) : error ? (
          <Erro mensagem={error.message} onTentar={() => refetch()} />
        ) : data.itens.length === 0 ? (
          <Vazio texto="Nenhum orçamento encontrado." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-borda">
                  <tr>
                    <th className={thTabela}>Nº</th>
                    <th className={thTabela}>Cliente</th>
                    <th className={`${thTabela} hidden md:table-cell`}>Veículo</th>
                    <th className={`${thTabela} hidden sm:table-cell`}>Validade</th>
                    <th className={`${thTabela} text-right`}>Total</th>
                    <th className={`${thTabela} text-right`}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda/60">
                  {data.itens.map((o) => (
                    <tr key={o.id} onClick={() => navigate(`/orcamentos/${o.id}`)} className="cursor-pointer hover:bg-card-hover">
                      <td className={`${tdTabela} text-apagado`}>#{o.id}</td>
                      <td className={tdTabela}>
                        <span className="block text-texto">{o.cliente?.nome ?? o.nomeContato}</span>
                        <span className="text-[11px] text-apagado">{formatarDataHora(o.data)}</span>
                      </td>
                      <td className={`${tdTabela} hidden md:table-cell`}>
                        {o.veiculo ? (
                          <span className="whitespace-nowrap">
                            <span className="font-mono">{formatarPlaca(o.veiculo.placa)}</span> <span className="text-apagado">{o.veiculo.modelo}</span>
                          </span>
                        ) : (
                          <span className="text-suave">{o.descricaoVeiculo ?? '—'}</span>
                        )}
                      </td>
                      <td className={`${tdTabela} hidden text-suave sm:table-cell`}>{o.validadeAte ? new Date(o.validadeAte).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className={`${tdTabela} text-right whitespace-nowrap`}>{formatarMoeda(o.valorTotalCentavos)}</td>
                      <td className={`${tdTabela} text-right`}>
                        <BadgeStatusOrcamento status={o.status} vencido={orcamentoVencido(o)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao pagina={pagina} porPagina={20} total={data.total} onMudar={setPagina} />
          </>
        )}
      </Card>
    </div>
  );
}
