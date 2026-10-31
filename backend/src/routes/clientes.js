import { Router } from 'express';
import { all, get, run, agora } from '../db.js';
import { erro404, exigir, camposEnviados } from '../errors.js';
import { normalizarTelefone } from '../services/util.js';

const r = Router();
r.get('/', (req, res) => {
  const b = req.query.busca ? `%${req.query.busca}%` : null;
  const itens = b ? all('SELECT * FROM clientes WHERE nome LIKE ? OR telefone LIKE ? ORDER BY nome', b, b) : all('SELECT * FROM clientes ORDER BY nome');
  res.json({ itens, total: itens.length });
});
r.post('/', (req, res) => {
  exigir(req.body, ['nome', 'telefone']);
  const { nome, telefone, endereco, observacoes } = req.body;
  const { id } = run('INSERT INTO clientes (nome, telefone, endereco, observacoes, criadoEm) VALUES (?,?,?,?,?)', nome, normalizarTelefone(telefone), endereco ?? null, observacoes ?? null, agora());
  res.status(201).json(get('SELECT * FROM clientes WHERE id=?', id));
});
r.get('/:id', (req, res) => {
  const c = get('SELECT * FROM clientes WHERE id=?', req.params.id);
  if (!c) throw erro404('Cliente não encontrado.');
  res.json(c);
});
r.put('/:id', (req, res) => {
  if (!get('SELECT id FROM clientes WHERE id=?', req.params.id)) throw erro404('Cliente não encontrado.');
  const campos = camposEnviados(req.body, ['nome', 'telefone', 'endereco', 'observacoes']);
  if (campos.telefone) campos.telefone = normalizarTelefone(campos.telefone);
  const ks = Object.keys(campos);
  if (ks.length) run(`UPDATE clientes SET ${ks.map((k) => `${k}=?`).join(', ')} WHERE id=?`, ...ks.map((k) => campos[k]), req.params.id);
  res.json(get('SELECT * FROM clientes WHERE id=?', req.params.id));
});
export default r;
