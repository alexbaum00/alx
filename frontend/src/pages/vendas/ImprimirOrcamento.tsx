import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { api, type Empresa, type Orcamento } from '@/lib/api';
import { formatarMoeda, formatarPlaca, formatarQuantidade } from '@/lib/formato';
import { enderecoCompleto } from '@/lib/nota';
import { formatarDocumento } from '@/pages/cadastros/configs';
import { Carregando, Erro } from '@/components/ui/Estados';

const data = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

// Versão para papel (A4) do orçamento. Fica fora do layout do sistema: sem menu e sempre clara.
// Aberta com ?imprimir=1, chama a impressão sozinha assim que os dados carregam.
export function ImprimirOrcamento() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const orcamento = useQuery({ queryKey: ['orcamentos', 'detalhe', id], queryFn: () => api<Orcamento>(`/orcamentos/${id}`) });
  const empresa = useQuery({ queryKey: ['empresa'], queryFn: () => api<Empresa>('/empresa') });
  const jaImprimiu = useRef(false);
  const [logoPronto, setLogoPronto] = useState(false);

  // só imprime depois que o logo carregou, senão ele pode sair em branco no papel
  const pronto = orcamento.data && empresa.data && logoPronto;
  useEffect(() => {
    if (!pronto) return;
    document.title = `Orçamento ${orcamento.data!.id} - ${empresa.data!.nomeFantasia}`; // nome sugerido ao salvar PDF
    if (params.get('imprimir') === '1' && !jaImprimiu.current) {
      jaImprimiu.current = true;
      setTimeout(() => window.print(), 300);
    }
  }, [pronto, params, orcamento.data, empresa.data]);

  if (orcamento.isPending || empresa.isPending) return <Carregando />;
  if (orcamento.error) return <Erro mensagem={orcamento.error.message} />;
  if (empresa.error) return <Erro mensagem={empresa.error.message} />;

  const o = orcamento.data;
  const e = empresa.data;
  const cliente = o.cliente;
  const nomeCliente = cliente?.nome ?? o.nomeContato ?? '';
  const telefone = cliente?.telefone ?? o.telefoneContato;
  const veiculo = o.veiculo
    ? `${[o.veiculo.marca, o.veiculo.modelo, o.veiculo.ano].filter(Boolean).join(' ')} — placa ${formatarPlaca(o.veiculo.placa)}`
    : o.descricaoVeiculo;
  const enderecoOficina = enderecoCompleto({ ...e, complemento: null });

  return (
    <div className="impressao min-h-dvh bg-slate-300 py-6 print:bg-white print:py-0">
      {/* barra só na tela */}
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-2 px-4 print:hidden">
        <Link to={`/orcamentos/${o.id}`} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm text-slate-700 shadow hover:bg-slate-50">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-500">
          <Printer className="size-4" /> Imprimir ou salvar PDF
        </button>
      </div>

      <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-4 text-[12px] sm:p-[12mm] leading-snug text-slate-900 shadow-xl print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-orange-600 pb-4">
          <div className="flex items-center gap-3">
            <img src="/logo-alx.png" alt="ALX Serviços Automotivos" className="size-20 shrink-0" onLoad={() => setLogoPronto(true)} onError={() => setLogoPronto(true)} />
            <div className="space-y-0.5 text-[11px] text-slate-600">
              <p className="font-semibold text-slate-900">{e.razaoSocial || e.nomeFantasia}</p>
              {e.cnpj && <p>CNPJ {formatarDocumento(e.cnpj)}</p>}
              {enderecoOficina && <p>{enderecoOficina}</p>}
              {(e.telefone || e.email) && <p>{[e.telefone, e.email].filter(Boolean).join(' · ')}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tracking-wide text-slate-900">ORÇAMENTO</p>
            <p className="text-lg font-semibold text-orange-600">Nº {String(o.id).padStart(4, '0')}</p>
            <p className="mt-2 text-[11px] text-slate-600">Data: {data(o.data)}</p>
            {o.validadeAte && <p className="text-[11px] font-semibold text-slate-900">Válido até: {data(o.validadeAte)}</p>}
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-4 rounded-md border border-slate-300 p-3">
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Cliente</p>
            <p className="font-semibold">{nomeCliente}</p>
            {cliente?.cpfCnpj && <p>CPF/CNPJ: {formatarDocumento(cliente.cpfCnpj)}</p>}
            {telefone && <p>Telefone: {telefone}</p>}
            {cliente && enderecoCompleto(cliente) && <p>{enderecoCompleto(cliente)}</p>}
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Veículo</p>
            <p className="font-semibold">{veiculo || '—'}</p>
          </div>
        </section>

        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left text-[10px] tracking-wider text-slate-600 uppercase">
              <th className="border-b border-slate-300 px-2 py-1.5">Descrição</th>
              <th className="border-b border-slate-300 px-2 py-1.5">Tipo</th>
              <th className="border-b border-slate-300 px-2 py-1.5 text-right">Qtd.</th>
              <th className="border-b border-slate-300 px-2 py-1.5 text-right">Valor unit.</th>
              <th className="border-b border-slate-300 px-2 py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {o.itens.map((i) => (
              <tr key={i.id} className="break-inside-avoid">
                <td className="border-b border-slate-200 px-2 py-1.5">{i.descricao}</td>
                <td className="border-b border-slate-200 px-2 py-1.5 text-slate-600">{i.tipo === 'PRODUTO' ? 'Peça' : 'Serviço'}</td>
                <td className="border-b border-slate-200 px-2 py-1.5 text-right">{formatarQuantidade(i.quantidade)}</td>
                <td className="border-b border-slate-200 px-2 py-1.5 text-right whitespace-nowrap">{formatarMoeda(i.valorUnitarioCentavos)}</td>
                <td className="border-b border-slate-200 px-2 py-1.5 text-right font-medium whitespace-nowrap">{formatarMoeda(i.valorTotalCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-3 flex justify-end break-inside-avoid">
          <dl className="w-64 space-y-1">
            <Linha rotulo="Peças" valor={formatarMoeda(o.totalProdutosCentavos)} />
            <Linha rotulo="Serviços" valor={formatarMoeda(o.totalServicosCentavos)} />
            {o.descontoCentavos > 0 && <Linha rotulo="Desconto" valor={`− ${formatarMoeda(o.descontoCentavos)}`} />}
            <div className="flex justify-between border-t-2 border-slate-900 pt-1.5 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatarMoeda(o.valorTotalCentavos)}</dd>
            </div>
          </dl>
        </section>

        {o.observacoes && (
          <section className="mt-4 break-inside-avoid rounded-md border border-slate-300 p-3">
            <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Observações</p>
            <p className="whitespace-pre-wrap">{o.observacoes}</p>
          </section>
        )}

        {o.validadeAte && <p className="mt-4 text-[11px] text-slate-600">Valores válidos até {data(o.validadeAte)}.</p>}

        <footer className="mt-16 grid grid-cols-2 gap-10 break-inside-avoid text-center text-[11px] text-slate-600">
          <div className="border-t border-slate-400 pt-1">{nomeCliente || 'Cliente'}</div>
          <div className="border-t border-slate-400 pt-1">{e.nomeFantasia}</div>
        </footer>
      </article>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between text-slate-700">
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
