# Arquitetura — ALX Auto Elétrica

Referência visual: [`layout-referencia.jpg`](layout-referencia.jpg).

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Backend | Node 22 + TypeScript + Fastify 5 | leve e rápido |
| Banco | SQLite via Prisma **6.19** (versão fixada) | o `latest` do npm é o Prisma 8 RC, com CLI incompatível |
| Validação | Zod 4 | mensagens de erro por campo, em português |
| Camadas | `routes` → `services` → Prisma | repositories seriam uma camada sem ganho neste porte |
| Dinheiro | inteiros em centavos (`*Centavos`) | evita erro de arredondamento de float |
| Quantidades | `Float` + campo `unidade` | cabos são vendidos por metro |
| Orçamento | `Venda` com `status = ORCAMENTO` | mesmo fluxo, vira OS com um clique |
| Estoque | baixa ao concluir/pagar, estorno ao cancelar, com `MovimentacaoEstoque` | orçamento não reserva peça; histórico auditável |
| Itens de venda | guardam descrição e preço do momento | mudar o cadastro não altera vendas antigas |
| Produção | um único servidor Fastify servindo API + frontend compilado | uma porta só para abrir no celular |
| Backup | `npm run db:backup` (`VACUUM INTO`) | cópia consistente mesmo com o sistema aberto |

## Layout → módulos

| Item do layout | Backend | Fase |
|---|---|---|
| Início (cards + tabelas) | `GET /api/dashboard/stats` | 2 |
| Vendas / Nova Venda | `Venda`, `ItemVenda` | 2 / 4 |
| Orçamentos / Novo Orçamento | `Venda` com status `ORCAMENTO` | 2 / 4 |
| Clientes / Cadastrar Cliente | `Cliente` (com endereço para NFS-e) | 1 ✅ |
| Estoque / Adicionar Produto / Entrada no Estoque | `Produto`, `MovimentacaoEstoque`, `Fornecedor` | 2 |
| Serviços / Registrar Serviço | `Servico` (catálogo de mão de obra) | 2 |
| Financeiro | vendas pagas (entradas) + `Despesa` (saídas) | 2 |
| Relatórios / Relatório de Vendas | consultas agregadas sobre `Venda` | 4 |
| Configurações | `Empresa` (dados da oficina, CNPJ MEI) | 4 |
| Veículos Recentes | `Veiculo` | 2 |
| Busca do topo (cliente, veículo, peça) | busca global | 3 |
| Mais Opções → Procedimentos técnicos | `Procedimento` | 2 |

O layout não mostra Fornecedores nem Procedimentos no menu lateral. A proposta é colocá-los dentro de Estoque e de "Mais Opções", respectivamente.

## Pendências conhecidas

- Login com PIN/senha antes de liberar o acesso pela rede (Fase 5).
- "Copiar dados para emissão" precisa de alternativa ao `navigator.clipboard`, que não existe em `http://IP-local`.
- PWA instalável só com HTTPS (nuvem, mkcert ou túnel).
