# ALX Auto Elétrica

Sistema de gestão para auto elétrica: vendas e ordens de serviço, orçamentos, clientes, veículos, estoque, fornecedores, histórico técnico e atalhos para NFS-e MEI.

Arquitetura e decisões: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Requisitos

- Node.js 22 ou superior

## Primeiros passos

```bash
npm install
cp backend/.env.example backend/.env   # se ainda não existir
npm run db:push                        # cria o banco SQLite em backend/prisma/alx.db
npm run db:seed                        # dados de exemplo (opcional)
npm run dev                            # API em http://localhost:3000
```

Ao iniciar, o servidor mostra o endereço para abrir no celular conectado ao mesmo Wi-Fi.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | inicia a API com recarga automática |
| `npm test` | roda os testes (usa um banco separado, `test.db`) |
| `npm run typecheck` | checagem de tipos |
| `npm run db:push` | aplica o `schema.prisma` no banco |
| `npm run db:backup` | salva uma cópia datada do banco em `backups/` |

## API (Fase 1)

- `GET /api/health`
- `GET /api/clientes?busca=&pagina=&porPagina=` (busca por nome, CPF/CNPJ, telefone ou placa)
- `GET /api/clientes/:id` · `POST /api/clientes` · `PUT /api/clientes/:id` · `DELETE /api/clientes/:id`
