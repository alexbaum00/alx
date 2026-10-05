import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, type Pagina } from '@/lib/api';
import { useBuscaNaUrl } from '@/lib/hooks';
import { Card } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { Carregando, Erro, Vazio } from '@/components/ui/Estados';
import { Paginacao } from '@/components/ui/Paginacao';
import { CabecalhoPagina, CampoBusca, tdTabela, thTabela } from '@/components/ui/Pagina';
import { FormularioCadastro } from './FormularioCadastro';
import type { ConfigCadastro, Valores } from './tipos';

// "acima": conteúdo extra entre o título e a busca (ex.: resumo das ferramentas)
export function PaginaCadastro({ config, abrirNovo, acima }: { config: ConfigCadastro; abrirNovo?: boolean; acima?: ReactNode }) {
  const { texto, setTexto, termo } = useBuscaNaUrl();
  const [pagina, setPagina] = useState(1);
  const [formulario, setFormulario] = useState<{ item: Valores | null } | null>(abrirNovo ? { item: null } : null);
  const navigate = useNavigate();
  const porPagina = config.porPagina ?? 20;

  useEffect(() => setPagina(1), [termo]);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: [config.chave, termo, pagina],
    queryFn: () => api<Pagina<Valores>>(`/${config.chave}?busca=${encodeURIComponent(termo)}&pagina=${pagina}&porPagina=${porPagina}${config.parametrosLista ? `&${config.parametrosLista}` : ''}`),
    placeholderData: keepPreviousData,
  });

  const fechar = () => {
    setFormulario(null);
    // /cadastros/clientes/novo volta para a lista ao fechar
    if (abrirNovo) navigate(`/cadastros/${config.chave}`, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <CabecalhoPagina
        titulo={config.titulo}
        subtitulo={config.subtitulo}
        acoes={
          <Botao icone={<Plus className="size-4" />} onClick={() => setFormulario({ item: null })}>
            Nov{config.feminino ? 'a' : 'o'} {config.singular}
          </Botao>
        }
      />
      {acima}
      <div className="mb-3 flex gap-2">
        <CampoBusca valor={texto} onChange={setTexto} placeholder={config.placeholderBusca} />
      </div>

      <Card>
        {isPending ? (
          <Carregando />
        ) : error ? (
          <Erro mensagem={error.message} onTentar={() => refetch()} />
        ) : data.itens.length === 0 ? (
          <Vazio texto={termo ? `Nada encontrado para “${termo}”.` : `Nenhum ${config.singular} cadastrado ainda.`} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-borda">
                  <tr>
                    {config.colunas.map((c) => (
                      <th key={c.titulo} className={`${thTabela} ${c.classe ?? ''} ${c.esconderNoCelular ? 'hidden md:table-cell' : ''}`}>
                        {c.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda/60">
                  {data.itens.map((item) => (
                    <tr key={item.id as number} onClick={() => setFormulario({ item })} className="cursor-pointer hover:bg-card-hover">
                      {config.colunas.map((c) => (
                        <td key={c.titulo} className={`${tdTabela} ${c.classe ?? ''} ${c.esconderNoCelular ? 'hidden md:table-cell' : ''}`}>
                          {c.render(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao pagina={pagina} porPagina={porPagina} total={data.total} onMudar={setPagina} />
          </>
        )}
      </Card>

      {formulario && <FormularioCadastro key={(formulario.item?.id as number) ?? 'novo'} config={config} item={formulario.item} onFechar={fechar} />}
    </div>
  );
}
