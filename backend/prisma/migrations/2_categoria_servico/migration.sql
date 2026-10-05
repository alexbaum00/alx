-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Servico" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoCentavos" INTEGER NOT NULL DEFAULT 0,
    "tempoEstimadoMin" INTEGER,
    "categoria" TEXT NOT NULL DEFAULT 'OUTROS',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Servico" ("ativo", "createdAt", "descricao", "id", "nome", "precoCentavos", "tempoEstimadoMin", "updatedAt") SELECT "ativo", "createdAt", "descricao", "id", "nome", "precoCentavos", "tempoEstimadoMin", "updatedAt" FROM "Servico";
DROP TABLE "Servico";
ALTER TABLE "new_Servico" RENAME TO "Servico";
CREATE INDEX "Servico_nome_idx" ON "Servico"("nome");
CREATE INDEX "Servico_categoria_idx" ON "Servico"("categoria");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


-- Classifica os serviços já cadastrados pelo nome; o que não casar fica em OUTROS.
-- "_" no LIKE casa qualquer letra, então pega com e sem acento (película/pelicula, rádio/radio).
UPDATE "Servico" SET "categoria" = 'PELICULA' WHERE "nome" LIKE '%pel_cula%' OR "nome" LIKE '%insulfilm%';
UPDATE "Servico" SET "categoria" = 'SOM' WHERE "categoria" = 'OUTROS' AND ("nome" LIKE '%som%' OR "nome" LIKE '%r_dio%' OR "nome" LIKE '%alto-falante%' OR "nome" LIKE '%alto falante%' OR "nome" LIKE '%subwoofer%' OR "nome" LIKE '%multim_dia%');
UPDATE "Servico" SET "categoria" = 'CHAVE' WHERE "categoria" = 'OUTROS' AND ("nome" LIKE '%chave%' OR "nome" LIKE '%transponder%' OR "nome" LIKE '%controle remoto%');
UPDATE "Servico" SET "categoria" = 'ELETRICA' WHERE "categoria" = 'OUTROS' AND ("nome" LIKE '%el_tric%' OR "nome" LIKE '%bateria%' OR "nome" LIKE '%alternador%' OR "nome" LIKE '%motor de partida%' OR "nome" LIKE '%arranque%' OR "nome" LIKE '%scanner%' OR "nome" LIKE '%diagn_stico%' OR "nome" LIKE '%farol%' OR "nome" LIKE '%l_mpada%' OR "nome" LIKE '%chicote%' OR "nome" LIKE '%fus_vel%' OR "nome" LIKE '%inje__o%' OR "nome" LIKE '%alarme%' OR "nome" LIKE '%trava%');
