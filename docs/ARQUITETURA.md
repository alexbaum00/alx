# Arquitetura — ALX Serviços Automotivos

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
| Backup | automático diário + `npm run db:backup` (`VACUUM INTO`), guarda os últimos 30 | cópia consistente mesmo com o sistema aberto |
| Banco em produção | migrações (`prisma migrate deploy`, roda no `npm start`) | atualizar o sistema nunca apaga dados; `db push` pode descartar colunas |

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

## Segurança (Fase 5)

| Ameaça | Proteção |
|---|---|
| Qualquer pessoa no Wi-Fi abre o sistema | senha obrigatória em toda a API (exceto `/api/health` e `/api/auth/*`) |
| Alguém na rede cria a primeira senha antes do dono | `definir-senha` só é aceito de `127.0.0.1`/`::1`; o servidor não confia em `X-Forwarded-For` |
| Adivinhar a senha | após 5 erros por endereço, espera de 1, 2, 4… até 30 min |
| Vazamento do banco | senha guardada com scrypt + sal; sessões guardam só o SHA-256 do token |
| Roubo do cookie por script | cookie `HttpOnly`; `SameSite=Lax` impede envio a partir de outros sites |
| Outro site ler a API | sem CORS: tela e API estão na mesma origem |
| Celular perdido / funcionário que saiu | trocar a senha derruba todas as outras sessões |
| Senha esquecida | `npm run senha:redefinir`, que exige acesso ao computador |

Sessões valem 30 dias e são renovadas com o uso. O cookie não tem a flag `Secure` porque o acesso na rede local é por `http://IP`. Ao colocar o sistema na nuvem, use HTTPS e ligue `secure` em `routes/auth.ts`.

## Instalação (Fase 5)

- `instalar.bat` chama `scripts/instalar-windows.ps1`, que confere o Node 22+, roda `npm install`, `build` e as migrações, cria a regra de firewall (só perfil Privado, pedindo elevação), o atalho na pasta Inicializar (abre minimizado) e o atalho na área de trabalho.
- `iniciar.bat` roda `npm start`.
- `.gitattributes` mantém CRLF nos `.bat`/`.ps1`; o `.ps1` é salvo em UTF-8 com BOM para o PowerShell 5.1 ler os acentos.

## Fotos e ferramentas

- **Fotos como arquivos** na pasta `imagens/` (`IMAGENS_DIR`), com o registro no modelo `Imagem`. Ficar fora do SQLite evita que cada backup diário copie todas as fotos de novo; o backup copia só as fotos novas para `backups/imagens/`.
- **Redução no navegador** (canvas, JPEG): até 1600 px em procedimentos e 900 px em produtos e ferramentas. Uma foto de celular de ~500 KB a 4 MB vira dezenas ou poucas centenas de KB. Sem biblioteca nativa (como sharp), que costuma dar problema de instalação no Windows.
- **Envio antes de salvar**: a foto sobe ao ser escolhida e o formulário manda só o id ao salvar. Fotos sem dono (formulário cancelado, foto trocada ou removida) são apagadas pela manutenção de hora em hora depois de 24 h, assim como arquivos que ficaram sem registro.
- **Segurança**: o tipo é conferido pelos primeiros bytes (JPEG, PNG, WebP), não pelo cabeçalho; ids são 32 caracteres hexadecimais aleatórios, validados antes de tocar no disco; a rota exige login; uma foto não pode pertencer a dois registros.
- **Produto**: uma foto (`Produto.imagemId`), mostrada no lugar do ícone da categoria no painel, no Estoque, em Produtos e na busca do topo.
- **Procedimento**: até 30 fotos com legenda e ordem; galeria com ampliação (setas, teclado, deslizar no celular).
- **Categorias de serviço**: lista fixa (Elétrica, Película, Som, Chave, Outros) em `Servico.categoria`, para não surgirem blocos duplicados por grafia diferente. A tela Serviços mostra um bloco por categoria, nessa ordem, com cores em `frontend/src/lib/categoriasServico.ts` (amarelo, grafite, roxo, vermelho, preto). A migração `2_categoria_servico` classifica os serviços já cadastrados por palavra-chave no nome; o resto fica em Outros.
- **Ferramentas** (Cadastros › Ferramentas): valor por unidade × quantidade; o resumo soma o investido sem as descartadas, por categoria, e conta as em manutenção e na garantia.

## Impressão do orçamento

`/orcamentos/:id/imprimir` é uma página fora do layout do sistema (sem menu), sempre clara, em formato A4 (`@page` em `styles/index.css`). Ela mostra o cabeçalho com os dados da oficina (Configurações), o cliente (ou o contato sem cadastro), o veículo, os itens, os totais, as observações, a validade e as linhas de assinatura. O botão **Imprimir** do orçamento abre a página com `?imprimir=1`, que chama `window.print()` assim que os dados carregam; o título da página vira o nome sugerido ao "Salvar como PDF". O cabeçalho da tabela se repete em cada página, e os totais e as assinaturas não são quebrados entre páginas.

## Busca sem acento

O `LIKE` do SQLite só ignora maiúsculas/minúsculas em letras sem acento. Por isso, 10 tabelas (Cliente, Veiculo, Fornecedor, Produto, Servico, Procedimento, Ferramenta, Despesa, Orcamento, ItemVenda) têm a coluna `busca`, com os campos de texto em minúsculas e sem acento ("Relé 12V" → "rele 12v"). A busca normaliza o termo do mesmo jeito (`backend/src/lib/busca.ts`) e procura nessa coluna. CPF/CNPJ, telefone e placa continuam buscados direto.

- A coluna é mantida por **gatilhos no banco** (`<Tabela>_busca_insert` e `<Tabela>_busca_update`), criados na migração `3_busca_sem_acento`. Assim vale para qualquer gravação (tela, seed, gravações aninhadas) sem código extra.
- **Cuidado em migrações futuras**: se o Prisma gerar `RedefineTables` (recriar a tabela) para uma dessas 10 tabelas, os gatilhos dela somem junto com a tabela antiga. Recrie-os na mesma migração copiando os da `3_busca_sem_acento`. O teste "gatilhos de busca existem" (`backend/test/busca.test.ts`) falha se algum faltar.
- O `create` do Prisma devolve a linha antes do gatilho rodar, então o `busca` no objeto retornado vem vazio; no banco ele já está certo. Nada na tela usa esse campo.

## Pendências conhecidas

- Scripts de Windows escritos e revisados, mas não executados num Windows real durante o desenvolvimento.
- PWA instalável só com HTTPS (nuvem, mkcert ou túnel).

