-- CreateTable
CREATE TABLE "Imagem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "arquivo" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "legenda" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "procedimentoId" INTEGER,
    "criadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Imagem_procedimentoId_fkey" FOREIGN KEY ("procedimentoId") REFERENCES "Procedimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ferramenta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "categoria" TEXT,
    "numeroSerie" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "valorCompraCentavos" INTEGER NOT NULL DEFAULT 0,
    "dataCompra" DATETIME,
    "ondeComprou" TEXT,
    "garantiaAte" DATETIME,
    "localizacao" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BOA',
    "observacoes" TEXT,
    "imagemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ferramenta_imagemId_fkey" FOREIGN KEY ("imagemId") REFERENCES "Imagem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Produto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fornecedorId" INTEGER,
    "sku" TEXT,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "precoCustoCentavos" INTEGER NOT NULL DEFAULT 0,
    "precoVendaCentavos" INTEGER NOT NULL DEFAULT 0,
    "estoqueAtual" REAL NOT NULL DEFAULT 0,
    "estoqueMinimo" REAL NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "imagemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Produto_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Produto_imagemId_fkey" FOREIGN KEY ("imagemId") REFERENCES "Imagem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Produto" ("ativo", "categoria", "createdAt", "estoqueAtual", "estoqueMinimo", "fornecedorId", "id", "nome", "precoCustoCentavos", "precoVendaCentavos", "sku", "unidade", "updatedAt") SELECT "ativo", "categoria", "createdAt", "estoqueAtual", "estoqueMinimo", "fornecedorId", "id", "nome", "precoCustoCentavos", "precoVendaCentavos", "sku", "unidade", "updatedAt" FROM "Produto";
DROP TABLE "Produto";
ALTER TABLE "new_Produto" RENAME TO "Produto";
CREATE UNIQUE INDEX "Produto_sku_key" ON "Produto"("sku");
CREATE UNIQUE INDEX "Produto_imagemId_key" ON "Produto"("imagemId");
CREATE INDEX "Produto_nome_idx" ON "Produto"("nome");
CREATE INDEX "Produto_categoria_idx" ON "Produto"("categoria");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Imagem_procedimentoId_idx" ON "Imagem"("procedimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Ferramenta_imagemId_key" ON "Ferramenta"("imagemId");

-- CreateIndex
CREATE INDEX "Ferramenta_nome_idx" ON "Ferramenta"("nome");

-- CreateIndex
CREATE INDEX "Ferramenta_categoria_idx" ON "Ferramenta"("categoria");

