import { Router } from 'express';
import { all, get, run, tx, agora } from '../db.js';
import { erro400, erro404, erro409, numero } from '../errors.js';
import { calcularNecessidades, entradaIngrediente } from '../services/estoque.js';
import { arredonda } from '../services/util.js';

const r = Router();
function carregar(id) {
  const c = get('SELECT * FROM compras WHERE id=?', id);
  if (!c) throw erro404('Compra não encontrada.');
  c.itens = all('SELECT ci.*, i.nome, i.unidade FROM compra_itens ci JOIN ingredientes i ON i.id=ci.ingredienteId WHERE ci.compraId=? ORDER BY i.nome', id);
  return c;
}
r.get('/', (_q, res) => {
  const itens = all('SELECT * FROM compras ORDER BY id DESC');
  for (const c of itens) c.totalItens = get('SELECT COUNT(*) AS n FROM compra_itens WHERE compraId=?', c.id).n;
  res.json({ itens, total: itens.length });
});
r.post('/gerar-lista', (req, res) => {
  const sugerido = new Map();
  if (req.body?.producaoId) {
    const prod = get('SELECT id FROM producoes WHERE id=?', req.body.producaoId);
    if (!prod) throw erro400('Produção não encontrada.');
    const itens = all('SELECT produtoId, quantidade FROM producao_itens WHERE producaoId=?', prod.id);
    for (const i of calcularNecessidades(itens).itens) if (i.faltante > 0) sugerido.set(i.ingredienteId, i.faltante);
  }
  for (const ing of all('SELECT * FROM ingredientes WHERE estoqueAtual < estoqueMinimo')) {
    const reposicao = arredonda(ing.estoqueMinimo * 2 - ing.estoqueAtual);
    sugerido.set(ing.id, Math.max(sugerido.get(ing.id) || 0, reposicao));
  }
  if (!sugerido.size) throw erro409('Não há nada a comprar: nenhum ingrediente está abaixo do mínimo e a produção não tem faltas.');
  const id = tx(() => {
    const { id: cid } = run("INSERT INTO compras (status, criadoEm) VALUES ('LISTA', ?)", agora());
    for (const [ingId, q] of sugerido) run('INSERT INTO compra_itens (compraId, ingredienteId, quantidadePedida) VALUES (?,?,?)', cid, ingId, q);
    return cid;
  });
  res.status(201).json(carregar(id));
});
r.get('/:id', (req, res) => res.json(carregar(req.params.id)));
r.patch('/:id', (req, res) => {
  const c = carregar(req.params.id);
  const b = req.body || {};
  if (b.status && !['LISTA', 'COTANDO', 'COMPRADA'].includes(b.status)) throw erro400('Status permitido aqui: LISTA, COTANDO ou COMPRADA.');
  if (c.status === 'RECEBIDA') throw erro409('Compra já recebida.');
  tx(() => {
    run('UPDATE compras SET status=COALESCE(?,status), fornecedor=COALESCE(?,fornecedor), observacoes=COALESCE(?,observacoes) WHERE id=?', b.status ?? null, b.fornecedor ?? null, b.observacoes ?? null, c.id);
    for (const it of b.itens || []) {
      run('UPDATE compra_itens SET quantidadePedida=COALESCE(?,quantidadePedida), precoUnitario=COALESCE(?,precoUnitario) WHERE id=? AND compraId=?', it.quantidadePedida ?? null, it.precoUnitario ?? null, it.id, c.id);
    }
  });
  res.json(carregar(c.id));
});
r.post('/:id/receber', (req, res) => {
  const c = carregar(req.params.id);
  if (c.status === 'RECEBIDA') throw erro409('Esta compra já foi recebida.');
  const recebidos = Array.isArray(req.body?.itens) ? req.body.itens : [];
  if (!recebidos.length) throw erro400('Informe os itens recebidos.');
  tx(() => {
    for (const rec of recebidos) {
      const item = c.itens.find((i) => i.ingredienteId === rec.ingredienteId);
      if (!item) throw erro400(`Ingrediente ${rec.ingredienteId} não faz parte desta compra.`);
      const q = numero(rec.quantidadeRecebida, 'quantidadeRecebida', { min: 0 });
      if (q > 0) entradaIngrediente(item.ingredienteId, q, rec.validade || null, { compraId: c.id, motivo: `Compra #${c.id}` });
      run('UPDATE compra_itens SET quantidadeRecebida = quantidadeRecebida + ?, precoUnitario=COALESCE(?,precoUnitario) WHERE id=?', q, rec.precoUnitario ?? null, item.id);
    }
    const pendente = all('SELECT 1 FROM compra_itens WHERE compraId=? AND quantidadeRecebida < quantidadePedida', c.id).length > 0;
    run('UPDATE compras SET status=? WHERE id=?', pendente ? 'INCOMPLETA' : 'RECEBIDA', c.id);
  });
  res.json(carregar(c.id));
});
export default r;
