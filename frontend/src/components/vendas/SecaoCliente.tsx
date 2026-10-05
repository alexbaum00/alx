import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Relacao } from '@/components/cadastro/tipos';
import { FormularioCadastro } from '@/components/cadastro/FormularioCadastro';
import { Seletor } from '@/components/ui/Seletor';
import { Campo } from '@/components/ui/Campos';
import { buscarClientes, buscarVeiculos } from '@/lib/buscas';
import { formatarPlaca } from '@/lib/formato';
import { configClientes, configVeiculos } from '@/pages/cadastros/configs';

// Escolha de cliente e veículo, com cadastro rápido sem sair da venda.
export function SecaoCliente({ cliente, veiculo, onCliente, onVeiculo, rotuloSemCliente = 'Venda de balcão (sem cliente)' }: {
  cliente: Relacao | null;
  veiculo: Relacao | null;
  onCliente: (c: Relacao | null) => void;
  onVeiculo: (v: Relacao | null) => void;
  rotuloSemCliente?: string;
}) {
  const [novo, setNovo] = useState<'cliente' | 'veiculo' | null>(null);

  const configVeiculoDoCliente = cliente
    ? { ...configVeiculos, campos: configVeiculos.campos.map((c) => (c.nome === 'clienteId' ? { ...c, padrao: cliente } : c)) }
    : configVeiculos;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo rotulo="Cliente" ajuda={cliente ? undefined : rotuloSemCliente}>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Seletor<Relacao>
              chave="cliente-venda"
              buscar={buscarClientes}
              valor={cliente}
              onChange={(c) => {
                onCliente(c);
                if (c?.id !== cliente?.id) onVeiculo(null);
              }}
              rotuloItem={(c) => c.rotulo}
              detalheItem={(c) => c.detalhe}
              placeholder="Nome, telefone ou placa…"
            />
          </div>
          <BotaoNovo titulo="Cadastrar cliente" onClick={() => setNovo('cliente')} />
        </div>
      </Campo>
      <Campo rotulo="Veículo" ajuda={cliente ? undefined : 'Escolha o cliente primeiro'}>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Seletor<Relacao>
              chave={`veiculo-venda-${cliente?.id ?? 0}`}
              buscar={(t) => buscarVeiculos(t, cliente?.id)}
              valor={veiculo}
              onChange={onVeiculo}
              rotuloItem={(v) => v.rotulo}
              placeholder={cliente ? 'Placa ou modelo…' : '—'}
              desabilitado={!cliente}
            />
          </div>
          <BotaoNovo titulo="Cadastrar veículo" onClick={() => setNovo('veiculo')} desabilitado={!cliente} />
        </div>
      </Campo>

      {novo === 'cliente' && (
        <FormularioCadastro
          config={configClientes}
          item={null}
          onFechar={() => setNovo(null)}
          onSalvo={(c) => {
            onCliente({ id: c.id as number, rotulo: c.nome as string });
            onVeiculo(null);
          }}
        />
      )}
      {novo === 'veiculo' && (
        <FormularioCadastro
          config={configVeiculoDoCliente}
          item={null}
          onFechar={() => setNovo(null)}
          onSalvo={(v) => onVeiculo({ id: v.id as number, rotulo: `${formatarPlaca(v.placa as string)} · ${[v.marca, v.modelo].filter(Boolean).join(' ')}` })}
        />
      )}
    </div>
  );
}

function BotaoNovo({ titulo, onClick, desabilitado }: { titulo: string; onClick: () => void; desabilitado?: boolean }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={desabilitado}
      onClick={onClick}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-borda bg-slate-800/60 text-suave hover:bg-card-hover hover:text-white disabled:opacity-40 sm:size-10"
    >
      <Plus className="size-4" />
    </button>
  );
}
