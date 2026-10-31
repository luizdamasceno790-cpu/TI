import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { brl, CANAIS, dataHoraBR, STATUS, useDados } from '../api';
import { Carregando, Erro, Selo, Tela, Vazio } from '../ui';

export default function Pedidos() {
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState('');
  const status = params.get('status') || '';
  const q = new URLSearchParams();
  if (status) q.set('status', status);
  if (busca) q.set('busca', busca);
  const { dados, erro, carregando } = useDados(`/pedidos?${q.toString()}`);
  return (
    <Tela titulo="Pedidos" acoes={<Link className="btn principal" to="/pedidos/novo">Novo pedido</Link>}>
      <div className="card linha">
        <select value={status} onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.rotulo}</option>)}
        </select>
        <input placeholder="Buscar por cliente ou número" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <Erro texto={erro} />
      <div className="card">
        {carregando && <Carregando />}
        {dados && dados.itens.length === 0 && <Vazio texto="Nenhum pedido encontrado." />}
        {dados?.itens.map((p: any) => (
          <div className="item-lista" key={p.id}>
            <div>
              <Link className="titulo" to={`/pedidos/${p.id}`}>#{p.numero} · {p.clienteNome}</Link>
              <div className="muted" style={{ fontSize: '.85rem' }}>{dataHoraBR(p.criadoEm)} · {CANAIS.find((c) => c.v === p.canal)?.r}</div>
            </div>
            <div style={{ textAlign: 'right' }}><div>{brl(p.total)}</div><Selo status={p.status} /></div>
          </div>
        ))}
      </div>
    </Tela>
  );
}
