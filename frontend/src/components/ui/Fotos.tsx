import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Camera, ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { enviarFoto, urlImagem } from '@/lib/imagens';
import { useAviso } from './Toast';
import { Botao } from './Botao';

export interface FotoValor {
  id: string;
  legenda?: string | null;
}

function SeletorArquivo({ multiplo, onArquivos, children }: { multiplo?: boolean; onArquivos: (f: File[]) => void; children: (abrir: () => void) => React.ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      {/* sem "capture": no celular o sistema oferece câmera ou galeria */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiplo}
        className="hidden"
        onChange={(e) => {
          const arquivos = [...(e.target.files ?? [])];
          e.target.value = '';
          if (arquivos.length) onArquivos(arquivos);
        }}
      />
      {children(() => input.current?.click())}
    </>
  );
}

// Uma foto (produto, ferramenta). Valor: id da imagem ou null.
export function CampoFoto({ valor, onChange, id }: { valor: string | null; onChange: (id: string | null) => void; id?: string }) {
  const [enviando, setEnviando] = useState(false);
  const avisar = useAviso();
  const enviar = async (arquivos: File[]) => {
    setEnviando(true);
    try {
      onChange((await enviarFoto(arquivos[0], 900)).id);
    } catch (e) {
      avisar((e as Error).message, 'erro');
    } finally {
      setEnviando(false);
    }
  };
  return (
    <SeletorArquivo onArquivos={enviar}>
      {(abrir) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            id={id}
            onClick={abrir}
            className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-borda bg-slate-900/70 text-apagado hover:border-slate-500 hover:text-white"
            aria-label={valor ? 'Trocar foto' : 'Adicionar foto'}
          >
            {enviando ? <Loader2 className="size-5 animate-spin" /> : valor ? <img src={urlImagem(valor)} alt="" className="size-full object-cover" /> : <Camera className="size-6" />}
          </button>
          <div className="flex flex-col gap-1.5">
            <Botao tamanho="sm" variante="secundario" icone={<ImagePlus className="size-3.5" />} onClick={abrir} disabled={enviando}>
              {valor ? 'Trocar foto' : 'Adicionar foto'}
            </Botao>
            {valor && (
              <Botao tamanho="sm" variante="fantasma" icone={<Trash2 className="size-3.5" />} onClick={() => onChange(null)}>
                Remover
              </Botao>
            )}
          </div>
        </div>
      )}
    </SeletorArquivo>
  );
}

// Várias fotos com legenda e ordem (procedimentos).
export function CampoFotos({ valor, onChange, id }: { valor: FotoValor[]; onChange: (v: FotoValor[]) => void; id?: string }) {
  const [enviando, setEnviando] = useState(0);
  const avisar = useAviso();
  const atual = useRef(valor);
  atual.current = valor;

  const enviar = async (arquivos: File[]) => {
    setEnviando((n) => n + arquivos.length);
    // envia em sequência e acrescenta conforme chegam, sem perder fotos já na lista
    for (const arquivo of arquivos) {
      try {
        const { id } = await enviarFoto(arquivo);
        atual.current = [...atual.current, { id, legenda: '' }];
        onChange(atual.current);
      } catch (e) {
        avisar(`${arquivo.name}: ${(e as Error).message}`, 'erro');
      } finally {
        setEnviando((n) => n - 1);
      }
    }
  };
  const mover = (i: number, d: number) => {
    const nova = [...valor];
    [nova[i], nova[i + d]] = [nova[i + d], nova[i]];
    onChange(nova);
  };

  return (
    <SeletorArquivo multiplo onArquivos={enviar}>
      {(abrir) => (
        <div className="space-y-2">
          {valor.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {valor.map((f, i) => (
                <li key={f.id} className="overflow-hidden rounded-lg border border-borda bg-slate-900/70">
                  <div className="relative aspect-[4/3]">
                    <img src={urlImagem(f.id)} alt={f.legenda ?? ''} className="size-full object-cover" />
                    <div className="absolute inset-x-1 top-1 flex justify-between">
                      <span className="flex gap-1">
                        <BotaoFoto rotulo="Mover para trás" onClick={() => mover(i, -1)} desabilitado={i === 0}>
                          <ArrowLeft className="size-3.5" />
                        </BotaoFoto>
                        <BotaoFoto rotulo="Mover para frente" onClick={() => mover(i, 1)} desabilitado={i === valor.length - 1}>
                          <ArrowRight className="size-3.5" />
                        </BotaoFoto>
                      </span>
                      <BotaoFoto rotulo="Remover foto" onClick={() => onChange(valor.filter((x) => x.id !== f.id))}>
                        <X className="size-3.5" />
                      </BotaoFoto>
                    </div>
                  </div>
                  <input
                    value={f.legenda ?? ''}
                    onChange={(e) => onChange(valor.map((x) => (x.id === f.id ? { ...x, legenda: e.target.value } : x)))}
                    placeholder="Legenda (opcional)"
                    aria-label={`Legenda da foto ${i + 1}`}
                    className="w-full border-t border-borda bg-transparent px-2 py-1.5 text-base text-texto placeholder:text-apagado focus:outline-none sm:text-xs"
                  />
                </li>
              ))}
            </ul>
          )}
          <Botao id={id} variante="secundario" icone={enviando ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} onClick={abrir}>
            {enviando ? `Enviando ${enviando} foto${enviando > 1 ? 's' : ''}…` : valor.length ? 'Adicionar mais fotos' : 'Adicionar fotos'}
          </Botao>
        </div>
      )}
    </SeletorArquivo>
  );
}

