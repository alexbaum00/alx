// Fundo escuro com manchas desfocadas (azul e cinza), atrás da tela de entrada e do sistema.
// Fica fixo na janela; os cartões por cima são translúcidos e deixam ele aparecer.
export function FundoDesfocado() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a1020] print:hidden">
      <div className="absolute inset-0 transform-gpu blur-3xl">
        <div className="absolute -top-1/4 left-[5%] size-[60vmax] rounded-full bg-[#2a4a63]/45" />
        <div className="absolute top-[30%] -left-[15%] size-[45vmax] rounded-full bg-[#3b4652]/45" />
        <div className="absolute -top-[10%] -right-[10%] size-[50vmax] rounded-full bg-[#4a5866]/40" />
        <div className="absolute -right-[5%] -bottom-1/4 size-[50vmax] rounded-full bg-[#3f4248]/45" />
        <div className="absolute -bottom-1/3 left-1/4 size-[45vmax] rounded-full bg-[#060a1a]/80" />
        <div className="absolute top-[35%] left-[35%] size-[30vmax] rounded-full bg-[#0b1226]/70" />
      </div>
    </div>
  );
}
