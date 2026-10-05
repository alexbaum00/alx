import type { ClienteCompleto, Empresa, Orcamento, Venda } from './api';
import { formatarDataHora, formatarMoeda, formatarPlaca, formatarQuantidade } from './formato';
import { formatarDocumento } from '@/pages/cadastros/configs';

export function enderecoCompleto(c: Pick<ClienteCompleto, 'endereco' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'uf' | 'cep'>) {
  const rua = [c.endereco, c.numero].filter(Boolean).join(', ');
  const cidade = [c.cidade, c.uf].filter(Boolean).join('/');
  const cep = c.cep ? `CEP ${c.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}` : '';
  return [rua, c.complemento, c.bairro, cidade, cep].filter(Boolean).join(' - ');
}

const veiculoTexto = (v: Venda['veiculo']) => (v ? `${[v.marca, v.modelo].filter(Boolean).join(' ')} placa ${formatarPlaca(v.placa)}` : '');

// Texto pronto para preencher a "Descrição do serviço" no Emissor Nacional.
export function descricaoServicos(venda: Venda) {
  const servicos = venda.itens.filter((i) => i.tipo === 'SERVICO').map((i) => (i.quantidade !== 1 ? `${formatarQuantidade(i.quantidade)}x ${i.descricao}` : i.descricao));
  const veiculo = veiculoTexto(venda.veiculo);
  return `Serviços automotivos: ${servicos.join('; ') || '—'}.${veiculo ? ` Veículo ${veiculo}.` : ''}`;
}

// "1.234,56" — formato que os campos de valor dos emissores aceitam
const valorSemSimbolo = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface CampoNota {
  rotulo: string;
  valor: string;
}

// Campos que o formulário do governo pede, cada um com botão de copiar.
export function camposNota(venda: Venda): CampoNota[] {
  const c = venda.cliente;
  const campos: CampoNota[] = [
    { rotulo: 'CPF/CNPJ do tomador', valor: formatarDocumento(c?.cpfCnpj) },
    { rotulo: 'Nome do tomador', valor: c?.nome ?? '' },
    { rotulo: 'Endereço', valor: c ? enderecoCompleto(c) : '' },
    { rotulo: 'E-mail', valor: c?.email ?? '' },
    { rotulo: 'Telefone', valor: c?.telefone ?? '' },
    { rotulo: 'Descrição do serviço', valor: venda.totalServicosCentavos ? descricaoServicos(venda) : '' },
    { rotulo: 'Valor dos serviços', valor: venda.totalServicosCentavos ? valorSemSimbolo(venda.totalServicosCentavos) : '' },
    { rotulo: 'Valor das peças', valor: venda.totalProdutosCentavos ? valorSemSimbolo(venda.totalProdutosCentavos) : '' },
    { rotulo: 'Desconto', valor: venda.descontoCentavos ? valorSemSimbolo(venda.descontoCentavos) : '' },
  ];
  return campos.filter((x) => x.valor);
}

export function textoCompletoNota(venda: Venda, empresa?: Empresa | null) {
  const linhas = [`DADOS PARA EMISSÃO — Venda #${venda.id} — ${new Date(venda.data).toLocaleDateString("pt-BR")}`];
  if (empresa?.cnpj) linhas.push(`Prestador: ${empresa.razaoSocial || empresa.nomeFantasia} — CNPJ ${formatarDocumento(empresa.cnpj)}`);
  linhas.push('');
  for (const campo of camposNota(venda)) linhas.push(`${campo.rotulo}: ${campo.valor}`);
  const lista = (tipo: 'PRODUTO' | 'SERVICO') =>
    venda.itens.filter((i) => i.tipo === tipo).map((i) => `  - ${formatarQuantidade(i.quantidade)} x ${i.descricao} = ${formatarMoeda(i.valorTotalCentavos)}`);
  const servicos = lista('SERVICO');
  const pecas = lista('PRODUTO');
  if (servicos.length) linhas.push('', 'Serviços (NFS-e):', ...servicos);
  if (pecas.length) linhas.push('', 'Peças (NF-e):', ...pecas);
  linhas.push('', `Valor total: ${formatarMoeda(venda.valorTotalCentavos)}`);
  return linhas.join('\n');
}

// Mensagem para mandar ao cliente pelo WhatsApp (resumo da venda ou do orçamento).
export function textoParaCliente(doc: Venda | Orcamento, tipo: 'venda' | 'orcamento', empresa?: Empresa | null) {
  const oficina = empresa?.nomeFantasia ?? 'ALX Serviços Automotivos';
  const titulo = tipo === 'venda' ? `*${oficina}* — Venda #${doc.id}` : `*${oficina}* — Orçamento #${doc.id}`;
  const linhas = [titulo, formatarDataHora(doc.data), ''];
  for (const i of doc.itens) linhas.push(`• ${formatarQuantidade(i.quantidade)} x ${i.descricao} — ${formatarMoeda(i.valorTotalCentavos)}`);
  if (doc.descontoCentavos) linhas.push(`Desconto: ${formatarMoeda(doc.descontoCentavos)}`);
  linhas.push('', `*Total: ${formatarMoeda(doc.valorTotalCentavos)}*`);
  if (tipo === 'orcamento' && 'validadeAte' in doc && doc.validadeAte) linhas.push(`Válido até ${new Date(doc.validadeAte).toLocaleDateString('pt-BR')}`);
  return linhas.join('\n');
}

export const URL_NFSE_NACIONAL = 'https://www.nfse.gov.br/EmissorNacional';
