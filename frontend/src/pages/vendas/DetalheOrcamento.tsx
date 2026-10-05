import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Copy, MessageCircle, Pencil, Printer, RotateCcw, ShoppingCart, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { api, type Empresa, type FormaPagamento, type Orcamento, type Venda } from '@/lib/api';
import { formatarDataHora } from '@/lib/formato';
import { copiarTexto } from '@/lib/copiar';
import { textoParaCliente } from '@/lib/nota';
import { Card } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { BadgeStatusOrcamento } from '@/components/ui/Badge';
import { Carregando, Erro } from '@/components/ui/Estados';
import { Modal } from '@/components/ui/Modal';
import { Confirmar } from '@/components/ui/Confirmar';
import { useAviso } from '@/components/ui/Toast';
import { DadosCliente, ItensDocumento } from '@/components/vendas/Documento';
import { FormasPagamento } from '@/components/vendas/FormasPagamento';
import { linkWhatsApp } from '@/pages/cadastros/configs';
import { orcamentoVencido } from './Orcamentos';

export function DetalheOrcamento() {
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const avisar = useAviso();
  const [converter, setConverter] = useState(false);
  const [receberJa, setReceberJa] = useState(false);
  const [forma, setForma] = useState<FormaPagamento | null>('PIX');
  const [excluir, setExcluir] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const { data: o, isPending, error } = useQuery({ queryKey: ['orcamentos', 'detalhe', id], queryFn: () => api<Orcamento>(`/orcamentos/${id}`) });
  const { data: empresa } = useQuery({ queryKey: ['empresa'], queryFn: () => api<Empresa>('/empresa') });

  const atualizar = (novo: Orcamento) => {
    qc.setQueryData(['orcamentos', 'detalhe', id], novo);
    qc.invalidateQueries({ queryKey: ['orcamentos'] });
  };

  const status = useMutation({
    mutationFn: (s: 'PENDENTE' | 'APROVADO' | 'RECUSADO') => api<Orcamento>(`/orcamentos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: s }) }),
    onSuccess: atualizar,
    onError: (e) => avisar(e.message, 'erro'),
  });

  const conversao = useMutation({
    mutationFn: () =>
      api<Venda>(`/orcamentos/${id}/converter`, {
        method: 'POST',
        body: JSON.stringify(receberJa ? { status: 'PAGO', formaPagamento: forma } : { status: 'ABERTO' }),
      }),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      qc.invalidateQueries({ queryKey: ['vendas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['produtos'] });
      avisar(`Orçamento convertido na venda #${v.id}.`);
      navigate(`/vendas/${v.id}`);
    },
    onError: (e) => avisar(e.message, 'erro'),
  });

  const exclusao = useMutation({
    mutationFn: () => api(`/orcamentos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      avisar('Orçamento excluído.');
      navigate('/orcamentos', { replace: true });
    },
    onError: (e) => avisar(e.message, 'erro'),
  });

  if (isPending) return <Carregando />;
  if (error) return <Erro mensagem={error.message} />;

  const aberto = o.status !== 'CONVERTIDO';
  const telefone = o.cliente?.telefone ?? o.telefoneContato;
  const wa = linkWhatsApp(telefone);
  const mensagem = textoParaCliente(o, 'orcamento', empresa);

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/orcamentos" className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-white">
        <ArrowLeft className="size-4" /> Orçamentos
      </Link>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            Orçamento #{o.id} <BadgeStatusOrcamento status={o.status} vencido={orcamentoVencido(o)} />
          </h1>
          <p className="text-sm text-suave">
            {formatarDataHora(o.data)}
            {o.validadeAte && ` · válido até ${new Date(o.validadeAte).toLocaleDateString('pt-BR')}`}
            {o.venda && (
              <>
                {' · '}
                <Link to={`/vendas/${o.venda.id}`} className="text-sky-400 hover:underline">
                  venda #{o.venda.id}
                </Link>
              </>
            )}
          </p>
        </div>
        {aberto && (
          <div className="flex flex-wrap gap-2">
            <Link to={`/orcamentos/${o.id}/editar`}>
              <Botao variante="secundario" icone={<Pencil className="size-4" />}>
                Editar
              </Botao>
            </Link>
            {o.status === 'PENDENTE' && (
              <>
                <Botao variante="secundario" icone={<ThumbsDown className="size-4" />} onClick={() => status.mutate('RECUSADO')}>
                  Recusado
                </Botao>
                <Botao variante="secundario" icone={<ThumbsUp className="size-4" />} onClick={() => status.mutate('APROVADO')}>
                  Aprovado
                </Botao>
              </>
            )}
            {o.status === 'RECUSADO' ? (
              <Botao variante="secundario" icone={<RotateCcw className="size-4" />} onClick={() => status.mutate('PENDENTE')}>
                Reabrir
              </Botao>
            ) : (
              <Botao variante="sucesso" icone={<ShoppingCart className="size-4" />} onClick={() => setConverter(true)}>
                Converter em venda
              </Botao>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <DadosCliente
          cliente={o.cliente}
          veiculo={o.veiculo}
          extra={
            <>
              <p className="font-medium text-white">{o.nomeContato}</p>
              <p className="text-sm text-suave">{[o.telefoneContato, o.descricaoVeiculo].filter(Boolean).join(' · ')}</p>
              <p className="text-xs text-apagado">Contato sem cadastro</p>
            </>
          }
        />
        <ItensDocumento itens={o.itens} desconto={o.descontoCentavos} produtos={o.totalProdutosCentavos} servicos={o.totalServicosCentavos} total={o.valorTotalCentavos} />
        {o.observacoes && (
          <Card className="p-4">
            <p className="mb-1 text-xs text-apagado">Observações</p>
            <p className="text-sm whitespace-pre-wrap text-texto">{o.observacoes}</p>
          </Card>
        )}
        <div className="flex flex-wrap gap-2">
          <Link to={`/orcamentos/${o.id}/imprimir?imprimir=1`}>
            <Botao variante="secundario" icone={<Printer className="size-4" />}>
              Imprimir
            </Botao>
          </Link>
          {wa && (
            <a href={`${wa}?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noreferrer">
              <Botao variante="secundario" icone={<MessageCircle className="size-4 text-emerald-400" />}>
                Enviar pelo WhatsApp
              </Botao>
            </a>
          )}
          <Botao
            variante="secundario"
            icone={copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            onClick={async () => {
              if (await copiarTexto(mensagem)) {
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1500);
              } else avisar('Não foi possível copiar neste navegador.', 'erro');
            }}
          >
            {copiado ? 'Copiado!' : 'Copiar texto'}
          </Botao>
          {aberto && (
            <Botao variante="perigo" icone={<Trash2 className="size-4" />} onClick={() => setExcluir(true)} className="ml-auto">
              Excluir
            </Botao>
          )}
        </div>
      </div>

      <Modal
        aberto={converter}
        onFechar={() => setConverter(false)}
        titulo="Converter em venda"
        largura="max-w-md"
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setConverter(false)}>
              Voltar
            </Botao>
            <Botao variante="sucesso" carregando={conversao.isPending} disabled={receberJa && !forma} onClick={() => conversao.mutate()}>
              {receberJa ? 'Criar venda paga' : 'Abrir ordem de serviço'}
            </Botao>
          </>
        }
      >
        <p className="mb-3 text-sm text-suave">A venda usa os preços deste orçamento, mesmo que o cadastro tenha mudado.</p>
        <label className="mb-3 flex items-center gap-2 text-sm text-texto">
          <input type="checkbox" checked={receberJa} onChange={(e) => setReceberJa(e.target.checked)} className="size-4 accent-orange-500" />
          Cliente já pagou
        </label>
        {receberJa && <FormasPagamento valor={forma} onChange={setForma} />}
      </Modal>

      <Confirmar
        aberto={excluir}
        titulo={`Excluir orçamento #${o.id}?`}
        mensagem="Esta ação não pode ser desfeita."
        textoConfirmar="Excluir"
        perigo
        carregando={exclusao.isPending}
        onConfirmar={() => exclusao.mutate()}
        onCancelar={() => setExcluir(false)}
      />
    </div>
  );
}
