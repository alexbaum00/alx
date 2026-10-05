export function Abas<T extends string>({ opcoes, valor, onChange }: { opcoes: { valor: T; rotulo: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-borda bg-card p-1" role="tablist">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          role="tab"
          aria-selected={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${valor === o.valor ? 'bg-laranja-escuro text-white' : 'text-suave hover:text-white'}`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
