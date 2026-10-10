// Fundo escuro com manchas claras e desfocadas (cinza-azulado), atrás da tela de entrada e do sistema.
// Fica fixo na janela; os cartões por cima são translúcidos e deixam ele aparecer.
const manchas = [
  'top-[-10%] left-[-8%] size-[34vmax] bg-[#4c6a84]/40',
  'top-[40%] left-[-10%] size-[28vmax] bg-[#6b7782]/30',
  'bottom-[-12%] left-[12%] size-[26vmax] bg-[#56616b]/30',
  'top-[-12%] left-[38%] size-[26vmax] bg-[#3e5a72]/35',
  'top-[30%] left-[28%] size-[24vmax] bg-[#5f7385]/22',
  'bottom-[-10%] left-[48%] size-[28vmax] bg-[#4a5966]/30',
  'top-[-12%] right-[-6%] size-[32vmax] bg-[#7d8892]/30',
  'top-[38%] right-[-6%] size-[30vmax] bg-[#69737c]/30',
  'top-[22%] right-[24%] size-[20vmax] bg-[#55697a]/22',
];

export function FundoDesfocado() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0d1626] print:hidden">
      <div className="absolute inset-0 transform-gpu blur-[90px]">
        {manchas.map((m) => (
          <div key={m} className={`absolute rounded-full ${m}`} />
        ))}
      </div>
    </div>
  );
}
