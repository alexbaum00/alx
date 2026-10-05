import { MessageCircle } from 'lucide-react';
import type { ConfigCadastro, Valores } from '@/components/cadastro/tipos';
import { Badge } from '@/components/ui/Badge';
import { IconeProduto } from '@/components/ui/IconeProduto';
import { buscarClientes, buscarFornecedores, buscarVeiculos } from '@/lib/buscas';
import { formatarMoeda, formatarPlaca, formatarQuantidade } from '@/lib/formato';

const ufs = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

export function formatarDocumento(doc: string | null | undefined) {
  if (!doc) return '';
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc;
}

// Link para conversar no WhatsApp (assume DDI 55 quando o número tem DDD)
export function linkWhatsApp(telefone: string | null | undefined) {
  const d = telefone?.replace(/\D/g, '') ?? '';
  if (d.length < 10) return null;
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
}

function Telefone({ telefone }: { telefone: unknown }) {
  const t = telefone as string | null;
  if (!t) return <span className="text-apagado">—</span>;
  const link = linkWhatsApp(t);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {t}
      {link && (
        <a href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-emerald-400 hover:text-emerald-300" aria-label="Abrir no WhatsApp">
          <MessageCircle className="size-4" />
        </a>
      )}
    </span>
  );
}

const s = (v: unknown) => (v as string | null) ?? '';

export const configClientes: ConfigCadastro = {
  chave: 'clientes',
  titulo: 'Clientes',
  subtitulo: 'Endereço completo é usado na cópia de dados para a nota fiscal.',
  singular: 'cliente',
  placeholderBusca: 'Buscar por nome, CPF/CNPJ, telefone ou placa…',
  campos: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largura: 'inteira' },
    { nome: 'cpfCnpj', rotulo: 'CPF ou CNPJ', tipo: 'texto', largura: 'metade', placeholder: 'Somente números ou com pontuação' },
    { nome: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'telefone', largura: 'metade', placeholder: '(11) 99999-0000' },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', largura: 'inteira' },
    { nome: 'cep', rotulo: 'CEP', tipo: 'texto', largura: 'terco' },
    { nome: 'endereco', rotulo: 'Endereço', tipo: 'texto', largura: 'inteira', placeholder: 'Rua, avenida…' },
    { nome: 'numero', rotulo: 'Número', tipo: 'texto', largura: 'terco' },
    { nome: 'complemento', rotulo: 'Complemento', tipo: 'texto', largura: 'terco' },
    { nome: 'bairro', rotulo: 'Bairro', tipo: 'texto', largura: 'terco' },
    { nome: 'cidade', rotulo: 'Cidade', tipo: 'texto', largura: 'metade' },
    { nome: 'uf', rotulo: 'UF', tipo: 'opcoes', largura: 'metade', opcoes: [{ valor: '', rotulo: '—' }, ...ufs.map((u) => ({ valor: u, rotulo: u }))] },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', largura: 'inteira' },
  ],
  colunas: [
    { titulo: 'Nome', render: (c) => <span className="font-medium text-white">{s(c.nome)}</span> },
    { titulo: 'Telefone', render: (c) => <Telefone telefone={c.telefone} /> },
    { titulo: 'CPF/CNPJ', render: (c) => <span className="whitespace-nowrap text-suave">{formatarDocumento(s(c.cpfCnpj)) || '—'}</span>, esconderNoCelular: true },
    {
      titulo: 'Veículos',
      esconderNoCelular: true,
      render: (c) => (
        <span className="font-mono text-xs text-suave">
          {(c.veiculos as { placa: string }[]).map((v) => formatarPlaca(v.placa)).join(', ') || '—'}
        </span>
      ),
    },
  ],
};

export const configVeiculos: ConfigCadastro = {
  chave: 'veiculos',
  titulo: 'Veículos',
  singular: 'veículo',
  placeholderBusca: 'Buscar por placa, modelo, marca ou cliente…',
  campos: [
    {
      nome: 'clienteId',
      rotulo: 'Cliente (dono)',
      tipo: 'relacao',
      obrigatorio: true,
      placeholder: 'Buscar cliente…',
      buscar: buscarClientes,
      relacaoInicial: (v) => {
        const c = v.cliente as { id: number; nome: string };
        return { id: c.id, rotulo: c.nome };
      },
    },
    { nome: 'placa', rotulo: 'Placa', tipo: 'placa', obrigatorio: true, largura: 'metade', placeholder: 'ABC1D23', ajuda: 'Antiga ou Mercosul' },
    { nome: 'marca', rotulo: 'Marca', tipo: 'texto', largura: 'metade', placeholder: 'VW, Fiat, GM…' },
    { nome: 'modelo', rotulo: 'Modelo', tipo: 'texto', obrigatorio: true, largura: 'metade', placeholder: 'Polo 1.6' },
    { nome: 'ano', rotulo: 'Ano', tipo: 'inteiro', largura: 'metade' },
    { nome: 'cor', rotulo: 'Cor', tipo: 'texto', largura: 'metade' },
    { nome: 'kmAtual', rotulo: 'KM atual', tipo: 'inteiro', largura: 'metade', ajuda: 'Atualizado sozinho ao lançar venda com KM' },
  ],
  colunas: [
    { titulo: 'Placa', render: (v) => <span className="font-mono font-medium whitespace-nowrap text-white">{formatarPlaca(s(v.placa))}</span> },
    { titulo: 'Modelo', render: (v) => [v.marca, v.modelo].filter(Boolean).join(' ') },
    { titulo: 'Cliente', render: (v) => (v.cliente as { nome: string }).nome },
    { titulo: 'Ano', render: (v) => s(String(v.ano ?? '')) || '—', esconderNoCelular: true },
    { titulo: 'KM', render: (v) => (v.kmAtual != null ? (v.kmAtual as number).toLocaleString('pt-BR') : '—'), classe: 'text-right', esconderNoCelular: true },
  ],
};

