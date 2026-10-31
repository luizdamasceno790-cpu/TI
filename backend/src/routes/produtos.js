import { Router } from 'express';
import { all, get, run } from '../db.js';
import { erro404, exigir, numero, camposEnviados } from '../errors.js';

const r = Router();
const fmt = (p) => ({ ...p, ativo: !!p.ativo });
r.get('/', (req, res) => {
  const itens = (req.query.ativo === 'true' ? all('SELECT * FROM produtos WHERE ativo=1 ORDER BY nome') : all('SELECT * FROM produtos ORDER BY nome')).map(fmt);
  res.json({ itens, total: itens.length });
});
r.post('/', (req, res) => {
  exigir(req.body, ['nome', 'preco']);
  const preco = numero(req.body.preco, 'preco', { min: 0 });
  const { id } = run('INSERT INTO produtos (nome, descricao, preco, ativo, estoquePronto) VALUES (?,?,?,?,?)', req.body.nome, req.body.descricao ?? null, preco, req.body.ativo === false ? 0 : 1, 0);
  res.status(201).json(fmt(get('SELECT * FROM produtos WHERE id=?', id)));
});
r.put('/:id', (req, res) => {
  if (!get('SELECT id FROM produtos WHERE id=?', req.params.id)) throw erro404('Produto não encontrado.');
  const campos = camposEnviados(req.body, ['nome', 'descricao', 'preco', 'ativo']);
  if ('preco' in campos) campos.preco = numero(campos.preco, 'preco', { min: 0 });
  const ks = Object.keys(campos);
  if (ks.length) run(`UPDATE produtos SET ${ks.map((k) => `${k}=?`).join(', ')} WHERE id=?`, ...ks.map((k) => campos[k]), req.params.id);
  res.json(fmt(get('SELECT * FROM produtos WHERE id=?', req.params.id)));
});
r.patch('/:id/pronta-entrega', (req, res) => {
  if (!get('SELECT id FROM produtos WHERE id=?', req.params.id)) throw erro404('Produto não encontrado.');
  const q = numero(req.body?.quantidade, 'quantidade', { min: 0, inteiro: true });
  run('UPDATE produtos SET estoquePronto=? WHERE id=?', q, req.params.id);
  res.json(fmt(get('SELECT * FROM produtos WHERE id=?', req.params.id)));
});
export default r;
