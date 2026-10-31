import { Router } from 'express';
import { all, get, run, tx } from '../db.js';
import { erro400, erro404, numero } from '../errors.js';

const r = Router();
function carregar(produtoId) {
  const prod = get('SELECT id, nome FROM produtos WHERE id=?', produtoId);
  if (!prod) throw erro404('Produto não encontrado.');
  const rec = get('SELECT * FROM receitas WHERE produtoId=?', produtoId);
  const itens = rec ? all(`SELECT ri.ingredienteId, i.nome, i.unidade, ri.quantidade FROM receita_itens ri JOIN ingredientes i ON i.id=ri.ingredienteId WHERE ri.receitaId=? ORDER BY i.nome`, rec.id) : [];
  return { produtoId: prod.id, produtoNome: prod.nome, existe: !!rec, rendimento: rec ? rec.rendimento : 1, itens };
}
r.get('/', (_q, res) => {
  const itens = all('SELECT p.id AS produtoId, p.nome AS produtoNome, (SELECT COUNT(*) FROM receitas r WHERE r.produtoId=p.id) AS existe FROM produtos p ORDER BY p.nome').map((x) => ({ ...x, existe: !!x.existe }));
  res.json({ itens, total: itens.length });
});
r.get('/:produtoId', (req, res) => res.json(carregar(req.params.produtoId)));
r.put('/:produtoId', (req, res) => {
  carregar(req.params.produtoId);
  const rendimento = numero(req.body?.rendimento, 'rendimento', { min: 0.001 });
  const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
  const ids = new Set();
  for (const it of itens) {
    numero(it.quantidade, 'quantidade', { min: 0.001 });
    if (ids.has(it.ingredienteId)) throw erro400('Há ingredientes repetidos na receita.');
    ids.add(it.ingredienteId);
    if (!get('SELECT id FROM ingredientes WHERE id=?', it.ingredienteId)) throw erro400(`Ingrediente ${it.ingredienteId} não existe.`);
  }
  tx(() => {
    const atual = get('SELECT id FROM receitas WHERE produtoId=?', req.params.produtoId);
    let rid;
    if (atual) { rid = atual.id; run('UPDATE receitas SET rendimento=? WHERE id=?', rendimento, rid); run('DELETE FROM receita_itens WHERE receitaId=?', rid); }
    else rid = run('INSERT INTO receitas (produtoId, rendimento) VALUES (?,?)', req.params.produtoId, rendimento).id;
    for (const it of itens) run('INSERT INTO receita_itens (receitaId, ingredienteId, quantidade) VALUES (?,?,?)', rid, it.ingredienteId, Number(it.quantidade));
  });
  res.json(carregar(req.params.produtoId));
});
export default r;
