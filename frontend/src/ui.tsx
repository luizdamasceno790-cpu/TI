import { useState } from 'react';
import type { ReactNode } from 'react';
import { STATUS } from './api';

export function Selo({ status }: { status: string }) {
  const s = STATUS[status] || { rotulo: status, cor: 'cinza' };
  return <span className={`selo ${s.cor}`}>{s.rotulo}</span>;
}
export function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo"><h3>{titulo}</h3><button className="btn simples" onClick={onFechar} aria-label="Fechar">✕</button></div>
        {children}
      </div>
    </div>
  );
}
export function Campo({ rotulo, children, dica }: { rotulo: string; children: ReactNode; dica?: string }) {
  return <label className="campo"><span>{rotulo}</span>{children}{dica && <small>{dica}</small>}</label>;
}
export const Carregando = () => <p className="muted">Carregando...</p>;
export const Vazio = ({ texto }: { texto: string }) => <p className="vazio">{texto}</p>;
export const Erro = ({ texto }: { texto: string }) => (texto ? <p className="erro">{texto}</p> : null);
export function Tela({ titulo, acoes, children }: { titulo: string; acoes?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="tela-topo"><h2>{titulo}</h2><div className="acoes">{acoes}</div></div>
      {children}
    </section>
  );
}
// Mostra um texto pronto (mensagem ou divulgação) com botões de copiar e abrir no WhatsApp.
export function TextoPronto({ texto, whatsappUrl, onFechar, titulo }: { texto: string; whatsappUrl?: string; onFechar: () => void; titulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { alert('Não foi possível copiar. Selecione o texto e copie manualmente.'); }
  };
  return (
    <Modal titulo={titulo} onFechar={onFechar}>
      <pre className="texto-pronto">{texto}</pre>
      <div className="acoes">
        <button className="btn" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar texto'}</button>
        {whatsappUrl && <a className="btn principal" href={whatsappUrl} target="_blank" rel="noreferrer">Abrir no WhatsApp</a>}
      </div>
    </Modal>
  );
}
