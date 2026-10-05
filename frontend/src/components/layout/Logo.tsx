// Logo oficial (frontend/public/logo-alx.png), usado no menu e nas telas de entrada.
export function Logo({ tamanho = 'size-24' }: { tamanho?: string }) {
  return <img src="/logo-alx.png" alt="ALX Serviços Automotivos" className={`${tamanho} select-none`} draggable={false} />;
}