function BotaoFoto({ rotulo, onClick, desabilitado, children }: { rotulo: string; onClick: () => void; desabilitado?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={desabilitado} aria-label={rotulo} title={rotulo} className="rounded-md bg-black/60 p-1 text-white hover:bg-black/80 disabled:opacity-30">
      {children}
    </button>
  );
}

// Miniaturas que ampliam ao tocar.
export function Galeria({ fotos }: { fotos: FotoValor[] }) {
  const [aberta, setAberta] = useState<number | null>(null);
  if (!fotos.length) return null;
  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {fotos.map((f, i) => (
          <li key={f.id}>
            <button type="button" onClick={() => setAberta(i)} className="group block w-full overflow-hidden rounded-lg border border-borda" aria-label={`Ampliar foto ${i + 1}${f.legenda ? `: ${f.legenda}` : ''}`}>
              <img src={urlImagem(f.id)} alt={f.legenda ?? ''} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105" />
            </button>
            {f.legenda && <p className="mt-1 truncate text-xs text-suave">{f.legenda}</p>}
          </li>
        ))}
      </ul>
      {aberta != null && <Ampliada fotos={fotos} indice={aberta} onMudar={setAberta} onFechar={() => setAberta(null)} />}
    </>
  );
}

function Ampliada({ fotos, indice, onMudar, onFechar }: { fotos: FotoValor[]; indice: number; onMudar: (i: number) => void; onFechar: () => void }) {
  const toque = useRef<number | null>(null);
  const ir = (d: number) => onMudar((indice + d + fotos.length) % fotos.length);
  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
      if (e.key === 'ArrowRight') ir(1);
      if (e.key === 'ArrowLeft') ir(-1);
    };
    document.addEventListener('keydown', teclas);
    return () => document.removeEventListener('keydown', teclas);
  });
  const foto = fotos[indice];
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      className="fixed inset-0 z-[70] flex flex-col bg-black"
      onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (toque.current == null) return;
        const dx = e.changedTouches[0].clientX - toque.current;
        if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
        toque.current = null;
      }}
    >
      <div className="flex items-center justify-between p-3 text-sm text-white/80">
        <span>
          {indice + 1} de {fotos.length}
        </span>
        <button onClick={onFechar} className="rounded-full p-2 hover:bg-white/10" aria-label="Fechar">
          <X className="size-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2" onClick={(e) => e.target === e.currentTarget && onFechar()}>
        <img src={urlImagem(foto.id)} alt={foto.legenda ?? ''} className="max-h-full max-w-full object-contain" />
        {fotos.length > 1 && (
          <>
            <button onClick={() => ir(-1)} className="absolute left-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/80" aria-label="Foto anterior">
              <ChevronLeft className="size-6" />
            </button>
            <button onClick={() => ir(1)} className="absolute right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/80" aria-label="Próxima foto">
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      {foto.legenda && <p className="p-4 text-center text-sm text-white">{foto.legenda}</p>}
    </div>,
    document.body,
  );
}
