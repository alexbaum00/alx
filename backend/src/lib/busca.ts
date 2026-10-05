// Mesma regra dos gatilhos do banco (migração 3_busca_sem_acento): minúsculas e sem acento.
// "Relé" e "RELE" viram "rele"; a busca compara com a coluna "busca" de cada tabela.
export function normalizarBusca(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
