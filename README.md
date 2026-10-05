# ALX Auto Elétrica

Sistema de gestão da oficina: vendas e ordens de serviço, orçamentos, clientes e veículos, estoque, fornecedores, histórico técnico (procedimentos), financeiro, relatórios e atalhos para a nota fiscal do MEI. Roda no computador da oficina e abre no celular pelo Wi-Fi.

![Painel](docs/prints/desktop.png)

Detalhes técnicos e decisões: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## Só para testar (Windows)

1. Instale o **Node.js 22 ou mais novo** (LTS) em <https://nodejs.org>.
2. Baixe e extraia o sistema numa pasta qualquer.
3. Dê **duplo clique em `testar.bat`**. Ele instala, compila, cria o banco com dados de exemplo, inicia o sistema e abre o navegador. Deixe a janela aberta; `Ctrl+C` para parar.

Nada fica instalado no Windows (sem início automático, atalhos ou regra de firewall). Para remover, apague a pasta.

## Instalação no Windows

1. Instale o **Node.js 22 ou mais novo** (versão LTS) em <https://nodejs.org>. Se preferir, abra o PowerShell e rode `winget install OpenJS.NodeJS.LTS`.
2. Baixe esta pasta do sistema para o computador (por exemplo em `C:\ALX`).
3. Dê **duplo clique em `instalar.bat`**. O instalador:
   - instala as dependências e compila o sistema;
   - cria o banco de dados;
   - libera a porta 3000 no firewall para redes privadas (o Windows pede permissão de administrador);
   - faz o sistema **iniciar sozinho quando o Windows liga**;
   - cria o atalho **ALX Auto Eletrica** na área de trabalho;
   - abre o navegador.
4. Na primeira vez, **crie a senha** no navegador deste computador. Ela vale para o computador e para o celular.

> Por segurança, a primeira senha só pode ser criada no próprio computador da oficina. Assim, ninguém no Wi-Fi consegue criá-la antes de você.

### Usar no celular

- O celular precisa estar no **mesmo Wi-Fi** do computador.
- Em **Configurações › Acesso pelo celular** aparece um **QR code**: aponte a câmera e entre com a senha.
- Se o celular não abrir:
  - No Windows, a rede Wi-Fi deve estar como **Rede privada** (Configurações › Rede e Internet › Wi-Fi › propriedades da rede).
  - Reserve um **IP fixo** para o computador no roteador; senão o endereço pode mudar quando o roteador reinicia.

### No dia a dia

- O sistema inicia junto com o Windows numa janela minimizada chamada *ALX Auto Eletrica*. **Não feche essa janela**: ela é o sistema rodando.
- Para abrir no computador: atalho da área de trabalho, ou <http://localhost:3000>.
- Para iniciar manualmente: duplo clique em `iniciar.bat`.

### Backup

