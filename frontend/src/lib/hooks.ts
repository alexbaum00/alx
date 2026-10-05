import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

export function useDebounce<T>(valor: T, ms = 250) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

// Texto de busca sincronizado com ?busca= (links da busca global caem filtrados).
export function useBuscaNaUrl() {
  const [params, setParams] = useSearchParams();
  const [texto, setTexto] = useState(params.get('busca') ?? '');
  const termo = useDebounce(texto.trim(), 300);
  useEffect(() => {
    setParams(
      (p) => {
        if (termo) p.set('busca', termo);
        else p.delete('busca');
        return p;
      },
      { replace: true },
    );
  }, [termo, setParams]);
  return { texto, setTexto, termo };
}
