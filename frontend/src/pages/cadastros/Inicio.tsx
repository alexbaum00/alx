import { Link } from 'react-router';
import { menu } from '@/components/layout/menu';
import { Card } from '@/components/ui/Card';

const descricoes: Record<string, string> = {
  '/cadastros/clientes': 'Dados, documento e endereço para nota',
  '/cadastros/veiculos': 'Placa, modelo e quilometragem',
  '/cadastros/fornecedores': 'Distribuidores e contatos',
  '/cadastros/produtos': 'Peças, preços e estoque mínimo',
  '/cadastros/servicos': 'Mão de obra com preço sugerido',
};

export function Cadastros() {
  const filhos = menu.find((m) => m.para === '/cadastros')!.filhos!;
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-2xl font-bold text-white">Cadastros</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filhos.map((f) => (
          <Link key={f.para} to={f.para}>
            <Card className="flex h-full items-start gap-4 p-5 transition-colors hover:border-slate-600 hover:bg-card-hover">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-laranja-escuro/15">
                <f.icone className="size-5 text-laranja" />
              </span>
              <span>
                <span className="block font-semibold text-white">{f.rotulo}</span>
                <span className="text-sm text-suave">{descricoes[f.para]}</span>
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
