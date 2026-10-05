import { nomesFormaPagamento, type FormaPagamento } from '@/lib/api';

const formas: FormaPagamento[] = ['PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'BOLETO', 'OUTRO'];

export function FormasPagamento({ valor, onChange }: { valor: FormaPagamento | null; onChange: (f: FormaPagamento) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pagamento">
      {formas.map((f) => (
        <button
          key={f}
          type="button"
          role="radio"
          aria-checked={valor === f}
          onClick={() => onChange(f)}
          className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
            valor === f ? 'border-laranja bg-laranja-escuro/20 text-white' : 'border-borda bg-slate-800/40 text-suave hover:border-slate-600 hover:text-white'
          }`}
        >
          {nomesFormaPagamento[f]}
        </button>
      ))}
    </div>
  );
}
