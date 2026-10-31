import { Router } from 'express';
import { all, get, run, tx, agora } from '../db.js';
import { erro400, erro404, erro409, exigir, numero } from '../errors.js';
import { baixarIngrediente, calcularNecessidades } from '../services/estoque.js';

const r = Router();
function carregar(id) {
  const p = get('SELECT * FROM producoes WHERE id=?', id);
  if (!p) throw erro404('Produção não encontrada.');
  p.itens = all('SELECT pi.*, pr.nome AS produtoNome FROM producao_itens pi JOIN produtos pr ON pr.id=pi.produtoId WHERE pi.producaoId=? ORDER BY pi.id', id);
  return p;
}
r.get('/', (_q, res) => {
  const itens = all('SELECT * FROM producoes ORDER BY id DESC');
  for (const p of itens) p.itens = all('SELECT pi.*, pr.nome AS produtoNome FROM producao_itens pi JOIN produtos pr ON pr.id=pi.produtoId WHERE pi.producaoId=?', p.id);
  res.json({ itens, total: itens.length });
});
r.post('/', (req, res) => {
  exigir(req.body, ['data']);
  if (!Array.isArray(req.body.itens) || !req.body.itens.length) throw erro400('Inclua pelo menos um produto na produção.');
  const itens = req.body.itens.map((i) => {
    if (!get('SELECT id FROM produtos WHERE id=?', i.produtoId)) throw erro400(`Produto ${i.produtoId} não existe.`);
    return { produtoId: i.produtoId, quantidade: numero(i.quantidade, 'quantidade', { min: 1, inteiro: true }) };
  });
  const id = tx(() => {
    const { id: pid } = run('INSERT INTO producoes (data, status, criadoEm) VALUES (?,?,?)', req.body.data, 'PLANEJADA', agora());
    for (const i of itens) run('INSERT INTO producao_itens (producaoId, produtoId, quantidade) VALUES (?,?,?)', pid, i.produtoId, i.quantidade);
    return pid;
  });
  res.status(201).json(carregar(id));
});
r.get('/:id', (req, res) => res.json(carregar(req.params.id)));
r.get('/:id/necessidades', (req, res) => {
  const p = carregar(req.params.id);
  res.json(calcularNecessidades(p.itens));
});
r.post('/:id/liberar', (req, res) => {
  const p = carregar(req.params.id);
  if (!['PLANEJADA', 'AGUARDANDO_COMPRA'].includes(p.status)) throw erro409('Esta produção não pode ser liberada neste status.');
  const nec = calcularNecessidades(p.itens);
  if (nec.produtosSemReceita.length) throw erro409(`Cadastre a receita de: ${nec.produtosSemReceita.join(', ')}.`, nec);
  if (!nec.suficiente) {
    run("UPDATE producoes SET status='AGUARDANDO_COMPRA' WHERE id=?", p.id);
    throw erro409('Faltam ingredientes para liberar a produção.', { faltantes: nec.itens.filter((i) => i.faltante > 0) });
  }
  tx(() => {
    for (const i of nec.itens) baixarIngrediente(i.ingredienteId, i.necessario, { producaoId: p.id, motivo: `Produção #${p.id}` });
    run("UPDATE producoes SET status='LIBERADA' WHERE id=?", p.id);
  });
  res.json(carregar(p.id));
});
r.post('/:id/concluir', (req, res) => {
  const p = carregar(req.params.id);
  if (p.status !== 'LIBERADA') throw erro409('Só é possível concluir uma produção liberada.');
  tx(() => {
    for (const i of p.itens) run('UPDATE produtos SET estoquePronto = estoquePronto + ? WHERE id=?', i.quantidade, i.produtoId);
    run("UPDATE producoes SET status='CONCLUIDA' WHERE id=?", p.id);
  });
  res.json(carregar(p.id));
});
export default r;