export const configFornecedores: ConfigCadastro = {
  chave: 'fornecedores',
  titulo: 'Fornecedores',
  singular: 'fornecedor',
  placeholderBusca: 'Buscar por nome, CNPJ ou produto fornecido…',
  campos: [
    { nome: 'razaoSocial', rotulo: 'Razão social', tipo: 'texto', obrigatorio: true },
    { nome: 'nomeFantasia', rotulo: 'Nome fantasia', tipo: 'texto', largura: 'metade' },
    { nome: 'cnpj', rotulo: 'CNPJ', tipo: 'texto', largura: 'metade' },
    { nome: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'telefone', largura: 'metade' },
    { nome: 'contato', rotulo: 'Pessoa de contato', tipo: 'texto', largura: 'metade' },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
    { nome: 'produtosFornecidos', rotulo: 'Produtos fornecidos', tipo: 'textarea', placeholder: 'Lâmpadas, relés, baterias…' },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea' },
  ],
  colunas: [
    {
      titulo: 'Fornecedor',
      render: (f) => (
        <span className="flex flex-col">
          <span className="font-medium text-white">{s(f.nomeFantasia) || s(f.razaoSocial)}</span>
          {Boolean(f.nomeFantasia) && <span className="text-xs text-apagado">{s(f.razaoSocial)}</span>}
        </span>
      ),
    },
    { titulo: 'Telefone', render: (f) => <Telefone telefone={f.telefone} /> },
    { titulo: 'Contato', render: (f) => s(f.contato) || '—', esconderNoCelular: true },
    { titulo: 'Produtos', render: (f) => <span className="text-suave">{(f._count as { produtos: number }).produtos}</span>, classe: 'text-right', esconderNoCelular: true },
  ],
};

const categorias = ['Lâmpadas', 'Relés', 'Fusíveis', 'Baterias', 'Cabos', 'Conectores', 'Alternador', 'Motor de partida', 'Som e acessórios', 'Chaves', 'Outros'];

export const configProdutos: ConfigCadastro = {
  chave: 'produtos',
  titulo: 'Produtos',
  subtitulo: 'Quantidade em estoque muda pela tela Estoque e pelas vendas.',
  singular: 'produto',
  placeholderBusca: 'Buscar por nome, código ou categoria…',
  parametrosLista: 'incluirInativos=true', // inativos aparecem riscados para poder reativar
  campos: [
    { nome: 'imagemId', rotulo: 'Foto', tipo: 'foto', ajuda: 'Aparece no lugar do ícone nas listas' },
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
    { nome: 'sku', rotulo: 'Código / código de barras', tipo: 'texto', largura: 'metade' },
    { nome: 'categoria', rotulo: 'Categoria', tipo: 'opcoes', largura: 'metade', opcoes: [{ valor: '', rotulo: '—' }, ...categorias.map((c) => ({ valor: c, rotulo: c }))] },
    {
      nome: 'unidade',
      rotulo: 'Unidade',
      tipo: 'opcoes',
      largura: 'terco',
      padrao: 'un',
      opcoes: [
        { valor: 'un', rotulo: 'Unidade (un)' },
        { valor: 'm', rotulo: 'Metro (m)' },
        { valor: 'par', rotulo: 'Par' },
        { valor: 'kit', rotulo: 'Kit' },
        { valor: 'cx', rotulo: 'Caixa (cx)' },
      ],
    },
    { nome: 'precoCustoCentavos', rotulo: 'Preço de custo', tipo: 'dinheiro', largura: 'terco' },
    { nome: 'precoVendaCentavos', rotulo: 'Preço de venda', tipo: 'dinheiro', largura: 'terco' },
    { nome: 'estoqueAtual', rotulo: 'Estoque inicial', tipo: 'numero', largura: 'metade', somenteNaCriacao: true, padrao: '0' },
    { nome: 'estoqueMinimo', rotulo: 'Estoque mínimo', tipo: 'numero', largura: 'metade', padrao: '0', ajuda: 'Abaixo disso aparece como “Baixo”' },
    {
      nome: 'fornecedorId',
      rotulo: 'Fornecedor',
      tipo: 'relacao',
      placeholder: 'Buscar fornecedor…',
      buscar: buscarFornecedores,
      relacaoInicial: (p) => {
        const f = p.fornecedor as { id: number; razaoSocial: string; nomeFantasia: string | null } | null;
        return f ? { id: f.id, rotulo: f.nomeFantasia || f.razaoSocial } : null;
      },
    },
    { nome: 'ativo', rotulo: 'Situação', tipo: 'booleano', placeholder: 'Ativo (aparece nas vendas)' },
  ],
  colunas: [
    {
      titulo: 'Produto',
      render: (p) => (
        <span className="flex items-center gap-3">
          <IconeProduto nome={s(p.nome)} categoria={p.categoria as string | null} imagemId={p.imagemId as string | null} tamanho="size-9" />
          <span className="flex flex-col">
            <span className={`font-medium ${p.ativo ? 'text-white' : 'text-apagado line-through'}`}>{s(p.nome)}</span>
            <span className="text-xs text-apagado">{[p.categoria, p.sku].filter(Boolean).join(' · ')}</span>
          </span>
        </span>
      ),
    },
    { titulo: 'Preço', render: (p) => <span className="whitespace-nowrap">{formatarMoeda(p.precoVendaCentavos as number)}</span>, classe: 'text-right' },
    {
      titulo: 'Estoque',
      classe: 'text-right',
      render: (p) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          {formatarQuantidade(p.estoqueAtual as number)} {s(p.unidade)}
          {p.estoqueBaixo ? <Badge cor="laranja">Baixo</Badge> : null}
        </span>
      ),
    },
    {
      titulo: 'Fornecedor',
      esconderNoCelular: true,
      render: (p) => {
        const f = p.fornecedor as { razaoSocial: string; nomeFantasia: string | null } | null;
        return <span className="text-suave">{f ? f.nomeFantasia || f.razaoSocial : '—'}</span>;
      },
    },
  ],
};

