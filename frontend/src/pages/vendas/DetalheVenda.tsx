import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, CircleCheck, HandCoins, MessageCircle, Pencil } from 'lucide-react';
import { api, nomesFormaPagamento, type Empresa, type FormaPagamento, type StatusVenda, type Venda } from '@/lib/api';
import { formatarDataHora } from '@/lib/formato';
import { textoParaCliente } from '@/lib/nota';
import { Card } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { BadgeStatusVenda } from '@/components/ui/Badge';
import { Carregando, Erro } from '@/components/ui/Estados';
import { Modal } from '@/components/ui/Modal';
import { Confirmar } from '@/components/ui/Confirmar';
import { useAviso } from '@/components/ui/Toast';
import { DadosCliente, ItensDocumento } from '@/components/vendas/Documento';
import { FormasPagamento } from '@/components/vendas/FormasPagamento';
import { PainelNota } from '@/components/vendas/PainelNota';
import { CartaoPix, QrPix } from '@/components/vendas/PixVenda';
import { linkWhatsApp } from '@/pages/cadastros/configs';

export function DetalheVenda() {
  const { id } = useParams();
  const qc = useQueryClient();
  const avisar = useAviso();
  const [receber, setReceber] = useState(false);
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [cancelar, setCancelar] = useState(false);

  const { data: venda, isPending, error } = useQuery({ queryKey: ['vendas', 'detalhe', id], queryFn: () => api<Venda>(`/vendas/${id}`) });
  const { data: empresa } = useQuery({ queryKey: ['empresa'], queryFn: () => api<Empresa>('/empresa') });

  const status = useMutation({
    mutationFn: (corpo: { status: StatusVenda; formaPagamento?: FormaPagamento | null }) => api<Venda>(`/vendas/${id}/status`, { method: 'PATCH', body: JSON.stringify(corpo) }),
    onSuccess: (v) => {
      qc.setQueryData(['vendas', 'detalhe', id], v);
      qc.invalidateQueries({ queryKey: ['vendas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['produtos'] });
      setReceber(false);
      setCancelar(false);
      avisar({ PAGO: 'Pagamento registrado.', CONCLUIDO: 'Serviço concluído.', CANCELADO: 'Venda cancelada; peças devolvidas ao estoque.', ABERTO: 'Venda reaberta.' }[v.status]);
    },
    onError: (e) => {
      setCancelar(false);
      avisar(e.message, 'erro');
    },
  });

  if (isPending) return <Carregando />;
  if (error) return <Erro mensagem={error.message} />;

  const ativa = venda.status !== 'CANCELADO';
  const editavel = venda.status === 'ABERTO' || venda.status === 'CONCLUIDO';
  const wa = linkWhatsApp(venda.cliente?.telefone);

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/vendas" className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-white">
        <ArrowLeft className="size-4" /> Vendas
      </Link>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            Venda #{venda.id} <BadgeStatusVenda status={venda.status} />
          </h1>
          <p className="text-sm text-suave">
            {formatarDataHora(venda.data)}
            {venda.formaPagamento && ` · ${nomesFormaPagamento[venda.formaPagamento]}`}
            {venda.orcamento && (
              <>
                {' · '}
                <Link to={`/orcamentos/${venda.orcamento.id}`} className="text-sky-400 hover:underline">
                  do orçamento #{venda.orcamento.id}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editavel && (
            <Link to={`/vendas/${venda.id}/editar`}>
              <Botao variante="secundario" icone={<Pencil className="size-4" />}>
                Editar
              </Botao>
            </Link>
          )}
          {venda.status === 'ABERTO' && (
            <Botao variante="secundario" icone={<CircleCheck className="size-4" />} carregando={status.isPending && status.variables?.status === 'CONCLUIDO'} onClick={() => status.mutate({ status: 'CONCLUIDO' })}>
              Concluir serviço
            </Botao>
          )}
          {editavel && (
            <Botao
              variante="sucesso"
              icone={<HandCoins className="size-4" />}
              onClick={() => {
                setForma(venda.formaPagamento ?? 'PIX');
                setReceber(true);
              }}
            >
              Receber pagamento
            </Botao>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <DadosCliente cliente={venda.cliente} veiculo={venda.veiculo} km={venda.kmEntrada} />
          <ItensDocumento itens={venda.itens} desconto={venda.descontoCentavos} produtos={venda.totalProdutosCentavos} servicos={venda.totalServicosCentavos} total={venda.valorTotalCentavos} />
          {venda.observacoes && (
            <Card className="p-4">
              <p className="mb-1 text-xs text-apagado">Observações</p>
              <p className="text-sm whitespace-pre-wrap text-texto">{venda.observacoes}</p>
            </Card>
          )}
          <div className="flex flex-wrap gap-2">
            {wa && (
              <a href={`${wa}?text=${encodeURIComponent(textoParaCliente(venda, 'venda', empresa))}`} target="_blank" rel="noreferrer">
                <Botao variante="secundario" icone={<MessageCircle className="size-4 text-emerald-400" />}>
                  Enviar resumo pelo WhatsApp
                </Botao>
              </a>
            )}
            {ativa && (
              <Botao variante="perigo" icone={<Ban className="size-4" />} onClick={() => setCancelar(true)} className="ml-auto">
                Cancelar venda
              </Botao>
            )}
          </div>
        </div>
        <div className="space-y-4 lg:col-span-2">
          {editavel && venda.valorTotalCentavos > 0 && <CartaoPix vendaId={venda.id} valorCentavos={venda.valorTotalCentavos} />}
          {ativa && <PainelNota venda={venda} empresa={empresa} />}
        </div>
      </div>

      <Modal
        aberto={receber}
        onFechar={() => setReceber(false)}
        titulo="Receber pagamento"
        largura="max-w-md"
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setReceber(false)}>
              Voltar
            </Botao>
            <Botao variante="sucesso" carregando={status.isPending} disabled={!forma} onClick={() => status.mutate({ status: 'PAGO', formaPagamento: forma })}>
              Confirmar recebimento
            </Botao>
          </>
        }
      >
        <p className="mb-3 text-sm text-suave">
          {venda.status === 'ABERTO' ? 'As peças saem do estoque ao confirmar.' : 'Escolha como o cliente pagou.'}
        </p>
        <FormasPagamento valor={forma} onChange={setForma} />
        {forma === 'PIX' && venda.valorTotalCentavos > 0 && (
          <div className="mt-4 border-t border-borda pt-4">
            <QrPix vendaId={venda.id} valorCentavos={venda.valorTotalCentavos} />
            <p className="mt-3 text-center text-xs text-apagado">Confira o Pix no app do banco antes de confirmar.</p>
          </div>
        )}
      </Modal>

      <Confirmar
        aberto={cancelar}
        titulo={`Cancelar venda #${venda.id}?`}
        mensagem={venda.estoqueBaixado ? 'As peças voltam para o estoque. A venda cancelada não pode ser reaberta.' : 'A venda cancelada não pode ser reaberta.'}
        textoConfirmar="Cancelar venda"
        perigo
        carregando={status.isPending}
        onConfirmar={() => status.mutate({ status: 'CANCELADO' })}
        onCancelar={() => setCancelar(false)}
      />
    </div>
  );
}
