import bcrypt from 'bcryptjs';
import { get, run } from './db.js';
import { MODELOS_PADRAO } from './services/mensagens.js';

// Garante o mínimo para o sistema funcionar: configuração, modelos de mensagem e o usuário administrador.
export function garantirPadroes() {
  if (!get('SELECT id FROM configuracao WHERE id=1')) {
    run('INSERT INTO configuracao (id, nomeNegocio, chavePix, telefoneNegocio) VALUES (1,?,?,?)', 'Doces da Lice', 'chave-pix-ficticia@exemplo.com', '');
  }
  for (const [tipo, texto] of Object.entries(MODELOS_PADRAO)) run('INSERT OR IGNORE INTO modelos_mensagem (tipo, texto) VALUES (?,?)', tipo, texto);
  const email = (process.env.ADMIN_EMAIL || 'admin@doces.com').toLowerCase();
  if (!get('SELECT id FROM usuarios WHERE email=?', email)) {
    run('INSERT INTO usuarios (nome, email, senhaHash) VALUES (?,?,?)', 'Administrador', email, bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10));
  }
}
