import { BatteryFull, Cable, Lightbulb, PackageOpen, ToggleRight, Zap, type LucideIcon } from 'lucide-react';
import { urlImagem } from '@/lib/imagens';

const iconesCategoria: [RegExp, LucideIcon, string][] = [
  [/l[aâ]mpada|farol/i, Lightbulb, 'text-yellow-300'],
  [/fus[ií]vel/i, Zap, 'text-red-400'],
  [/rel[eé]/i, ToggleRight, 'text-slate-300'],
  [/bateria/i, BatteryFull, 'text-emerald-400'],
  [/cabo|fio/i, Cable, 'text-red-400'],
];

// Foto do produto quando houver; senão, o ícone da categoria.
export function IconeProduto({ nome, categoria, imagemId, tamanho = 'size-8' }: { nome: string; categoria?: string | null; imagemId?: string | null; tamanho?: string }) {
  if (imagemId) {
    return <img src={urlImagem(imagemId)} alt="" loading="lazy" className={`${tamanho} shrink-0 rounded-full bg-white object-cover ring-1 ring-borda`} />;
  }
  const achado = iconesCategoria.find(([re]) => re.test(categoria ?? '') || re.test(nome));
  const [, Icone, cor] = achado ?? [null, PackageOpen, 'text-suave'];
  return (
    <span className={`inline-flex ${tamanho} shrink-0 items-center justify-center rounded-full bg-slate-800`}>
      <Icone className={`size-4 ${cor}`} />
    </span>
  );
}
