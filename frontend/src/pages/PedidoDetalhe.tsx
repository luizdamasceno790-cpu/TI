import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, brl, CANAIS, dataHoraBR, STATUS, useDados } from '../api';
import { Campo, Carregando, Erro, Selo, Tela, TextoPronto } from '../ui';

const PROXIMO: Record<string, { para: string; rotulo: string }> = {
  PAGO: { para: 'EM_PREPARO', rotulo: 'Iniciar preparo' },
  EM_PREPARO: { para: 'CONFERIDO', rotulo: 'Marcar como conferido' },
  CONFERIDO: { para: 'SAIU_PARA_ENTREGA', rotulo: 'Entregador retirou o pedido' },
  SAIU_PARA_ENTREGA: { para: 'ENTREGUE', rotulo: 'Marcar como entregue' },
};
const MENSAGENS = [
  ['VALOR_E_PIX', 'Enviar valor e Pix'], ['PEDIDO_CONFIRMADO', 'Pedido confirmado'], ['SAIU_PARA_ENTREGA', 'Pedido pronto para o entregador'],
  ['RECEBIMENTO', 'Confirmar recebimento'], ['PAGAMENTO_NAO_CONFIRMADO', 'Pagamento não confirmado'],
];
const CHECKS: [string, string][] = [['itensOk', 'Itens conferidos'], ['saboresOk', 'Sabores conferidos'], ['quantidadeOk', 'Quantidades conferidas'], ['nomeClienteOk', 'Nome do cliente conferido']];

