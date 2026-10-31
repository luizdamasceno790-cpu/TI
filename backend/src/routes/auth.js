import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get } from '../db.js';
import { gerarToken, exigirLogin } from '../auth.js';
import { erro401, exigir } from '../errors.js';

export const publico = Router();
publico.post('/login', (req, res) => {
  exigir(req.body, ['email', 'senha']);
  const u = get('SELECT * FROM usuarios WHERE email=?', String(req.body.email).trim().toLowerCase());
  if (!u || !bcrypt.compareSync(String(req.body.senha), u.senhaHash)) throw erro401('E-mail ou senha incorretos.');
  res.json({ token: gerarToken(u), usuario: { id: u.id, nome: u.nome, email: u.email } });
});
export const privado = Router();
privado.get('/me', exigirLogin, (req, res) => {
  const u = get('SELECT id, nome, email FROM usuarios WHERE id=?', req.usuario.id);
  if (!u) throw erro401();
  res.json(u);
});
