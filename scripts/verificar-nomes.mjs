// Windows não diferencia maiúsculas de minúsculas: "Cadastros.tsx" e a pasta
// "cadastros/" viram o mesmo nome e quebram o build lá. Falha se houver colisão.
import { execSync } from 'node:child_process';
import { parse } from 'node:path';

const arquivos = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
const vistos = new Map();
for (const arquivo of arquivos) {
  const partes = arquivo.split('/');
  partes.forEach((_, i) => {
    let nome = partes.slice(0, i + 1).join('/');
    if (i === partes.length - 1) nome = nome.slice(0, nome.length - parse(nome).ext.length); // compara sem extensão
    const chave = nome.toLowerCase();
    if (!vistos.has(chave)) vistos.set(chave, new Set());
    vistos.get(chave).add(nome);
  });
}
const colisoes = [...vistos.values()].filter((v) => v.size > 1);
if (colisoes.length) {
  console.error('Nomes que colidem no Windows (só diferem em maiúsculas):');
  for (const c of colisoes) console.error('  ' + [...c].join('  x  '));
  process.exit(1);
}
console.log('Nomes de arquivos OK para Windows.');
