import { Router } from 'express';
import { all, get, run } from '../db.js';
import { erro400, erro404, exigir } from '../errors.js';
import { TIPOS, textoCardapio } from '../services/mensagens.js';

const r = Router();
r.get('/configuracao', (_q, res) => res.json(get('SELECT * FROM configuracao WHERE id=1')));
r.put('/configuracao', (req, res) => {
  const { nomeNegocio, chavePix, telefoneNegocio } = req.body || {};
  run('UPDATE configuracao SET nomeNegocio=COALESCE(?,nomeNegocio), chavePix=COALESCE(?,chavePix), telefoneNegocio=COALESCE(?,telefoneNegocio) WHERE id=1',
    nomeNegocio ?? null, chavePix ?? null, telefoneNegocio ?? null);
  res.json(get('SELECT * FROM configuracao WHERE id=1'));
});
r.get('/modelos-mensagem', (_q, res) => res.json({ itens: all('SELECT * FROM modelos_mensagem ORDER BY tipo'), variaveis: ['nome', 'numero', 'total', 'pix', 'prazo', 'itens', 'negocio'] }));
r.put('/modelos-mensagem/:tipo', (req, res) => {
  const { tipo } = req.params;
  if (!TIPOS.includes(tipo)) throw erro404('Tipo de mensagem inexistente.');
  exigir(req.body, ['texto']);
  if (typeof req.body.texto !== 'string') throw erro400('texto deve ser texto.');
  run('INSERT INTO modelos_mensagem (tipo, texto) VALUES (?,?) ON CONFLICT(tipo) DO UPDATE SET texto=excluded.texto', tipo, req.body.texto);
  res.json(get('SELECT * FROM modelos_mensagem WHERE tipo=?', tipo));
});
r.get('/cardapio/texto', (_q, res) => res.json({ texto: textoCardapio() }));
export default r;
