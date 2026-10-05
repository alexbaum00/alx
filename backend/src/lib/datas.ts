export function inicioDoDia(data = new Date()) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fimDoDia(data = new Date()) {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
}
