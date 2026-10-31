import { useEffect, useState } from 'react';
import { api, useDados } from '../api';
import { Campo, Carregando, Erro, Tela } from '../ui';

export default function Receitas() {
  const lista = useDados('/receitas');
  const ings = useDados('/ingredientes');
  const [produtoId, setProdutoId] = useState('');
  const [rendimento, setRendimento] = useState('1');
  const [itens, setItens] = useState<{ ingredienteId: string; quantidade: string }[]>([]);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    setMsg(null);
    if (!produtoId) return;
    api('GET', `/receitas/${produtoId}`).then((r) => {
      setRendimento(String(r.rendimento));
      setItens(r.itens.map((i: any) => ({ ingredienteId: String(i.ingredienteId), quantidade: String(i.quantidade) })));
    });
  }, [produtoId]);

  if (!lista.dados || !ings.dados) return <Carregando />;
  const mudar = (i: number, k: 'ingredienteId' | 'quantidade', v: string) => setItens(itens.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  async function salvar() {
    setMsg(null);
    try {
      await api('PUT', `/receitas/${produtoId}`, { rendimento: Number(rendimento), itens: itens.filter((i) => i.ingredienteId).map((i) => ({ ingredienteId: Number(i.ingredienteId), quantidade: Number(i.quantidade) })) });
      setMsg({ tipo: 'ok', texto: 'Receita salva.' }); lista.recarregar();
    } catch (e: any) { setMsg({ tipo: 'erro', texto: e.message }); }
  }
  const un = (id: string) => ings.dados.itens.find((i: any) => String(i.id) === id)?.unidade || '';
  return (
    <Tela titulo="Receitas (fichas técnicas)">
      <p className="muted">Informe quantas unidades a receita rende e quanto de cada ingrediente ela usa. O sistema usa isso para calcular o que falta antes de produzir.</p>
      <div className="card">
        <Campo rotulo="Produto">
          <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
            <option value="">Selecione...</option>
            {lista.dados.itens.map((p: any) => <option key={p.produtoId} value={p.produtoId}>{p.produtoNome}{p.existe ? ' ✓' : ' (sem receita)'}</option>)}
          </select>
        </Campo>
        {produtoId && <>
          <Campo rotulo="Rendimento (quantas unidades a receita rende)"><input type="number" min="0.001" step="any" value={rendimento} onChange={(e) => setRendimento(e.target.value)} /></Campo>
          <h3>Ingredientes</h3>
          {itens.map((it, i) => (
            <div className="linha-item" key={i}>
              <select value={it.ingredienteId} onChange={(e) => mudar(i, 'ingredienteId', e.target.value)}>
                <option value="">Ingrediente...</option>
                {ings.dados.itens.map((g: any) => <option key={g.id} value={g.id}>{g.nome} ({g.unidade})</option>)}
              </select>
              <input type="number" min="0.001" step="any" value={it.quantidade} onChange={(e) => mudar(i, 'quantidade', e.target.value)} placeholder={un(it.ingredienteId) || 'qtd'} />
              <button className="btn perigo pequeno" onClick={() => setItens(itens.filter((_, j) => j !== i))}>Remover</button>
            </div>
          ))}
          <div className="acoes">
            <button className="btn" onClick={() => setItens([...itens, { ingredienteId: '', quantidade: '' }])}>+ Ingrediente</button>
            <button className="btn principal" onClick={salvar}>Salvar receita</button>
          </div>
          {msg && (msg.tipo === 'ok' ? <p className="ok">{msg.texto}</p> : <Erro texto={msg.texto} />)}
        </>}
      </div>
    </Tela>
  );
}
