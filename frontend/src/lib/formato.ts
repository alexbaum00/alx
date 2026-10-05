const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarMoeda = (centavos: number) => moeda.format(centavos / 100);

export const formatarDataHora = (iso: string | Date) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');

export const formatarQuantidade = (q: number) => q.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

// ABC1234 -> ABC-1234 (placa antiga); Mercosul fica como está
export const formatarPlaca = (placa: string) => (/^[A-Z]{3}\d{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa);
