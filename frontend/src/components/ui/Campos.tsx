import { Children, cloneElement, forwardRef, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

// text-base no celular evita o zoom automático do iPhone ao focar o campo
export const estiloCampo =
  'w-full rounded-lg border border-borda bg-slate-900/70 px-3 text-base text-texto placeholder:text-apagado focus:border-laranja/60 focus:ring-2 focus:ring-laranja/20 focus:outline-none disabled:opacity-60 sm:text-sm';

export function Campo({ rotulo, erro, ajuda, obrigatorio, children, className = '', htmlFor }: {
  rotulo: string;
  erro?: string;
  ajuda?: string;
  obrigatorio?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  // sem htmlFor, liga o rótulo ao campo filho (Input, Select, Textarea) gerando um id
  const gerado = useId();
  const unico = Children.count(children) === 1 && isValidElement(children) ? (children as ReactElement<{ id?: string }>) : null;
  const id = htmlFor ?? unico?.props.id ?? (unico ? gerado : undefined);
  const filho = unico && !unico.props.id && !htmlFor ? cloneElement(unico, { id }) : children;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-suave">
        {rotulo}
        {obrigatorio && (
          <span className="ml-0.5 text-laranja" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {filho}
      {erro ? <p className="mt-1 text-xs text-red-400">{erro}</p> : ajuda && <p className="mt-1 text-xs text-apagado">{ajuda}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`${estiloCampo} h-11 sm:h-10 ${className}`} {...props} />;
});

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${estiloCampo} min-h-24 py-2 ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${estiloCampo} h-11 sm:h-10 ${className}`} {...props}>
      {children}
    </select>
  );
}

const moeda = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Digita como em maquininha: "2", "25", "2500" -> R$ 25,00. Valor em centavos.
export function CampoDinheiro({ valor, onChange, id, ...props }: { valor: number; onChange: (centavos: number) => void; id?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-apagado">R$</span>
      <Input
        id={id}
        inputMode="numeric"
        value={moeda.format(valor / 100)}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, '').slice(0, 11);
          onChange(Number(digitos || 0));
        }}
        onFocus={(e) => e.target.select()}
        className="pl-9 text-right tabular-nums"
        {...props}
      />
    </div>
  );
}

// Quantidade com vírgula (2,5 m de cabo). Mantém o texto digitado e devolve o número.
export function CampoQuantidade({ valor, onChange, ...props }: { valor: string; onChange: (texto: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <Input
      inputMode="decimal"
      value={valor}
      onChange={(e) => onChange(e.target.value.replace(/[^\d,.]/g, ''))}
      onFocus={(e) => e.target.select()}
      className="text-right tabular-nums"
      {...props}
    />
  );
}

export const lerNumero = (texto: string) => {
  const n = Number(texto.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
