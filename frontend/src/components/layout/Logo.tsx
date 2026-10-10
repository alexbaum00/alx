// Logo oficial (frontend/public/logo-alx.png), usado no menu e nas telas de entrada.
// A versão escura (logo-alx-escuro.webp, fundo preto e aro laranja) vai sobre fundos escuros.
export function Logo({ tamanho = 'size-24', escuro = false, className = '' }: { tamanho?: string; escuro?: boolean; className?: string }) {
  return <img src={escuro ? '/logo-alx-escuro.webp' : '/logo-alx.png'} alt="ALX Serviços Automotivos" className={`${tamanho} select-none ${className}`} draggable={false} />;
}
