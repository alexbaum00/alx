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
| Frontend | React 19 + Vite 8 + Tailwind 4 + React Router + TanStack Query, ícones Lucide | componentes próprios no lugar do shadcn, que exigiria Radix e CLI para poucos componentes |
| Tema | tokens em `frontend/src/styles/index.css` (`fundo`, `painel`, `card`, `borda`, `laranja`…) | trocar uma cor em um lugar só |
| Atalho de teclado | F2 abre Nova Venda | indicado no botão do painel |
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

| Tela | API | Situação |
|---|---|---|
| Início | `GET /api/dashboard/stats` | ✅ |
| Vendas: lista, nova (F2), detalhe, editar | `/api/vendas`, `PATCH /:id/status` | ✅ |
| Orçamentos: lista, novo, detalhe, converter | `/api/orcamentos`, `POST /:id/converter` | ✅ |
| Cadastros ▸ Clientes, Veículos, Fornecedores, Produtos, Serviços | `/api/<cadastro>` | ✅ |
| Estoque: níveis, entrada de mercadoria, ajuste, histórico | `/api/produtos`, `POST /:id/entrada`, `POST /:id/ajuste` | ✅ |
| Procedimentos: consulta, cadastro, edição | `/api/procedimentos` | ✅ |
| Financeiro: resumo do mês e despesas | `GET /api/relatorios/financeiro`, `/api/despesas` | ✅ |
| Relatórios: faturamento por dia, ranking de peças e serviços | `GET /api/relatorios/vendas` | ✅ |
| Configurações: dados da oficina e link da NF-e | `/api/empresa` | ✅ |
| Busca do topo | clientes, veículos e peças | ✅ |

### Nota fiscal (MEI)

Na tela da venda, o painel "Nota fiscal" traz:

- botão para o **Emissor Nacional de NFS-e** (`https://www.nfse.gov.br/EmissorNacional`), obrigatório para MEI prestador de serviço;
- botão para a **NF-e de peças**, com link configurável, porque o emissor gratuito varia por estado (portal da SEFAZ ou app Nota Fiscal Fácil);
- **Copiar dados para emissão** (texto completo) e um botão de copiar por campo (CPF/CNPJ, nome, endereço, descrição do serviço, valores).

A cópia usa `navigator.clipboard` quando existe e, pelo IP da rede (sem HTTPS), cai num método alternativo; se o navegador bloquear os dois, o texto aparece selecionado para copiar à mão. Os valores vão brutos, com o desconto como campo separado.

### Componentes do frontend

- `components/cadastro/`: tela e formulário genéricos configurados por campos (`pages/cadastros/configs.tsx`); cada cadastro é só uma lista de campos e colunas.
- `components/vendas/EditorItens`: busca peça e serviço no mesmo campo, serviço avulso, aviso de estoque insuficiente; usado em venda e orçamento.
- `components/ui/`: botão, campos (dinheiro digitado como em maquininha, quantidade com vírgula), modal que vira painel inferior no celular, avisos, seletor com busca, abas, paginação, período mensal.

### Datas

Datas `AAAA-MM-DD` vindas da tela são interpretadas no fuso local (`TZ`), não em UTC. Sem isso, "01/10" virava 30/09 às 21h em São Paulo e saía do filtro do mês.

## Pendências conhecidas

- Login com PIN/senha antes de liberar o acesso pela rede (Fase 5).
- PWA instalável só com HTTPS (nuvem, mkcert ou túnel).