export const configServicos: ConfigCadastro = {
  chave: 'servicos',
  titulo: 'Serviços',
  subtitulo: 'Mão de obra com preço sugerido; o valor pode ser ajustado em cada venda.',
  singular: 'serviço',
  placeholderBusca: 'Buscar serviço…',
  campos: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, placeholder: 'Revisão elétrica' },
    { nome: 'precoCentavos', rotulo: 'Preço sugerido', tipo: 'dinheiro', largura: 'metade' },
    { nome: 'tempoEstimadoMin', rotulo: 'Tempo estimado (min)', tipo: 'inteiro', largura: 'metade' },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'textarea' },
    { nome: 'ativo', rotulo: 'Situação', tipo: 'booleano', placeholder: 'Ativo (aparece nas vendas)' },
  ],
  colunas: [
    { titulo: 'Serviço', render: (v) => <span className={`font-medium ${v.ativo ? 'text-white' : 'text-apagado line-through'}`}>{s(v.nome)}</span> },
    { titulo: 'Preço', render: (v) => formatarMoeda(v.precoCentavos as number), classe: 'text-right whitespace-nowrap' },
    { titulo: 'Tempo', render: (v) => (v.tempoEstimadoMin ? `${v.tempoEstimadoMin} min` : '—'), classe: 'text-right', esconderNoCelular: true },
  ],
};

export const configProcedimentos: ConfigCadastro = {
  chave: 'procedimentos',
  titulo: 'Procedimentos',
  singular: 'procedimento',
  placeholderBusca: '',
  campos: [
    { nome: 'modeloVeiculo', rotulo: 'Modelo do veículo', tipo: 'texto', obrigatorio: true, largura: 'metade', placeholder: 'VW Polo 1.6 2018' },
    {
      nome: 'veiculoId',
      rotulo: 'Veículo do cliente (opcional)',
      tipo: 'relacao',
      largura: 'metade',
      placeholder: 'Placa…',
      buscar: (t) => buscarVeiculos(t),
      relacaoInicial: (p) => {
        const v = p.veiculo as { id: number; placa: string; modelo: string } | null;
        return v ? { id: v.id, rotulo: `${formatarPlaca(v.placa)} · ${v.modelo}` } : null;
      },
    },
    { nome: 'defeitoReclamado', rotulo: 'Defeito reclamado', tipo: 'texto', obrigatorio: true },
    { nome: 'diagnosticoEncontrado', rotulo: 'Diagnóstico encontrado', tipo: 'textarea' },
    { nome: 'solucaoAplicada', rotulo: 'Solução aplicada', tipo: 'textarea' },
    { nome: 'esquemaEletricoAnotacoes', rotulo: 'Esquema elétrico / anotações', tipo: 'textarea', placeholder: 'Pinagem de chicote, cores de fio, códigos de erro, macetes…' },
    { nome: 'tags', rotulo: 'Palavras-chave', tipo: 'texto', placeholder: 'bateria, consumo parasita, rádio', ajuda: 'Separadas por vírgula' },
    { nome: 'imagens', rotulo: 'Fotos', tipo: 'fotos', ajuda: 'Chicote, conector, esquema… Tire na hora pelo celular ou escolha da galeria.' },
  ],
  colunas: [],
};

export type { Valores };
