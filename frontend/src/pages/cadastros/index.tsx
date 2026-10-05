import { PaginaCadastro } from '@/components/cadastro/PaginaCadastro';
import { configClientes, configFornecedores, configProdutos, configVeiculos } from './configs';
export { Servicos } from './Servicos';

export const Clientes = ({ novo }: { novo?: boolean }) => <PaginaCadastro config={configClientes} abrirNovo={novo} />;
export const Veiculos = ({ novo }: { novo?: boolean }) => <PaginaCadastro config={configVeiculos} abrirNovo={novo} />;
export const Fornecedores = ({ novo }: { novo?: boolean }) => <PaginaCadastro config={configFornecedores} abrirNovo={novo} />;
export const Produtos = ({ novo }: { novo?: boolean }) => <PaginaCadastro config={configProdutos} abrirNovo={novo} />;
