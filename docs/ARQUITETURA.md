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
| Vendas | lançadas direto, sem passar por orçamento | venda de balcão já nasce `PAGO`; OS começa `ABERTO` |
| Orçamento | módulo **separado** (`Orcamento`), opcional | só para quem pede preço antes; não mexe em estoque nem no faturamento; pode virar venda com os preços combinados |
| Estoque | baixa ao concluir/pagar, estorno ao cancelar, tudo em `MovimentacaoEstoque` | histórico auditável; o PUT do produto não altera estoque |
| Estoque insuficiente | bloqueia a conclusão e informa o que falta | evita estoque negativo |
| Itens de venda | guardam descrição e preço do momento | mudar o cadastro não altera vendas antigas |
| Exclusão de venda | não existe; usa-se cancelar | mantém o histórico e devolve as peças |
| Fuso | `TZ=America/Sao_Paulo` | define o que é "hoje" no painel |
| Produção | um único servidor Fastify servindo API + frontend compilado | uma porta só para abrir no celular |
| Backup | `npm run db:backup` (`VACUUM INTO`) | cópia consistente mesmo com o sistema aberto |

## Menu lateral (definido com o usuário)

```
Início
Vendas
Orçamentos            (função extra, independente de Vendas)
Cadastros ▸ Clientes · Veículos · Fornecedores · Produtos · Serviços
Estoque               (níveis, entrada de mercadoria, ajustes, histórico)
Procedimentos         (acesso rápido à base técnica)
Financeiro
Relatórios
Configurações
```

Diferenças em relação à imagem: "Clientes" e "Serviços" saem do primeiro nível e vão para **Cadastros**, junto de Veículos, Fornecedores e Produtos. **Procedimentos** entra no menu lateral.

## Telas → API

| Tela / atalho | API | Fase |
|---|---|---|
| Início (cards + tabelas) | `GET /api/dashboard/stats` | 2 ✅ |
| Vendas / Nova Venda | `/api/vendas` | 2 ✅ (tela na 4) |
| Orçamentos / Novo Orçamento | `/api/orcamentos` + `POST /:id/converter` | 2 ✅ (tela na 4) |
| Cadastros ▸ Clientes | `/api/clientes` | 1 ✅ |
| Cadastros ▸ Veículos | `/api/veiculos` | 2 ✅ |
| Cadastros ▸ Fornecedores | `/api/fornecedores` | 2 ✅ |
| Cadastros ▸ Produtos | `/api/produtos` | 2 ✅ |
| Cadastros ▸ Serviços | `/api/servicos` | 2 ✅ |
| Estoque / Entrada no Estoque | `/api/produtos/estoque-baixo`, `POST /:id/entrada`, `POST /:id/ajuste` | 2 ✅ |
| Procedimentos | `/api/procedimentos?busca=` (várias palavras, todos os campos) | 2 ✅ |
| Financeiro | vendas pagas + `/api/despesas` | 2 ✅ (resumo na 4) |
| Relatórios | consultas agregadas sobre vendas | 4 |
| Configurações | `/api/empresa` | 2 ✅ |
| Busca do topo | busca global | 3 |

## Pendências conhecidas

- Login com PIN/senha antes de liberar o acesso pela rede (Fase 5).
- "Copiar dados para emissão" precisa de alternativa ao `navigator.clipboard`, que não existe em `http://IP-local`.
- PWA instalável só com HTTPS (nuvem, mkcert ou túnel).