- **Automático, uma vez por dia**, guardando os últimos 30, na pasta `backups/`. As **fotos** (procedimentos, produtos, ferramentas) vão junto, em `backups/imagens/`; só as novas são copiadas a cada vez.
- Em **Configurações › Backup** dá para ver os últimos e clicar em **Fazer backup agora**.
- Para guardar fora do computador, abra `backend/.env` no Bloco de Notas e aponte `BACKUP_DIR` para uma pasta do Google Drive, por exemplo `BACKUP_DIR="C:\Users\voce\Google Drive\ALX-backups"`. Ou copie a pasta `backups/` para um pen drive de vez em quando.
- **Para restaurar:** feche o sistema, copie o backup escolhido para `backend\prisma\alx.db` (substituindo o arquivo), copie o conteúdo de `backups\imagens\` para a pasta `imagens\` do sistema e inicie de novo.

### Esqueci a senha

No computador da oficina, abra o terminal na pasta do sistema e rode:

```bash
npm run senha:redefinir
```

Depois abra <http://localhost:3000> nesse computador e crie a senha nova. Todos os aparelhos são desconectados.

### Atualizar o sistema

Substitua os arquivos pela versão nova (sem apagar `backend\.env`, `backend\prisma\alx.db`, `imagens\` nem `backups\`) e rode o `instalar.bat` de novo. As atualizações do banco são feitas por migrações, que **não apagam dados**.

---

## Desenvolvimento

```bash
npm install
cp backend/.env.example backend/.env   # se ainda não existir
npm run db:migrate                     # cria/atualiza o banco em backend/prisma/alx.db
npm run db:seed                        # dados de exemplo (opcional)
npm run dev                            # tela em http://localhost:5173 (API na 3000)
```

| Comando | O que faz |
|---|---|
| `npm run dev` | API e tela com recarga automática |
| `npm run build` / `npm start` | compila e roda em modo produção, numa porta só (o `start` aplica as migrações antes) |
| `npm test` | testes da API (banco separado, `test.db`) |
| `npm run typecheck` | checagem de tipos (API e tela) |
| `npm run db:migrate` | aplica as migrações pendentes |
| `npm run db:nova-migracao -w backend -- --name <nome>` | gera uma migração depois de mudar o `schema.prisma` |
| `npm run db:backup` | backup manual |
| `npm run senha:redefinir` | apaga a senha de acesso |

> Use o modo produção (`npm start`) no dia a dia. No `npm run dev`, as requisições passam pelo proxy do Vite e todas parecem vir do próprio computador, o que desliga as proteções que dependem do endereço (primeira senha só local, limite de tentativas por aparelho).

## API

Todas as rotas exigem login (cookie de sessão), exceto `/api/health` e `/api/auth/*`. Os cadastros seguem o mesmo padrão: `GET /` (com `?busca=&pagina=&porPagina=`), `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`.

| Recurso | Rota | Extras |
|---|---|---|
| Acesso | `/api/auth` | `GET /estado`, `POST /definir-senha` (só local), `/entrar`, `/sair`, `/trocar-senha` |
| Painel | `GET /api/dashboard/stats` | cards e tabelas da tela Início |
| Clientes | `/api/clientes` | busca por nome, CPF/CNPJ, telefone ou placa |
| Veículos | `/api/veiculos` | `?clienteId=`; placa antiga ou Mercosul |
| Fornecedores | `/api/fornecedores` | |
| Produtos | `/api/produtos` | `?categoria=&estoqueBaixo=true&incluirInativos=true`, `GET /estoque-baixo`, `GET /categorias`, `POST /:id/entrada`, `POST /:id/ajuste` |
| Serviços | `/api/servicos` | catálogo de mão de obra |
| Procedimentos | `/api/procedimentos` | busca por várias palavras em todos os campos |
| Vendas | `/api/vendas` | sem DELETE; `PATCH /:id/status` (concluir/pagar baixa estoque, cancelar devolve) |
| Orçamentos | `/api/orcamentos` | `PATCH /:id/status`, `POST /:id/converter` (gera a venda) |
| Despesas | `/api/despesas` | `?de=&ate=`; retorna `totalCentavos` do período |
| Empresa | `GET/PUT /api/empresa` | dados da oficina e link do emissor de NF-e |
| Relatórios | `GET /api/relatorios/financeiro`, `GET /api/relatorios/vendas` | `?de=AAAA-MM-DD&ate=AAAA-MM-DD` (padrão: mês atual) |
| Sistema | `GET /api/sistema/acesso`, `GET/POST /api/sistema/backup` | endereços com QR code; backups |
| Imagens | `POST /api/imagens` (corpo: bytes da foto), `GET /api/imagens/:id` | a foto é ligada ao registro por `imagemId` (produto, ferramenta) ou `imagens: [{id, legenda}]` (procedimento) |
| Ferramentas | `/api/ferramentas` | `GET /resumo` (total investido, por categoria); `?incluirDescartadas=true` |

Valores em dinheiro trafegam em centavos (`2500` = R$ 25,00).
