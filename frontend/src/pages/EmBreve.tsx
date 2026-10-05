import { Link } from 'react-router';
import { Hammer } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Tela para endereços inexistentes.
export function EmBreve({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold text-white">{titulo}</h1>
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-laranja-escuro/15">
          <Hammer className="size-6 text-laranja" />
        </span>
        <p className="text-texto">{descricao}</p>
        <Link to="/" className="mt-2 rounded-lg bg-laranja-escuro px-4 py-2 text-sm font-medium text-white hover:bg-laranja">
          Voltar ao início
        </Link>
      </Card>
    </div>
  );
}
