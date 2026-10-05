import type { ReactNode } from 'react';
import { PackageOpen, Wrench } from 'lucide-react';
import type { ClienteCompleto, ItemDocumento, VeiculoCompleto } from '@/lib/api';
import { formatarMoeda, formatarPlaca, formatarQuantidade } from '@/lib/formato';
import { Card } from '@/components/ui/Card';
import { formatarDocumento, linkWhatsApp } from '@/pages/cadastros/configs';
import { enderecoCompleto } from '@/lib/nota';

export function ItensDocumento({ itens, desconto, produtos, servicos, total }: { itens: ItemDocumento[]; desconto: number; produtos: number; servicos: number; total: number }) {
  return (
    <Card>
      <ul className="divide-y divide-borda/60">
        {itens.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-4 py-3">
            {i.tipo === 'PRODUTO' ? <PackageOpen className="size-4 shrink-0 text-sky-400" /> : <Wrench className="size-4 shrink-0 text-laranja" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-texto">{i.descricao}</p>
              <p className="text-xs text-apagado">
                {formatarQuantidade(i.quantidade)} × {formatarMoeda(i.valorUnitarioCentavos)}
              </p>
            </div>
            <span className="text-sm font-medium whitespace-nowrap text-white">{formatarMoeda(i.valorTotalCentavos)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1 border-t border-borda px-4 py-3 text-sm">
        <Linha rotulo="Peças" valor={formatarMoeda(produtos)} />
        <Linha rotulo="Serviços" valor={formatarMoeda(servicos)} />
        {desconto > 0 && <Linha rotulo="Desconto" valor={`− ${formatarMoeda(desconto)}`} />}
        <div className="flex justify-between pt-2">
          <span className="font-semibold text-white">Total</span>
          <span className="text-xl font-bold text-white">{formatarMoeda(total)}</span>
        </div>
      </div>
    </Card>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between text-suave">
      <span>{rotulo}</span>
      <span>{valor}</span>
    </div>
  );
}

export function DadosCliente({ cliente, veiculo, km, extra }: { cliente: ClienteCompleto | null; veiculo: VeiculoCompleto | null; km?: number | null; extra?: ReactNode }) {
  const wa = linkWhatsApp(cliente?.telefone);
  return (
    <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
      <div>
        <p className="text-xs text-apagado">Cliente</p>
        {cliente ? (
          <>
            <p className="font-medium text-white">{cliente.nome}</p>
            <p className="text-sm text-suave">{[formatarDocumento(cliente.cpfCnpj), cliente.telefone].filter(Boolean).join(' · ')}</p>
            {enderecoCompleto(cliente) && <p className="text-xs text-apagado">{enderecoCompleto(cliente)}</p>}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-emerald-400 hover:underline">
                Abrir WhatsApp
              </a>
            )}
          </>
        ) : (
          (extra ?? <p className="text-sm text-suave">Venda de balcão</p>)
        )}
      </div>
      <div>
        <p className="text-xs text-apagado">Veículo</p>
        {veiculo ? (
          <>
            <p className="font-mono font-medium text-white">{formatarPlaca(veiculo.placa)}</p>
            <p className="text-sm text-suave">{[veiculo.marca, veiculo.modelo, veiculo.ano].filter(Boolean).join(' ')}</p>
            {km != null && <p className="text-xs text-apagado">KM na entrada: {km.toLocaleString('pt-BR')}</p>}
          </>
        ) : (
          <p className="text-sm text-suave">—</p>
        )}
      </div>
    </Card>
  );
}
