import { Route, Routes } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Cadastros } from '@/pages/cadastros/Inicio';
import { Procedimentos } from '@/pages/Procedimentos';
import { EmBreve } from '@/pages/EmBreve';
import { Clientes, Fornecedores, Produtos, Servicos, Veiculos } from '@/pages/cadastros';
import { Ferramentas } from '@/pages/cadastros/Ferramentas';
import { Vendas } from '@/pages/vendas/Vendas';
import { DetalheVenda } from '@/pages/vendas/DetalheVenda';
import { EditarVenda, NovaVenda } from '@/pages/vendas/FormularioVenda';
import { Orcamentos } from '@/pages/vendas/Orcamentos';
import { DetalheOrcamento } from '@/pages/vendas/DetalheOrcamento';
import { EditarOrcamento, NovoOrcamento } from '@/pages/vendas/FormularioOrcamento';
import { ImprimirOrcamento } from '@/pages/vendas/ImprimirOrcamento';
import { Estoque } from '@/pages/gestao/Estoque';
import { Financeiro } from '@/pages/gestao/Financeiro';
import { Relatorios } from '@/pages/gestao/Relatorios';
import { Configuracoes } from '@/pages/gestao/Configuracoes';

export function App() {
  return (
    <Routes>
      {/* páginas de impressão ficam fora do layout (sem menu) */}
      <Route path="orcamentos/:id/imprimir" element={<ImprimirOrcamento />} />
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />

        <Route path="vendas" element={<Vendas />} />
        <Route path="vendas/nova" element={<NovaVenda />} />
        <Route path="vendas/:id" element={<DetalheVenda />} />
        <Route path="vendas/:id/editar" element={<EditarVenda />} />

        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="orcamentos/novo" element={<NovoOrcamento />} />
        <Route path="orcamentos/:id" element={<DetalheOrcamento />} />
        <Route path="orcamentos/:id/editar" element={<EditarOrcamento />} />

        <Route path="cadastros" element={<Cadastros />} />
        <Route path="cadastros/clientes" element={<Clientes />} />
        <Route path="cadastros/clientes/novo" element={<Clientes novo />} />
        <Route path="cadastros/veiculos" element={<Veiculos />} />
        <Route path="cadastros/veiculos/novo" element={<Veiculos novo />} />
        <Route path="cadastros/fornecedores" element={<Fornecedores />} />
        <Route path="cadastros/fornecedores/novo" element={<Fornecedores novo />} />
        <Route path="cadastros/produtos" element={<Produtos />} />
        <Route path="cadastros/produtos/novo" element={<Produtos novo />} />
        <Route path="cadastros/servicos" element={<Servicos />} />
        <Route path="cadastros/servicos/novo" element={<Servicos novo />} />
        <Route path="cadastros/ferramentas" element={<Ferramentas />} />
        <Route path="cadastros/ferramentas/novo" element={<Ferramentas novo />} />

        <Route path="estoque" element={<Estoque />} />
        <Route path="estoque/entrada" element={<Estoque entrada />} />
        <Route path="procedimentos" element={<Procedimentos />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="configuracoes" element={<Configuracoes />} />

        <Route path="*" element={<EmBreve titulo="Página não encontrada" descricao="Este endereço não existe." />} />
      </Route>
    </Routes>
  );
}
