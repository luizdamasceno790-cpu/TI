import { Router } from 'express';
import { all, get, run, tx } from '../db.js';
import { erro400, erro404, exigir, numero, camposEnviados } from '../errors.js';
import { entradaIngrediente, ajusteIngrediente } from '../services/estoque.js';
import { hojeISO, maisDias } from '../services/util.js';

export const ingredientes = Router();
const existe = (id) => { const i = get('SELECT * FROM ingredientes WHERE id=?', id); if (!i) throw erro404('Ingrediente não encontrado.'); return i; };

ingredientes.get('/', (req, res) => {
  const itens = all(`SELECT * FROM ingredientes ${req.query.abaixoDoMinimo === 'true' ? 'WHERE estoqueAtual < estoqueMinimo' : ''} ORDER BY nome`);
  res.json({ itens, total: itens.length });
});
ingredientes.post('/', (req, res) => {
  exigir(req.body, ['nome', 'unidade']);
  const { id } = run('INSERT INTO ingredientes (nome, unidade, estoqueAtual, estoqueMinimo, validadeMaisProxima) VALUES (?,?,?,?,?)',
    req.body.nome, req.body.unidade, 0, numero(req.body.estoqueMinimo ?? 0, 'estoqueMinimo', { min: 0 }), null);
  const q = Number(req.body.estoqueAtual || 0);
  if (q > 0) tx(() => entradaIngrediente(id, q, req.body.validade || null, { motivo: 'Estoque inicial' }));
  res.status(201).json(get('SELECT * FROM ingredientes WHERE id=?', id));
});
ingredientes.put('/:id', (req, res) => {
  existe(req.params.id);
  const campos = camposEnviados(req.body, ['nome', 'unidade', 'estoqueMinimo', 'validadeMaisProxima']);
  const ks = Object.keys(campos);
  if (ks.length) run(`UPDATE ingredientes SET ${ks.map((k) => `${k}=?`).join(', ')} WHERE id=?`, ...ks.map((k) => campos[k] || (k === 'estoqueMinimo' ? 0 : null)), req.params.id);
  res.json(existe(req.params.id));
});
ingredientes.get('/:id', (req, res) => {
  const ing = existe(req.params.id);
  res.json({ ...ing, movimentos: all('SELECT * FROM movimentos_estoque WHERE ingredienteId=? ORDER BY id DESC LIMIT 50', ing.id) });
});
ingredientes.get('/:id/movimentos', (req, res) => {
  existe(req.params.id);
  const itens = all('SELECT * FROM movimentos_estoque WHERE ingredienteId=? ORDER BY id DESC LIMIT 100', req.params.id);
  res.json({ itens, total: itens.length });
});
ingredientes.post('/:id/entrada', (req, res) => {
  existe(req.params.id);
  const q = numero(req.body?.quantidade, 'quantidade', { min: 0.001 });
  tx(() => entradaIngrediente(Number(req.params.id), q, req.body?.validade || null));
  res.status(201).json(existe(req.params.id));
});
ingredientes.post('/:id/ajuste', (req, res) => {
  existe(req.params.id);
  exigir(req.body, ['quantidade', 'motivo']);
  const q = numero(req.body.quantidade, 'quantidade');
  if (q === 0) throw erro400('A quantidade do ajuste não pode ser zero.');
  tx(() => ajusteIngrediente(Number(req.params.id), q, req.body.motivo));
  res.status(201).json(existe(req.params.id));
});

export const estoque = Router();
estoque.get('/alertas', (_q, res) => {
  const limite = maisDias(7);
  res.json({
    abaixoDoMinimo: all('SELECT * FROM ingredientes WHERE estoqueAtual < estoqueMinimo ORDER BY nome'),
    validadeProxima: all('SELECT * FROM ingredientes WHERE validadeMaisProxima IS NOT NULL AND validadeMaisProxima >= ? AND validadeMaisProxima <= ? ORDER BY validadeMaisProxima', hojeISO(), limite),
    vencidos: all('SELECT * FROM ingredientes WHERE validadeMaisProxima IS NOT NULL AND validadeMaisProxima < ? ORDER BY validadeMaisProxima', hojeISO()),
  });
});