export default function PedidoDetalhe() {
  const { id } = useParams();
  const { dados: p, erro, recarregar } = useDados(`/pedidos/${id}`);
  const cfg = useDados('/configuracao');
  const [ck, setCk] = useState<any>(null);
  const [prazo, setPrazo] = useState('');
  const [msg, setMsg] = useState<any>(null);
  const [erroAcao, setErroAcao] = useState('');
  useEffect(() => { if (p) { setCk(p.checklist); setPrazo(p.prazoPrevisto || ''); } }, [p]);

  if (erro) return <Erro texto={erro} />;
  if (!p || !ck) return <Carregando />;
  const ativo = !['ENTREGUE', 'CANCELADO'].includes(p.status);
  const podeCancelar = ['AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_PREPARO', 'CONFERIDO'].includes(p.status);
  const checklistSalvoCompleto = p.checklist.itensOk && p.checklist.saboresOk && p.checklist.quantidadeOk && p.checklist.nomeClienteOk;

  async function executar(fn: () => Promise<any>) {
    setErroAcao('');
    try { await fn(); recarregar(); } catch (e: any) { setErroAcao(e.message); }
  }
  const mudar = (para: string, motivo?: string) => executar(() => api('PATCH', `/pedidos/${p.id}/status`, { para, motivo }));
  async function verMensagem(tipo: string) {
    setErroAcao('');
    try { setMsg(await api('GET', `/pedidos/${p.id}/mensagens/${tipo}`)); } catch (e: any) { setErroAcao(e.message); }
  }
  const prox = PROXIMO[p.status];
  return (
    <Tela titulo={`Pedido #${p.numero}`} acoes={<><Selo status={p.status} />{p.status !== 'AGUARDANDO_PAGAMENTO' && p.status !== 'CANCELADO' && <Link className="btn" to={`/pedidos/${p.id}/etiqueta`}>Etiqueta</Link>}</>}>
      <Erro texto={erroAcao} />
      <div className="card">
        <h3>{p.cliente.nome}</h3>
        <p className="muted" style={{ margin: 0 }}>{p.cliente.telefone} · {p.cliente.endereco || 'sem endereço'}</p>
        <p className="muted" style={{ margin: '.25rem 0 0' }}>Canal: {CANAIS.find((c) => c.v === p.canal)?.r} · Criado em {dataHoraBR(p.criadoEm)}{p.promocao ? ` · Promoção: ${p.promocao.titulo}` : ''}</p>
        {p.status === 'CANCELADO' && <p className="erro">Cancelado: {p.motivoCancelamento}</p>}
      </div>
      <div className="card">
        <h3>Itens</h3>
        <div className="tabela-rolavel"><table>
          <thead><tr><th>Produto</th><th>Qtd</th><th>Unitário</th><th>Subtotal</th></tr></thead>
          <tbody>
            {p.itens.map((i: any) => (
              <tr key={i.id}><td>{i.produtoNome}{i.observacao && <div className="muted">{i.observacao}</div>}{i.origem && <div className="muted">{i.origem === 'PRONTA_ENTREGA' ? 'Pronta entrega' : 'Montar a partir da base'}</div>}</td><td>{i.quantidade}</td><td>{brl(i.precoUnitario)}</td><td>{brl(i.quantidade * i.precoUnitario)}</td></tr>
            ))}
          </tbody>
        </table></div>
        <h3 style={{ marginTop: '.75rem' }}>Total: {brl(p.total)}</h3>
        {ativo && (
          <div className="linha" style={{ alignItems: 'end' }}>
            <Campo rotulo="Prazo previsto"><input value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="ex.: sábado, 15h" /></Campo>
            <div><button className="btn" style={{ marginBottom: '.75rem' }} onClick={() => executar(() => api('PATCH', `/pedidos/${p.id}`, { prazoPrevisto: prazo }))}>Salvar prazo</button></div>
          </div>
        )}
      </div>

      {p.status === 'AGUARDANDO_PAGAMENTO' && (
        <div className="card">
          <h3>Pagamento</h3>
          <p>Valor: <b>{brl(p.total)}</b> · Chave Pix: <b>{cfg.dados?.chavePix || 'não configurada'}</b></p>
          <p className="muted">Confira o recebimento no aplicativo do banco antes de confirmar.</p>
          <div className="acoes">
            <button className="btn principal" onClick={() => executar(() => api('POST', `/pedidos/${p.id}/pagamento/confirmar`))}>Pagamento confirmado</button>
            <button className="btn perigo" onClick={() => { if (confirm('O pedido será cancelado. Continuar?')) executar(() => api('POST', `/pedidos/${p.id}/pagamento/recusar`)); }}>Não confirmado (cancelar)</button>
          </div>
        </div>
      )}

      {['EM_PREPARO', 'CONFERIDO'].includes(p.status) && (
        <div className="card">
          <h3>Checklist de conferência</h3>
          {CHECKS.map(([k, r]) => (
            <label key={k} style={{ display: 'flex', gap: '.5rem', padding: '.3rem 0' }}>
              <input type="checkbox" checked={!!ck[k]} onChange={(e) => setCk({ ...ck, [k]: e.target.checked })} /> {r}
            </label>
          ))}
          <button className="btn" onClick={() => executar(() => api('PUT', `/pedidos/${p.id}/checklist`, ck))}>Salvar checklist</button>
        </div>
      )}

      {ativo && (
        <div className="card">
          <h3>Próximo passo</h3>
          <div className="acoes">
            {prox && <button className="btn principal" disabled={p.status === 'EM_PREPARO' && !checklistSalvoCompleto} onClick={() => mudar(prox.para)}>{prox.rotulo}</button>}
            {podeCancelar && <button className="btn perigo" onClick={() => { const m = prompt('Motivo do cancelamento:'); if (m) mudar('CANCELADO', m); }}>Cancelar pedido</button>}
          </div>
          {p.status === 'EM_PREPARO' && !checklistSalvoCompleto && <p className="muted">Marque os quatro itens e salve o checklist para liberar a conferência.</p>}
          {p.status === 'CONFERIDO' && <p className="muted">O entregador é chamado pelo próprio cliente. Quando ele retirar o pedido, marque aqui e avise o cliente.</p>}
        </div>
      )}

      <div className="card">
        <h3>Mensagens para o cliente (WhatsApp)</h3>
        <p className="muted">O sistema monta a mensagem e abre o WhatsApp; você só aperta enviar.</p>
        <div className="acoes">{MENSAGENS.map(([t, r]) => <button key={t} className="btn pequeno" onClick={() => verMensagem(t)}>{r}</button>)}</div>
      </div>

      <div className="card">
        <h3>Histórico</h3>
        <ul className="timeline">{p.historico.map((h: any) => <li key={h.id}><b>{STATUS[h.para]?.rotulo || h.para}</b> · {dataHoraBR(h.em)}{h.motivo ? ` · ${h.motivo}` : ''}</li>)}</ul>
      </div>
      {msg && <TextoPronto titulo="Mensagem pronta" texto={msg.texto} whatsappUrl={msg.whatsappUrl} onFechar={() => setMsg(null)} />}
    </Tela>
  );
}
