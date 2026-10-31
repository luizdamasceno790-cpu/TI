import { Link } from 'react-router-dom';
import { brl, dataBR, STATUS, useDados } from '../api';
import { Carregando, Erro, Tela } from '../ui';

export default function Painel() {
  const r = useDados('/dashboard/resumo');
  const p = useDados('/dashboard/promocoes');
  if (r.carregando) return <Carregando />;
  if (!r.dados) return <Erro texto={r.erro} />;
  const d = r.dados;
  const abertos = ['AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_PREPARO', 'CONFERIDO', 'SAIU_PARA_ENTREGA'];
  return (
    <Tela titulo="Painel" acoes={<><Link className="btn principal" to="/pedidos/novo">Novo pedido</Link><Link className="btn" to="/producao">Planejar produção</Link></>}>
      <div className="grade">
        <div className="num"><b>{d.pedidosHoje}</b><span>pedidos hoje</span></div>
        <div className="num"><b>{d.entreguesHoje}</b><span>entregues hoje</span></div>
        <div className="num"><b>{d.aguardandoPagamento}</b><span>aguardando pagamento</span></div>
        <div className="num"><b>{d.ingredientesAbaixoDoMinimo.length}</b><span>ingredientes abaixo do mínimo</span></div>
      </div>
      <div className="card">
        <h3>Pedidos em andamento</h3>
        <div className="grade" style={{ marginBottom: 0 }}>
          {abertos.map((s) => <Link key={s} to={`/pedidos?status=${s}`} style={{ textDecoration: 'none' }}><div className="num"><b>{d.pedidosPorStatus[s]}</b><span>{STATUS[s].rotulo}</span></div></Link>)}
        </div>
      </div>
      <div className="card">
        <h3>Alertas de estoque</h3>
        {d.ingredientesAbaixoDoMinimo.length === 0 && d.validadesProximas.length === 0 && <p className="muted">Nenhum alerta no momento.</p>}
        {d.ingredientesAbaixoDoMinimo.map((i: any) => <div key={'m' + i.id} className="item-lista"><span>⚠ <b>{i.nome}</b> abaixo do mínimo</span><span className="muted">{i.estoqueAtual} / {i.estoqueMinimo} {i.unidade}</span></div>)}
        {d.validadesProximas.map((i: any) => <div key={'v' + i.id} className="item-lista"><span>📅 <b>{i.nome}</b> com validade próxima</span><span className="muted">{dataBR(i.validadeMaisProxima)}</span></div>)}
        <p style={{ marginBottom: 0 }}><Link to="/estoque">Ver estoque</Link></p>
      </div>
      <div className="card">
        <h3>Pedidos por promoção</h3>
        {p.dados && (
          <div className="tabela-rolavel"><table>
            <thead><tr><th>Promoção</th><th>Pedidos</th><th>Valor</th></tr></thead>
            <tbody>
              {p.dados.itens.map((x: any) => <tr key={x.promocaoId}><td>{x.titulo}</td><td>{x.pedidos}</td><td>{brl(x.total)}</td></tr>)}
              <tr><td className="muted">Sem promoção</td><td>{p.dados.semPromocao.pedidos}</td><td>{brl(p.dados.semPromocao.total)}</td></tr>
            </tbody>
          </table></div>
        )}
      </div>
    </Tela>
  );
}
