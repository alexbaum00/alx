import {
  BookOpen,
  Boxes,
  Car,
  ChartColumn,
  CircleDollarSign,
  FileText,
  FolderOpen,
  House,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface ItemMenu {
  rotulo: string;
  para: string;
  icone: LucideIcon;
  filhos?: ItemMenu[];
}

// Estrutura definida com o usuário: Cadastros agrupa os cadastros;
// Procedimentos fica no menu lateral para consulta rápida.
export const menu: ItemMenu[] = [
  { rotulo: 'Início', para: '/', icone: House },
  { rotulo: 'Vendas', para: '/vendas', icone: ShoppingCart },
  { rotulo: 'Orçamentos', para: '/orcamentos', icone: FileText },
  {
    rotulo: 'Cadastros',
    para: '/cadastros',
    icone: FolderOpen,
    filhos: [
      { rotulo: 'Clientes', para: '/cadastros/clientes', icone: User },
      { rotulo: 'Veículos', para: '/cadastros/veiculos', icone: Car },
      { rotulo: 'Fornecedores', para: '/cadastros/fornecedores', icone: Truck },
      { rotulo: 'Produtos', para: '/cadastros/produtos', icone: Package },
      { rotulo: 'Serviços', para: '/cadastros/servicos', icone: Wrench },
    ],
  },
  { rotulo: 'Estoque', para: '/estoque', icone: Boxes },
  { rotulo: 'Procedimentos', para: '/procedimentos', icone: BookOpen },
  { rotulo: 'Financeiro', para: '/financeiro', icone: CircleDollarSign },
  { rotulo: 'Relatórios', para: '/relatorios', icone: ChartColumn },
  { rotulo: 'Configurações', para: '/configuracoes', icone: Settings },
];
