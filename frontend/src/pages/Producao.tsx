import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, dataBR, hoje, num, useDados } from '../api';
import { Campo, Carregando, Erro, Modal, Tela, Vazio } from '../ui';

const ROTULO: Record<string, string> = { PLANEJADA: 'Planejada', AGUARDANDO_COMPRA: 'Aguardando compra', LIBERADA: 'Liberada', CONCLUIDA: 'Concluída' };
const COR: Record<string, string> = { PLANEJADA: 'azul', AGUARDANDO_COMPRA: 'amarelo', LIBERADA: 'verde', CONCLUIDA: 'cinza' };

export default function Producao() {
  const nav = useNavigate();
  const lista = useDados('/producoes');
  const produtos = useDados('/produtos?ativo=true');
  const [novo, setNovo] = useState<any>(null);
  const [nec, setNec] = useState<{ id: number; dados: any } | null>(null);
  const [erro, setErro] = useState('');

  async function criar(e: FormEvent) {
    e.preventDefault(); setErro('');
    try {
      await api('POST', '/producoes', { data: novo.data, itens: novo.itens.filter((i: any) => i.produtoId).map((i: any) => ({ produtoId: Number(i.produtoId), quantidade: Number(i.quantidade) })) });
      setNovo(null); lista.recarregar();
    } catch (err: any) { setErro(err.message); }
  }
  async function acao(fn: () => Promise<any>) {
    setErro('');
    try { await fn(); setNec(null); lista.recarregar(); } catch (e: any) { setErro(e.message); lista.recarregar(); }
  }
  const verificar = async (id: number) => { setErro(''); try { setNec({ id, dados: await api('GET', `/producoes/${id}/necessidades`) }); } catch (e: any) { setErro(e.message); } };
  const mudarItem = (i: number, k: string, v: string) => setNovo({ ...novo, itens: novo.itens.map((x: any, j: number) => (j === i ? { ...x, [k]: v } : x)) });

  if (!lista.dados || !produtos.dados) return <Carregando />;
  return (
    <Tela titulo="Produção" acoes={<button className="btn principal" onClick={() => { setErro(''); setNovo({ data: hoje(), itens: [{ produtoId: '', quantidade: '30' }] }); }}>Planejar produção</button>}>
      <p className="muted">Planeje o que vai produzir, verifique se há ingredientes e só então libere a produção. Se faltar algo, gere a lista de compras.</p>
      <Erro texto={erro} />
      {lista.dados.itens.length === 0 && <div className="card"><Vazio texto="Nenhuma produção planejada." /></div>}
      {lista.dados.itens.map((p: any) => (
        <div className="card" key={p.id}>
          <div className="item-lista" style={{ borderBottom: 0, paddingTop: 0 }}>
            <b>Produção #{p.id} · {dataBR(p.data)}</b><span className={`selo ${COR[p.status]}`}>{ROTULO[p.status]}</span>
          </div>
          <div>{p.itens.map((i: any) => <div key={i.id}>{i.quantidade}x {i.produtoNome}</div>)}</div>
          <div className="acoes" style={{ marginTop: '.75rem' }}>
            {['PLANEJADA', 'AGUARDANDO_COMPRA'].includes(p.status) && <>
              <button className="btn" onClick={() => verificar(p.id)}>Verificar estoque</button>
              <button className="btn principal" onClick={() => { if (confirm('Liberar a produção vai dar baixa nos ingredientes. Continuar?')) acao(() => api('POST', `/producoes/${p.id}/liberar`)); }}>Liberar produção</button>
              <button className="btn" onClick={() => acao(async () => { await api('POST', '/compras/gerar-lista', { producaoId: p.id }); nav('/compras'); })}>Gerar lista de compras</button>
            </>}
            {p.status === 'LIBERADA' && <button className="btn principal" onClick={() => acao(() => api('POST', `/producoes/${p.id}/concluir`))}>Concluir (entra no estoque pronto)</button>}
          </div>
          {nec && nec.id === p.id && (
            <div style={{ marginTop: '.75rem' }}>
              {nec.dados.produtosSemReceita.length > 0 && <p className="erro">Sem receita cadastrada: {nec.dados.produtosSemReceita.join(', ')}. Cadastre em Receitas.</p>}
              <div className="tabela-rolavel"><table>
                <thead><tr><th>Ingrediente</th><th>Necessário</th><th>Disponível</th><th>Faltante</th></tr></thead>
                <tbody>{nec.dados.itens.map((i: any) => (
                  <tr key={i.ingredienteId}><td>{i.nome}</td><td>{num(i.necessario)} {i.unidade}</td><td>{num(i.disponivel)} {i.unidade}</td>
                    <td style={{ color: i.faltante > 0 ? 'var(--vermelho)' : 'var(--verde)', fontWeight: 700 }}>{i.faltante > 0 ? `${num(i.faltante)} ${i.unidade}` : 'ok'}</td></tr>
                ))}</tbody>
              </table></div>
              <p className={nec.dados.suficiente ? 'ok' : 'erro'}>{nec.dados.suficiente ? 'Estoque suficiente: pode liberar a produção.' : 'Há itens faltando.'}</p>
            </div>
          )}
        </div>
      ))}
      {novo && (
        <Modal titulo="Planejar produção" onFechar={() => setNovo(null)}>
          <form onSubmit={criar}>
            <Campo rotulo="Data"><input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} required /></Campo>
            {novo.itens.map((it: any, i: number) => (
              <div className="linha-item" key={i}>
                <select value={it.produtoId} onChange={(e) => mudarItem(i, 'produtoId', e.target.value)} required>
                  <option value="">Produto...</option>
                  {produtos.dados.itens.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <input type="number" min="1" value={it.quantidade} onChange={(e) => mudarItem(i, 'quantidade', e.target.value)} required />
                <button type="button" className="btn perigo pequeno" disabled={novo.itens.length === 1} onClick={() => setNovo({ ...novo, itens: novo.itens.filter((_: any, j: number) => j !== i) })}>Remover</button>
              </div>
            ))}
            <button type="button" className="btn" onClick={() => setNovo({ ...novo, itens: [...novo.itens, { produtoId: '', quantidade: '30' }] })}>+ Produto</button>
            <Erro texto={erro} />
            <div style={{ marginTop: '.75rem' }}><button className="btn principal">Salvar planejamento</button></div>
          </form>
        </Modal>
      )}
    </Tela>
  );
}
