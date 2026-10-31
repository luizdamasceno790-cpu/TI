import { useState } from 'react';
import { api, dataHoraBR, num, useDados } from '../api';
import { Campo, Carregando, Erro, Modal, Tela, Vazio } from '../ui';

const COR: Record<string, string> = { LISTA: 'azul', COTANDO: 'amarelo', COMPRADA: 'azul', INCOMPLETA: 'vermelho', RECEBIDA: 'verde' };
const ROTULO: Record<string, string> = { LISTA: 'Lista', COTANDO: 'Cotando', COMPRADA: 'Comprada', INCOMPLETA: 'Incompleta', RECEBIDA: 'Recebida' };

export default function Compras() {
  const { dados, erro, carregando, recarregar } = useDados('/compras');
  const [aberta, setAberta] = useState<any>(null);
  const [modo, setModo] = useState<'editar' | 'receber'>('editar');
  const [erroAcao, setErroAcao] = useState('');

  async function abrir(id: number, m: 'editar' | 'receber') {
    setErroAcao('');
    const c = await api('GET', `/compras/${id}`);
    c.itens = c.itens.map((i: any) => ({ ...i, receber: String(Math.max(0, i.quantidadePedida - i.quantidadeRecebida)), validade: '', preco: i.precoUnitario ?? '' }));
    setModo(m); setAberta(c);
  }
  async function gerar() {
    setErroAcao('');
    try { const c = await api('POST', '/compras/gerar-lista', {}); recarregar(); abrir(c.id, 'editar'); } catch (e: any) { setErroAcao(e.message); }
  }
  async function salvar() {
    setErroAcao('');
    try {
      await api('PATCH', `/compras/${aberta.id}`, { status: aberta.statusNovo || undefined, fornecedor: aberta.fornecedor || undefined, observacoes: aberta.observacoes || undefined,
        itens: aberta.itens.map((i: any) => ({ id: i.id, quantidadePedida: Number(i.quantidadePedida), precoUnitario: i.preco === '' ? undefined : Number(i.preco) })) });
      setAberta(null); recarregar();
    } catch (e: any) { setErroAcao(e.message); }
  }
  async function receber() {
    setErroAcao('');
    try {
      await api('POST', `/compras/${aberta.id}/receber`, { itens: aberta.itens.map((i: any) => ({ ingredienteId: i.ingredienteId, quantidadeRecebida: Number(i.receber || 0), validade: i.validade || undefined, precoUnitario: i.preco === '' ? undefined : Number(i.preco) })) });
      setAberta(null); recarregar();
    } catch (e: any) { setErroAcao(e.message); }
  }
  const mudarItem = (id: number, k: string, v: string) => setAberta({ ...aberta, itens: aberta.itens.map((i: any) => (i.id === id ? { ...i, [k]: v } : i)) });

  return (
    <Tela titulo="Compras" acoes={<button className="btn principal" onClick={gerar}>Gerar lista (estoque baixo)</button>}>
      <p className="muted">A lista é gerada com os ingredientes abaixo do mínimo. Para os que faltam em uma produção, use "Gerar lista de compras" na tela de Produção.</p>
      <Erro texto={erro || erroAcao} />
      <div className="card">
        {carregando && !dados && <Carregando />}
        {dados && dados.itens.length === 0 && <Vazio texto="Nenhuma compra registrada." />}
        {dados?.itens.map((c: any) => (
          <div className="item-lista" key={c.id}>
            <div><b>Compra #{c.id}</b> <span className={`selo ${COR[c.status]}`}>{ROTULO[c.status]}</span>
              <div className="muted" style={{ fontSize: '.88rem' }}>{c.totalItens} itens · {dataHoraBR(c.criadoEm)}{c.fornecedor ? ` · ${c.fornecedor}` : ''}</div></div>
            <div className="acoes">
              {c.status !== 'RECEBIDA' && <button className="btn pequeno" onClick={() => abrir(c.id, 'editar')}>Cotar / editar</button>}
              {c.status !== 'RECEBIDA' && <button className="btn pequeno principal" onClick={() => abrir(c.id, 'receber')}>Receber</button>}
              {c.status === 'RECEBIDA' && <button className="btn pequeno" onClick={() => abrir(c.id, 'editar')}>Ver</button>}
            </div>
          </div>
        ))}
      </div>
      {aberta && (
        <Modal titulo={`Compra #${aberta.id} · ${modo === 'receber' ? 'Recebimento' : 'Lista'}`} onFechar={() => setAberta(null)}>
          {modo === 'editar' && aberta.status !== 'RECEBIDA' && <>
            <Campo rotulo="Fornecedor / onde comprar"><input value={aberta.fornecedor || ''} onChange={(e) => setAberta({ ...aberta, fornecedor: e.target.value })} /></Campo>
            <Campo rotulo="Situação"><select value={aberta.statusNovo || aberta.status} onChange={(e) => setAberta({ ...aberta, statusNovo: e.target.value })}>
              <option value="LISTA">Lista</option><option value="COTANDO">Cotando preços</option><option value="COMPRADA">Comprada</option>
              {aberta.status === 'INCOMPLETA' && <option value="INCOMPLETA" disabled>Incompleta</option>}
            </select></Campo>
          </>}
          <div className="tabela-rolavel"><table>
            <thead><tr><th>Ingrediente</th><th>Pedido</th>{modo === 'receber' ? <><th>Recebido agora</th><th>Validade</th></> : <th>Preço unit.</th>}</tr></thead>
            <tbody>{aberta.itens.map((i: any) => (
              <tr key={i.id}>
                <td>{i.nome}<div className="muted">já recebido: {num(i.quantidadeRecebida)} {i.unidade}</div></td>
                <td>{modo === 'editar' && aberta.status !== 'RECEBIDA' ? <input type="number" step="any" min="0" value={i.quantidadePedida} onChange={(e) => mudarItem(i.id, 'quantidadePedida', e.target.value)} style={{ width: 90 }} /> : `${num(i.quantidadePedida)} ${i.unidade}`}</td>
                {modo === 'receber' ? <>
                  <td><input type="number" step="any" min="0" value={i.receber} onChange={(e) => mudarItem(i.id, 'receber', e.target.value)} style={{ width: 90 }} /></td>
                  <td><input type="date" value={i.validade} onChange={(e) => mudarItem(i.id, 'validade', e.target.value)} /></td>
                </> : <td>{aberta.status !== 'RECEBIDA' ? <input type="number" step="0.01" min="0" value={i.preco} onChange={(e) => mudarItem(i.id, 'preco', e.target.value)} style={{ width: 90 }} /> : i.precoUnitario ?? '-'}</td>}
              </tr>
            ))}</tbody>
          </table></div>
          <Erro texto={erroAcao} />
          <div className="acoes" style={{ marginTop: '.75rem' }}>
            {modo === 'editar' && aberta.status !== 'RECEBIDA' && <button className="btn principal" onClick={salvar}>Salvar</button>}
            {modo === 'receber' && <button className="btn principal" onClick={receber}>Confirmar recebimento</button>}
          </div>
          {modo === 'receber' && <p className="muted">Se algum item chegar em quantidade menor que a pedida, a compra fica "Incompleta" e você pode receber o restante depois.</p>}
        </Modal>
      )}
    </Tela>
  );
}
