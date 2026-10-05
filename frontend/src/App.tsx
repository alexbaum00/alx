import { Route, Routes } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Cadastros } from '@/pages/Cadastros';
import { Procedimentos } from '@/pages/Procedimentos';
import { EmBreve } from '@/pages/EmBreve';

const provisorias: [string, string, string][] = [
  ['vendas', 'Vendas', 'Lançamento e listagem de vendas e ordens de serviço.'],
  ['vendas/nova', 'Nova Venda', 'Venda rápida com busca de peça e serviço.'],
  ['orcamentos', 'Orçamentos', 'Orçamentos para quem pedir preço antes de fechar.'],
  ['orcamentos/novo', 'Novo Orçamento', 'Monte o orçamento e converta em venda quando aprovado.'],
  ['cadastros/clientes', 'Clientes', 'Cadastro de clientes com endereço para nota fiscal.'],
  ['cadastros/clientes/novo', 'Cadastrar Cliente', 'Formulário de cliente.'],
  ['cadastros/veiculos', 'Veículos', 'Veículos dos clientes e histórico de atendimentos.'],
  ['cadastros/fornecedores', 'Fornecedores', 'Distribuidores e contatos.'],
  ['cadastros/produtos', 'Produtos', 'Peças, preços e estoque mínimo.'],
  ['cadastros/produtos/novo', 'Adicionar Produto', 'Formulário de produto.'],
  ['cadastros/servicos', 'Serviços', 'Catálogo de mão de obra.'],
  ['cadastros/servicos/novo', 'Registrar Serviço', 'Formulário de serviço.'],
  ['estoque', 'Estoque', 'Níveis de estoque, alertas e histórico de movimentação.'],
  ['estoque/entrada', 'Entrada no Estoque', 'Registro de mercadoria recebida.'],
  ['financeiro', 'Financeiro', 'Entradas das vendas pagas e despesas.'],
  ['relatorios', 'Relatórios', 'Vendas por período, produtos e serviços mais vendidos.'],
  ['configuracoes', 'Configurações', 'Dados da oficina usados na nota e no cabeçalho.'],
];

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="cadastros" element={<Cadastros />} />
        <Route path="procedimentos" element={<Procedimentos />} />
        {provisorias.map(([caminho, titulo, descricao]) => (
          <Route key={caminho} path={caminho} element={<EmBreve titulo={titulo} descricao={descricao} />} />
        ))}
        <Route path="*" element={<EmBreve titulo="Página não encontrada" descricao="Este endereço não existe." />} />
      </Route>
    </Routes>
  );
}
