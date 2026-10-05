import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api, type Orcamento } from '@/lib/api';
import { formatarPlaca } from '@/lib/formato';
import type { Relacao } from '@/components/cadastro/tipos';
import { Card } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { Campo, Input, Textarea } from '@/components/ui/Campos';
import { Carregando, Erro } from '@/components/ui/Estados';
import { useAviso } from '@/components/ui/Toast';
import { EditorItens, ResumoTotais, itensDoDocumento, itensParaApi, totalItem, validarItens, type ItemForm } from '@/components/vendas/EditorItens';
import { SecaoCliente } from '@/components/vendas/SecaoCliente';

const emDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso local
};

export function NovoOrcamento() {
  return <FormularioOrcamento orcamento={null} />;
}

export function EditarOrcamento() {
  const { id } = useParams();
  const { data, isPending, error } = useQuery({ queryKey: ['orcamentos', 'detalhe', id], queryFn: () => api<Orcamento>(`/orcamentos/${id}`) });
  if (isPending) return <Carregando />;
  if (error) return <Erro mensagem={error.message} />;
  return <FormularioOrcamento orcamento={data} />;
}

function FormularioOrcamento({ orcamento: o }: { orcamento: Orcamento | null }) {
  const editando = o != null;
  const [cliente, setCliente] = useState<Relacao | null>(o?.cliente ? { id: o.cliente.id, rotulo: o.cliente.nome } : null);
  const [veiculo, setVeiculo] = useState<Relacao | null>(o?.veiculo ? { id: o.veiculo.id, rotulo: `${formatarPlaca(o.veiculo.placa)} · ${o.veiculo.modelo}` } : null);
  const [contato, setContato] = useState({ nome: o?.nomeContato ?? '', telefone: o?.telefoneContato ?? '', veiculo: o?.descricaoVeiculo ?? '' });
  const [validade, setValidade] = useState(o?.validadeAte ? new Date(o.validadeAte).toLocaleDateString('sv-SE') : emDias(7));
  const [itens, setItens] = useState<ItemForm[]>(o ? itensDoDocumento(o.itens) : []);
  const [desconto, setDesconto] = useState(o?.descontoCentavos ?? 0);
  const [observacoes, setObservacoes] = useState(o?.observacoes ?? '');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const avisar = useAviso();

  const salvar = useMutation({
    mutationFn: () =>
      api<Orcamento>(editando ? `/orcamentos/${o.id}` : '/orcamentos', {
        method: editando ? 'PUT' : 'POST',
        body: JSON.stringify({
          clienteId: cliente?.id ?? null,
          veiculoId: veiculo?.id ?? null,
          nomeContato: cliente ? null : contato.nome,
          telefoneContato: cliente ? null : contato.telefone,
          descricaoVeiculo: veiculo ? null : contato.veiculo,
          validadeAte: validade || null,
          descontoCentavos: desconto,
          observacoes,
          itens: itensParaApi(itens),
        }),
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      avisar(editando ? 'Orçamento atualizado.' : `Orçamento #${r.id} criado.`);
      navigate(`/orcamentos/${r.id}`, { replace: editando });
    },
    onError: (e) => avisar(e.message, 'erro'),
  });

  const enviar = () => {
    if (!cliente && !contato.nome.trim()) return avisar('Escolha um cliente ou informe o nome do contato.', 'erro');
    const problema = validarItens(itens);
    if (problema) return avisar(problema, 'erro');
    if (itens.reduce((t, i) => t + totalItem(i), 0) - desconto < 0) return avisar('O desconto é maior que o valor dos itens.', 'erro');
    salvar.mutate();
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-bold text-white">{editando ? `Editar orçamento #${o.id}` : 'Novo orçamento'}</h1>
          <p className="text-sm text-suave">Não mexe no estoque nem entra no faturamento. Se o cliente aprovar, vira venda com um clique.</p>
        </div>
        <Card className="space-y-4 p-4">
          <SecaoCliente cliente={cliente} veiculo={veiculo} onCliente={setCliente} onVeiculo={setVeiculo} rotuloSemCliente="Opcional: quem ainda não é cliente pode ser só um contato" />
          {!cliente && (
            <div className="grid grid-cols-1 gap-4 border-t border-borda pt-4 sm:grid-cols-3">
              <Campo rotulo="Nome do contato" obrigatorio>
                <Input value={contato.nome} onChange={(e) => setContato({ ...contato, nome: e.target.value })} />
              </Campo>
              <Campo rotulo="Telefone / WhatsApp">
                <Input inputMode="tel" value={contato.telefone} onChange={(e) => setContato({ ...contato, telefone: e.target.value })} />
              </Campo>
              <Campo rotulo="Veículo">
                <Input value={contato.veiculo} onChange={(e) => setContato({ ...contato, veiculo: e.target.value })} placeholder="Civic 2015" />
              </Campo>
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold text-white">Peças e serviços</h2>
          <EditorItens itens={itens} onChange={setItens} avisarEstoque={false} />
        </Card>
        <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
          <Campo rotulo="Válido até">
            <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2">
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Prazo de execução, garantia, condições…" />
          </Campo>
        </Card>
      </div>
      <div className="lg:pt-12">
        <Card className="space-y-4 p-4 lg:sticky lg:top-20">
          <ResumoTotais itens={itens} desconto={desconto} onDesconto={setDesconto} />
          <Botao className="h-12 w-full text-base" icone={<Save className="size-5" />} carregando={salvar.isPending} onClick={enviar}>
            {editando ? 'Salvar alterações' : 'Salvar orçamento'}
          </Botao>
        </Card>
      </div>
    </div>
  );
}
