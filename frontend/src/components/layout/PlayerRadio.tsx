import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Pause, Play, Radio as IconeRadio, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { api, type Radio } from '@/lib/api';

export const CHAVE_RADIOS = ['radios'];

// preferências deste aparelho (rádio escolhida e volume)
const CHAVE_ESCOLHIDA = 'alx.radio';
const CHAVE_VOLUME = 'alx.radio.volume';

function ler(chave: string) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // sem armazenamento (aba anônima etc.): só não lembra
  }
}

type Estado = 'parado' | 'carregando' | 'tocando' | 'erro';

// Player do topo. Some quando não há rádio cadastrada (cadastro em Configurações).
export function PlayerRadio() {
  const { data: radios = [] } = useQuery({ queryKey: CHAVE_RADIOS, queryFn: () => api<Radio[]>('/radios'), staleTime: Infinity });
  const audio = useRef<HTMLAudioElement | null>(null);
  const [atualId, setAtualId] = useState<number | null>(() => Number(ler(CHAVE_ESCOLHIDA)) || null);
  const [estado, setEstado] = useState<Estado>('parado');
  const [volume, setVolume] = useState(() => {
    const v = Number(ler(CHAVE_VOLUME));
    return Number.isFinite(v) && ler(CHAVE_VOLUME) !== null ? Math.min(1, Math.max(0, v)) : 0.6;
  });
  const [mudo, setMudo] = useState(false);
  const autoplayFeito = useRef(false);

  const atual = radios.find((r) => r.id === atualId) ?? radios[0];

  // um único <audio> para o sistema todo; para de tocar ao sair (logout desmonta o topo)
  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    const ao = (e: Estado) => () => setEstado(e);
    a.addEventListener('playing', ao('tocando'));
    a.addEventListener('waiting', ao('carregando'));
    a.addEventListener('error', () => {
      if (a.getAttribute('src')) setEstado('erro');
    });
    audio.current = a;
    return () => {
      a.pause();
      a.removeAttribute('src');
      a.load();
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    if (audio.current) audio.current.volume = mudo ? 0 : volume;
  }, [volume, mudo]);

  const tocar = (radio: Radio) => {
    const a = audio.current;
    if (!a) return Promise.resolve();
    setAtualId(radio.id);
    gravar(CHAVE_ESCOLHIDA, String(radio.id));
    // ao vivo: recarrega o link para pegar a transmissão do momento, não o trecho guardado
    a.src = radio.url;
    setEstado('carregando');
    return a.play().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        setEstado('parado');
        throw e;
      }
      setEstado('erro');
    });
  };

  const parar = () => {
    const a = audio.current;
    if (!a) return;
    a.pause();
    // solta a conexão; senão o navegador continua baixando a transmissão
    a.removeAttribute('src');
    a.load();
    setEstado('parado');
  };

  // "Tocar quando abrir o programa": o navegador só deixa tocar som depois de um clique ou tecla,
  // então, se ele bloquear, começa no primeiro clique ou tecla em qualquer lugar da tela.
  useEffect(() => {
    if (autoplayFeito.current || !radios.length) return;
    autoplayFeito.current = true;
    const inicial = radios.find((r) => r.tocarAoAbrir);
    if (!inicial) return;
    const aoInteragir = () => {
      remover();
      if (audio.current?.paused) void tocar(inicial).catch(() => undefined);
    };
    const remover = () => {
      document.removeEventListener('pointerdown', aoInteragir, true);
      document.removeEventListener('keydown', aoInteragir, true);
    };
    tocar(inicial).catch(() => {
      document.addEventListener('pointerdown', aoInteragir, true);
      document.addEventListener('keydown', aoInteragir, true);
    });
    return remover;
  }, [radios]);

  if (!atual) return null;

  const pular = (passo: number) => {
    const i = radios.findIndex((r) => r.id === atual.id);
    const proxima = radios[(i + passo + radios.length) % radios.length];
    if (estado === 'tocando' || estado === 'carregando') void tocar(proxima).catch(() => undefined);
    else {
      setAtualId(proxima.id);
      gravar(CHAVE_ESCOLHIDA, String(proxima.id));
      setEstado('parado');
    }
  };

  const ligado = estado === 'tocando' || estado === 'carregando';
  const botao = 'rounded-full p-1.5 text-suave transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40';

  return (
    <div className="flex h-10 min-w-0 shrink-0 items-center gap-2 rounded-xl border border-borda bg-slate-950/30 pr-3 pl-3">
      <IconeRadio className={`size-5 shrink-0 ${ligado ? 'text-laranja' : 'text-apagado'}`} />
      <div className="w-32 min-w-0 leading-tight xl:w-40">
        <p className="truncate text-xs font-semibold text-white uppercase" title={atual.nome}>
          {atual.nome}
        </p>
        <p className={`truncate text-[11px] ${estado === 'erro' ? 'text-red-400' : 'text-laranja'}`} title={atual.descricao ?? ''}>
          {estado === 'erro' ? 'Não foi possível tocar' : (atual.descricao ?? (estado === 'carregando' ? 'Conectando…' : 'Rádio'))}
        </p>
      </div>

      <div className="flex items-center">
        <button type="button" onClick={() => pular(-1)} disabled={radios.length < 2} className={botao} aria-label="Rádio anterior" title="Rádio anterior">
          <SkipBack className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => (ligado ? parar() : void tocar(atual).catch(() => undefined))}
          className="mx-0.5 flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-laranja-escuro"
          aria-label={ligado ? 'Parar' : 'Tocar'}
          title={ligado ? 'Parar' : 'Tocar'}
        >
          {estado === 'carregando' ? <Loader2 className="size-4 animate-spin" /> : ligado ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
        </button>
        <button type="button" onClick={() => pular(1)} disabled={radios.length < 2} className={botao} aria-label="Próxima rádio" title="Próxima rádio">
          <SkipForward className="size-4" />
        </button>
      </div>

      <AoVivo ativo={estado === 'tocando'} />

      <div className="hidden items-center gap-1.5 xl:flex">
        <button type="button" onClick={() => setMudo((m) => !m)} className={botao} aria-label={mudo ? 'Ligar som' : 'Tirar som'} title={mudo ? 'Ligar som' : 'Tirar som'}>
          {mudo || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={mudo ? 0 : volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            setMudo(false);
            gravar(CHAVE_VOLUME, String(v));
          }}
          className="h-1 w-24 cursor-pointer accent-laranja"
          aria-label="Volume"
        />
      </div>
    </div>
  );
}

function AoVivo({ ativo }: { ativo: boolean }) {
  return (
    <div className={`hidden flex-col items-center sm:flex ${ativo ? 'text-laranja' : 'text-apagado'}`} title={ativo ? 'Ao vivo' : 'Parado'}>
      <span className="flex h-3 items-end gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-0.5 origin-bottom rounded-full bg-current ${ativo ? 'animate-equalizador' : ''}`}
            style={{ height: `${[40, 80, 55, 100, 65][i]}%`, animationDelay: `${i * 0.13}s` }}
          />
        ))}
      </span>
      <span className="mt-0.5 text-[9px] leading-none font-medium">Ao Vivo</span>
    </div>
  );
}
