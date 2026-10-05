import { Zap } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex flex-col items-center leading-none select-none">
      <div className="flex items-center text-[34px] font-black tracking-tight italic">
        <span className="text-white">AL</span>
        <span className="relative text-laranja">
          X
          <Zap className="absolute -top-1 -right-3 size-4 fill-laranja text-laranja" aria-hidden />
        </span>
      </div>
      <span className="mt-1 text-[11px] font-semibold tracking-[0.25em] text-suave">AUTO ELÉTRICA</span>
    </div>
  );
}
