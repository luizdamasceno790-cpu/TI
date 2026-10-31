import { useCallback, useEffect, useState } from 'react';

const BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  detalhes?: any;
  constructor(status: number, mensagem: string, detalhes?: any) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}
export const getToken = () => localStorage.getItem('token');
export const setToken = (t: string | null) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token'));

export async function api<T = any>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  let dados: any = null;
  try { dados = await res.json(); } catch { /* resposta sem corpo */ }
  if (res.status === 401 && !caminho.startsWith('/auth/login')) {
    setToken(null);
    window.location.href = '/login';
  }
  if (!res.ok) throw new ApiError(res.status, dados?.erro?.mensagem || 'Não foi possível concluir a operação.', dados?.erro?.detalhes);
  return dados as T;
}

// Carrega dados de uma rota GET e permite recarregar depois de uma ação.
export function useDados<T = any>(caminho: string | null) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const recarregar = useCallback(() => {
    if (!caminho) return;
    setCarregando(true);
    api<T>('GET', caminho)
      .then((d) => { setDados(d); setErro(''); })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [caminho]);
  useEffect(() => { recarregar(); }, [recarregar]);
  return { dados, erro, carregando, recarregar };
}

export const brl = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const num = (n: number) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
export const dataBR = (iso?: string | null) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR') : '-');
export const dataHoraBR = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-');
export const hoje = () => new Date().toISOString().slice(0, 10);

export const STATUS: Record<string, { rotulo: string; cor: string }> = {
  AGUARDANDO_PAGAMENTO: { rotulo: 'Aguardando pagamento', cor: 'amarelo' },
  PAGO: { rotulo: 'Pago', cor: 'azul' },
  EM_PREPARO: { rotulo: 'Em preparo', cor: 'azul' },
  CONFERIDO: { rotulo: 'Conferido', cor: 'verde' },
  SAIU_PARA_ENTREGA: { rotulo: 'Saiu para entrega', cor: 'verde' },
  ENTREGUE: { rotulo: 'Entregue', cor: 'cinza' },
  CANCELADO: { rotulo: 'Cancelado', cor: 'vermelho' },
};
export const CANAIS = [
  { v: 'WHATSAPP', r: 'WhatsApp' }, { v: 'INSTAGRAM', r: 'Instagram' }, { v: 'IFOOD', r: 'iFood' }, { v: '99FOOD', r: '99Food' },
];
