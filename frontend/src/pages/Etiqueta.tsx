import { Link, useParams } from 'react-router-dom';
import { useDados } from '../api';
import { Carregando, Erro } from '../ui';

export default function Etiqueta() {
  const { id } = useParams();
  const { dados: e, erro } = useDados(`/pedidos/${id}/etiqueta`);
  if (erro) return <Erro texto={erro} />;
  if (!e) return <Carregando />;
  return (
    <div>
      <div className="acoes no-print">
        <Link className="btn" to={`/pedidos/${id}`}>Voltar ao pedido</Link>
        <button className="btn principal" onClick={() => window.print()}>Imprimir etiqueta</button>
      </div>
      <div className="etiqueta">
        <div className="grande">#{e.numero}</div>
        <div className="nome">{e.nomeCliente}</div>
        {e.itens.map((i: any, k: number) => <div key={k}>{i.quantidade}x {i.nome}{i.observacao ? ` (${i.observacao})` : ''}</div>)}
        <div className="muted" style={{ marginTop: '.4rem' }}>🍬 Doces da Lice</div>
      </div>
    </div>
  );
}
