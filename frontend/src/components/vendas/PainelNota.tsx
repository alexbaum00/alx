import { useState } from 'react';
import { Link } from 'react-router';
import { Check, Copy, ExternalLink, FileText, Settings } from 'lucide-react';
import type { Empresa, Venda } from '@/lib/api';
import { copiarTexto } from '@/lib/copiar';
import { URL_NFSE_NACIONAL, camposNota, textoCompletoNota } from '@/lib/nota';
import { Card } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { Modal } from '@/components/ui/Modal';
import { useAviso } from '@/components/ui/Toast';

// Atalhos para emissão de nota do MEI e cópia dos dados da venda.
export function PainelNota({ venda, empresa }: { venda: Venda; empresa?: Empresa | null }) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const [textoManual, setTextoManual] = useState<string | null>(null);
  const avisar = useAviso();
  const campos = camposNota(venda);

  const copiar = async (chave: string, texto: string) => {
    if (await copiarTexto(texto)) {
      setCopiado(chave);
      setTimeout(() => setCopiado((c) => (c === chave ? null : c)), 1500);
    } else {
      // último recurso: mostra o texto selecionado para copiar à mão
      setTextoManual(texto);
    }
  };

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-white">
        <FileText className="size-4 text-laranja" /> Nota fiscal (MEI)
      </h2>
      <p className="mb-3 text-xs text-apagado">Abra o emissor e cole cada campo. Serviços vão na NFS-e; peças, na NF-e do seu estado.</p>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <a href={URL_NFSE_NACIONAL} target="_blank" rel="noreferrer">
          <Botao variante="secundario" className="w-full" icone={<ExternalLink className="size-4" />}>
            NFS-e · Emissor Nacional
          </Botao>
        </a>
        {empresa?.urlEmissorNfe ? (
          <a href={empresa.urlEmissorNfe} target="_blank" rel="noreferrer">
            <Botao variante="secundario" className="w-full" icone={<ExternalLink className="size-4" />}>
              NF-e de peças
            </Botao>
          </a>
        ) : (
          <Link to="/configuracoes" className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-borda px-3 py-2 text-xs text-apagado hover:text-white">
            <Settings className="size-3.5" /> Configurar link da NF-e de peças
          </Link>
        )}
      </div>

      <Botao
        className="mb-3 w-full"
        icone={copiado === 'tudo' ? <Check className="size-4" /> : <Copy className="size-4" />}
        onClick={async () => {
          await copiar('tudo', textoCompletoNota(venda, empresa));
          avisar('Dados copiados. Cole no formulário do emissor.');
        }}
      >
        {copiado === 'tudo' ? 'Copiado!' : 'Copiar dados para emissão'}
      </Botao>

      {!venda.cliente?.cpfCnpj && venda.cliente && (
        <p className="mb-3 rounded-lg bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          Cliente sem CPF/CNPJ.{' '}
          <Link to={`/cadastros/clientes?busca=${encodeURIComponent(venda.cliente.nome)}`} className="underline">
            Completar cadastro
          </Link>
        </p>
      )}

      <ul className="divide-y divide-borda/60 rounded-lg border border-borda">
        {campos.map((c) => (
          <li key={c.rotulo} className="flex items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-apagado">{c.rotulo}</p>
              <p className="truncate text-sm text-texto" title={c.valor}>
                {c.valor}
              </p>
            </div>
            <button type="button" onClick={() => copiar(c.rotulo, c.valor)} className="rounded-md p-2 text-suave hover:bg-card-hover hover:text-white" aria-label={`Copiar ${c.rotulo}`}>
              {copiado === c.rotulo ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            </button>
          </li>
        ))}
      </ul>

      <Modal aberto={textoManual != null} onFechar={() => setTextoManual(null)} titulo="Copie o texto" largura="max-w-lg">
        <p className="mb-2 text-xs text-suave">Este navegador bloqueou a cópia automática. Toque e segure no texto para copiar.</p>
        <textarea readOnly value={textoManual ?? ''} onFocus={(e) => e.target.select()} autoFocus className="h-64 w-full rounded-lg border border-borda bg-slate-900 p-3 font-mono text-xs text-texto" />
      </Modal>
    </Card>
  );
}
