import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-xl border border-borda bg-card ${className}`}>{children}</section>;
}

export function CardHeader({ titulo, link }: { titulo: string; link?: { para: string; texto: string } }) {
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-3">
      <h2 className="text-[15px] font-semibold text-white">{titulo}</h2>
      {link && (
        <Link to={link.para} className="text-xs font-medium text-sky-400 hover:text-sky-300">
          {link.texto}
        </Link>
      )}
    </header>
  );
}
