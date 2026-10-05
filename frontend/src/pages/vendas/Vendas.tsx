import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, nomesFormaPagamento, type FormaPagamento, type Pagina, type StatusVenda } from '@/lib/api';
import { formatarDataHora, formatarMoeda, formatarPlaca } from '@/lib/formato';
import { useBuscaNaUrl } from '@/lib/hooks';
import { Card } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { BadgeStatusVenda } from '@/components/ui/Badge';
import { Abas } from '@/components/ui/Abas';
import { Carregando, Erro, Vazio } from '@/components/ui/Estados';
import { Paginacao } from '@/components/ui/Paginacao';
import { CabecalhoPagina, CampoBusca, tdTabela, thTabela } from '@/components/ui/Pagina';

interface VendaLista {
  id: number;
  data: string;
  status: StatusVenda;
  formaPagamento: FormaPagamento | null;
  valorTotalCentavos: number;
  cliente: { nome: string } | null;
  veiculo: { placa: string; modelo: string } | null;
}

const abas: { valor: '' | StatusVenda; rotulo: string }[] = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'ABERTO', rotulo: 'Abertas' },
  { valor: 'CONCLUIDO', rotulo: 'A receber' },
  { valor: 'PAGO', rotulo: 'Pagas' },
  { valor: 'CANCELADO', rotulo: 'Canceladas' },
];

export function Vendas() {
  const { texto, setTexto, termo } = useBuscaNaUrl();
  const [status, setStatus] = useState<'' | StatusVenda>('');
  const [pagina, setPagina] = useState(1);
  const navigate = useNavigate();
  useEffect(() => setPagina(1), [termo, status]);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['vendas', 'lista', termo, status, pagina],
    queryFn: () => api<Pagina<VendaLista>>(`/vendas?busca=${encodeURIComponent(termo)}&status=${status}&pagina=${pagina}&porPagina=20`.replace('&status=&', '&')),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <CabecalhoPagina
        titulo="Vendas"
        subtitulo="Vendas de balcão e ordens de serviço."
        acoes={
          <Link to="/vendas/nova">
            <Botao icone={<Plus className="size-4" />}>Nova venda</Botao>
          </Link>
        }
      />
      <div className="mb-3 flex flex-col gap-2 md:flex-row">
        <CampoBusca valor={texto} onChange={setTexto} placeholder="Buscar por cliente, placa, item ou nº da venda…" />
        <Abas opcoes={abas} valor={status} onChange={setStatus} />
      </div>
      <Card>
        {isPending ? (
          <Carregando />
        ) : error ? (
          <Erro mensagem={error.message} onTentar={() => refetch()} />
        ) : data.itens.length === 0 ? (
          <Vazio texto="Nenhuma venda encontrada." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-borda">
                  <tr>
                    <th className={thTabela}>Nº</th>
                    <th className={`${thTabela} hidden sm:table-cell`}>Data</th>
                    <th className={thTabela}>Cliente</th>
                    <th className={`${thTabela} hidden md:table-cell`}>Veículo</th>
                    <th className={`${thTabela} hidden md:table-cell`}>Pagamento</th>
                    <th className={`${thTabela} text-right`}>Total</th>
                    <th className={`${thTabela} text-right`}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda/60">
                  {data.itens.map((v) => (
                    <tr key={v.id} onClick={() => navigate(`/vendas/${v.id}`)} className="cursor-pointer hover:bg-card-hover">
                      <td className={`${tdTabela} text-apagado`}>#{v.id}</td>
                      <td className={`${tdTabela} hidden text-xs whitespace-nowrap text-suave sm:table-cell`}>{formatarDataHora(v.data)}</td>
                      <td className={tdTabela}>
                        <span className="block text-texto">{v.cliente?.nome ?? 'Balcão'}</span>
                        <span className="text-[11px] text-apagado sm:hidden">{formatarDataHora(v.data)}</span>
                      </td>
                      <td className={`${tdTabela} hidden md:table-cell`}>
                        {v.veiculo ? (
                          <span className="whitespace-nowrap">
                            <span className="font-mono">{formatarPlaca(v.veiculo.placa)}</span> <span className="text-apagado">{v.veiculo.modelo}</span>
                          </span>
                        ) : (
                          <span className="text-apagado">—</span>
                        )}
                      </td>
                      <td className={`${tdTabela} hidden text-suave md:table-cell`}>{v.formaPagamento ? nomesFormaPagamento[v.formaPagamento] : '—'}</td>
                      <td className={`${tdTabela} text-right whitespace-nowrap`}>{formatarMoeda(v.valorTotalCentavos)}</td>
                      <td className={`${tdTabela} text-right`}>
                        <BadgeStatusVenda status={v.status} />
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
