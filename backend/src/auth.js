import jwt from 'jsonwebtoken';
import { erro401 } from './errors.js';

const SEGREDO = process.env.JWT_SECRET || 'segredo-de-desenvolvimento-troque-no-env';
export const gerarToken = (u) => jwt.sign({ id: u.id, email: u.email }, SEGREDO, { expiresIn: '8h' });
export function exigirLogin(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) throw erro401();
  try { req.usuario = jwt.verify(token, SEGREDO); next(); } catch { throw erro401('Sessão expirada. Faça login novamente.'); }
}
