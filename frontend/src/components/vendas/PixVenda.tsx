import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, QrCode, Settings } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { copiarTexto } from '@/lib/copiar';
import { formatarMoeda } from '@/lib/formato';
import { Botao } from '@/components/ui/Botao';
import { Card } from '@/components/ui/Card';

interface Pix {
  payload: string;
  qrSvg: string;
  valorCentavos: number;
  chave: string;
}

// QR code Pix com o valor da venda (o cliente lê com o app do banco) e o "copia e cola".
// O recebimento não é confirmado sozinho: confira no app do banco e clique em "Receber pagamento".
export function QrPix({ vendaId, valorCentavos }: { vendaId: number; valorCentavos: number }) {
  const [copiado, setCopiado] = useState(false);
  const { data, error, isPending } = useQuery({
    // o valor na chave refaz o QR quando a venda é editada
    queryKey: ['vendas', 'pix', vendaId, valorCentavos],
    queryFn: () => api<Pix>(`/vendas/${vendaId}/pix`),
    retry: false,
  });

  if (isPending) return <div className="mx-auto size-48 animate-pulse rounded-xl bg-white/10" />;
  if (error) {
    const semChave = error instanceof ApiError && error.status === 400;
    return semChave ? (
      <Link to="/configuracoes" className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-borda px-3 py-3 text-sm text-apagado hover:text-white">
        <Settings className="size-4" /> Cadastrar a chave Pix da oficina
      </Link>
    ) : (
      <p className="text-sm text-red-400">{error.message}</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG gerado no servidor pela biblioteca qrcode a partir do código Pix */}
      <div className="size-48 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: data.qrSvg }} />
      <p className="text-2xl font-bold text-white">{formatarMoeda(data.valorCentavos)}</p>
      <p className="text-xs text-apagado">Chave: {data.chave}</p>
      <Botao
        variante="secundario"
        className="w-full"
        icone={copiado ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
        onClick={async () => {
          if (await copiarTexto(data.payload)) {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          }
        }}
      >
        {copiado ? 'Copiado!' : 'Copiar Pix copia e cola'}
      </Botao>
    </div>
  );
}

export function CartaoPix({ vendaId, valorCentavos }: { vendaId: number; valorCentavos: number }) {
  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-white">
        <QrCode className="size-4 text-laranja" /> Pagar com Pix
      </h2>
      <p className="mb-4 text-xs text-apagado">O cliente aponta a câmera do app do banco; o valor já vem preenchido.</p>
      <QrPix vendaId={vendaId} valorCentavos={valorCentavos} />
    </Card>
  );
}
