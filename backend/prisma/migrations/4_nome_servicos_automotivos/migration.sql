-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Empresa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "nomeFantasia" TEXT NOT NULL DEFAULT 'ALX Serviços Automotivos',
    "razaoSocial" TEXT,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "urlEmissorNfe" TEXT
);
INSERT INTO "new_Empresa" ("bairro", "cep", "cidade", "cnpj", "email", "endereco", "id", "nomeFantasia", "numero", "razaoSocial", "telefone", "uf", "urlEmissorNfe") SELECT "bairro", "cep", "cidade", "cnpj", "email", "endereco", "id", "nomeFantasia", "numero", "razaoSocial", "telefone", "uf", "urlEmissorNfe" FROM "Empresa";
DROP TABLE "Empresa";
ALTER TABLE "new_Empresa" RENAME TO "Empresa";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


-- Novo nome da oficina: troca só se ainda estiver o padrão antigo (nome digitado em Configurações é mantido)
UPDATE "Empresa" SET "nomeFantasia" = 'ALX Serviços Automotivos' WHERE "nomeFantasia" = 'ALX Auto Elétrica';
