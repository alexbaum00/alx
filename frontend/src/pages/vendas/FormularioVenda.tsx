import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, ClipboardList, Save } from 'lucide-react';
import { api, type FormaPagamento, type StatusVenda, type Venda } from '@/lib/api';
import { formatarPlaca } from '@/lib/formato';
import type { Relacao } from '@/components/cadastro/tipos';
import { Card } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { Campo, Input, Textarea } from '@/components/ui/Campos';
import { Carregando, Erro } from '@/components/ui/Estados';
import { useAviso } from '@/components/ui/Toast';
import { EditorItens, ResumoTotais, itensDoDocumento, itensParaApi, totalItem, validarItens, type ItemForm } from '@/components/vendas/EditorItens';
import { SecaoCliente } from '@/components/vendas/SecaoCliente';
import { FormasPagamento } from '@/components/vendas/FormasPagamento';
import { QrPix } from '@/components/vendas/PixVenda';

export function NovaVenda() {
  return <FormularioVenda venda={null} />;
}

export function EditarVenda() {
  const { id } = useParams();
  const { data, isPending, error } = useQuery({ queryKey: ['vendas', 'detalhe', id], queryFn: () => api<Venda>(`/vendas/${id}`) });
  if (isPending) return <Carregando />;
  if (error) return <Erro mensagem={error.message} />;
  return <FormularioVenda venda={data} />;
}

function FormularioVenda({ venda }: { venda: Venda | null }) {
  const editando = venda != null;
  const [cliente, setCliente] = useState<Relacao | null>(venda?.cliente ? { id: venda.cliente.id, rotulo: venda.cliente.nome } : null);
  const [veiculo, setVeiculo] = useState<Relacao | null>(
    venda?.veiculo ? { id: venda.veiculo.id, rotulo: `${formatarPlaca(venda.veiculo.placa)} · ${[venda.veiculo.marca, venda.veiculo.modelo].filter(Boolean).join(' ')}` } : null,
  );
  const [km, setKm] = useState(venda?.kmEntrada != null ? String(venda.kmEntrada) : '');
  const [itens, setItens] = useState<ItemForm[]>(venda ? itensDoDocumento(venda.itens) : []);
  const [desconto, setDesconto] = useState(venda?.descontoCentavos ?? 0);
  const [observacoes, setObservacoes] = useState(venda?.observacoes ?? '');
  const [forma, setForma] = useState<FormaPagamento | null>(venda?.formaPagamento ?? 'PIX');
  const total = itens.reduce((t, i) => t + totalItem(i), 0) - desconto;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const avisar = useAviso();

  const salvar = useMutation({
    mutationFn: (status: Exclude<StatusVenda, 'CANCELADO'>) => {
      const corpo = {
        clienteId: cliente?.id ?? null,
        veiculoId: veiculo?.id ?? null,
        kmEntrada: km ? Number(km) : null,
        descontoCentavos: desconto,
        observacoes,
        itens: itensParaApi(itens),
        ...(editando ? {} : { status, formaPagamento: status === 'PAGO' ? forma : null }),
      };
      return api<Venda>(editando ? `/vendas/${venda.id}` : '/vendas', { method: editando ? 'PUT' : 'POST', body: JSON.stringify(corpo) });
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['vendas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['produtos'] });
      avisar(editando ? 'Venda atualizada.' : v.status === 'PAGO' ? `Venda #${v.id} finalizada.` : `Ordem de serviço #${v.id} aberta.`);
      navigate(`/vendas/${v.id}`, { replace: editando });
    },
    onError: (e) => avisar(e.message, 'erro'),
  });

  const enviar = (status: Exclude<StatusVenda, 'CANCELADO'>) => {
    const problema = validarItens(itens);
    if (problema) return avisar(problema, 'erro');
    if (total < 0) return avisar('O desconto é maior que o valor dos itens.', 'erro');
    if (status === 'PAGO' && !forma) return avisar('Escolha a forma de pagamento.', 'erro');
    salvar.mutate(status);
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h1 className="text-2xl font-bold text-white">{editando ? `Editar venda #${venda.id}` : 'Nova venda'}</h1>
        <Card className="space-y-4 p-4">
          <SecaoCliente cliente={cliente} veiculo={veiculo} onCliente={setCliente} onVeiculo={setVeiculo} />
          {veiculo && (
            <Campo rotulo="KM na entrada" className="sm:w-1/2">
              <Input inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ''))} placeholder="Ex.: 54000" />
            </Campo>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold text-white">Peças e serviços</h2>
          <EditorItens itens={itens} onChange={setItens} />
        </Card>
        <Card className="p-4">
          <Campo rotulo="Observações">
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Defeito relatado, combinado com o cliente…" />
          </Campo>
        </Card>
      </div>

      <div className="lg:pt-12">
        <Card className="space-y-4 p-4 lg:sticky lg:top-20">
          <ResumoTotais itens={itens} desconto={desconto} onDesconto={setDesconto} />
          {editando ? (
            <Botao className="w-full" icone={<Save className="size-4" />} carregando={salvar.isPending} onClick={() => enviar('ABERTO')}>
              Salvar alterações
            </Botao>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-medium text-suave">Forma de pagamento</p>
                <FormasPagamento valor={forma} onChange={setForma} />
              </div>
              {forma === 'PIX' && total > 0 && (
                <div className="rounded-xl border border-borda bg-slate-950/30 p-3">
                  <QrPix valorCentavos={total} compacto />
                  <p className="mt-2 text-center text-xs text-apagado">Mostre ao cliente. Depois de conferir o Pix no app do banco, clique em Finalizar e receber.</p>
                </div>
              )}
              <Botao variante="sucesso" className="h-12 w-full text-base" icone={<CircleCheck className="size-5" />} carregando={salvar.isPending && salvar.variables === 'PAGO'} onClick={() => enviar('PAGO')}>
                Finalizar e receber
              </Botao>
              <Botao variante="secundario" className="w-full" icone={<ClipboardList className="size-4" />} carregando={salvar.isPending && salvar.variables === 'ABERTO'} onClick={() => enviar('ABERTO')}>
                Abrir ordem de serviço
              </Botao>
              <ul className="space-y-1 text-xs text-apagado">
                <li>
                  <span className="text-suave">Finalizar e receber:</span> o cliente já pagou. A venda fica paga e as peças saem do estoque.
                </li>
                <li>
                  <span className="text-suave">Abrir ordem de serviço:</span> o carro fica na oficina. Você conclui e recebe depois, na tela da venda.
                </li>
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
