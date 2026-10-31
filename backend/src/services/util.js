export function normalizarTelefone(t) {
  const d = String(t ?? '').replace(/\D/g, '');
  return d.length === 10 || d.length === 11 ? '55' + d : d;
}
export const dinheiro = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const arredonda = (n) => Math.round(Number(n) * 1000) / 1000;
export const hojeISO = () => new Date().toISOString().slice(0, 10);
export const maisDias = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
