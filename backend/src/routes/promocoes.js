import { Router } from 'express';
import { all, get, run } from '../db.js';
import { erro404, exigir, camposEnviados } from '../errors.js';
import { config } from '../services/mensagens.js';

const r = Router();
const fmt = (p) => ({ ...p, ativa: !!p.ativa });
const dataBR = (d) => (d ? d.split('-').reverse().slice(0, 2).join('/') : '');
r.get('/', (req, res) => {
  const itens = (req.query.ativa === 'true' ? all('SELECT * FROM promocoes WHERE ativa=1 ORDER BY id DESC') : all('SELECT * FROM promocoes ORDER BY id DESC')).map(fmt);
  res.json({ itens, total: itens.length });
});
r.post('/', (req, res) => {
  exigir(req.body, ['titulo']);
  const b = req.body;
  const { id } = run('INSERT INTO promocoes (titulo, descricao, condicao, inicio, fim, ativa) VALUES (?,?,?,?,?,?)', b.titulo, b.descricao ?? null, b.condicao ?? null, b.inicio || null, b.fim || null, b.ativa === false ? 0 : 1);
  res.status(201).json(fmt(get('SELECT * FROM promocoes WHERE id=?', id)));
});
r.put('/:id', (req, res) => {
  if (!get('SELECT id FROM promocoes WHERE id=?', req.params.id)) throw erro404('Promoção não encontrada.');
  const campos = camposEnviados(req.body, ['titulo', 'descricao', 'condicao', 'inicio', 'fim', 'ativa']);
  const ks = Object.keys(campos);
  if (ks.length) run(`UPDATE promocoes SET ${ks.map((k) => `${k}=?`).join(', ')} WHERE id=?`, ...ks.map((k) => campos[k] || (k === 'ativa' ? 0 : null)), req.params.id);
  res.json(fmt(get('SELECT * FROM promocoes WHERE id=?', req.params.id)));
});
r.get('/:id/texto', (req, res) => {
  const p = get('SELECT * FROM promocoes WHERE id=?', req.params.id);
  if (!p) throw erro404('Promoção não encontrada.');
  const c = config();
  const linhas = [`🍬 *${p.titulo}* | ${c.nomeNegocio || 'Doces da Lice'}`, ''];
  if (p.descricao) linhas.push(p.descricao, '');
  if (p.condicao) linhas.push(`✔ ${p.condicao}`);
  if (p.inicio || p.fim) linhas.push(`📅 ${p.inicio ? 'De ' + dataBR(p.inicio) : ''}${p.fim ? ' até ' + dataBR(p.fim) : ''}`.trim());
  linhas.push('', 'Peça pelo WhatsApp' + (c.telefoneNegocio ? `: ${c.telefoneNegocio}` : '!'));
  const texto = linhas.join('\n');
  res.json({ texto, whatsappUrl: `https://wa.me/?text=${encodeURIComponent(texto)}` });
});
export default r;
